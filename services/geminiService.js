const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");

class GeminiService {
    constructor() {
        if (!config.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY topilmadi!");
            return;
        }
        this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        this.modelName = config.GEMINI_MODEL || 'gemini-2.0-flash';
        this.initializeModel();
    }

    async initializeModel() {
        try {
            // JSON formatini qo'llab-quvvatlash uchun v1beta majburiy
            const apiVersion = 'v1beta';
            
            this.model = this.genAI.getGenerativeModel({ 
                model: this.modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                }
            }, { apiVersion });
            
            console.log(`Gemini model tanlandi: ${this.modelName} (API: ${apiVersion})`);
        } catch (error) {
            console.warn(`Modelni yuklashda xatolik (${this.modelName}):`, error.message);
            await this.findWorkingModel();
        }
    }

    async findWorkingModel(excludeModels = []) {
        const versions = ['v1beta', 'v1'];
        let models = [];
        let usedVersion = 'v1beta';

        for (const v of versions) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${config.GEMINI_API_KEY}`);
                const data = await response.json();
                if (data.models && data.models.length > 0) {
                    models = data.models;
                    usedVersion = v;
                    console.log(`Gemini API ${v} orqali modellar olindi.`);
                    break;
                }
            } catch (e) {
                console.warn(`Gemini API ${v} xatosi:`, e.message);
            }
        }

        try {
            const workingModels = models
                    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace("models/", ""));

                console.log("Mavjud modellar:", workingModels.join(", "));

                // Afzal ko'rilgan modellar tartibi (yangilangan)
                const preferred = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-8b-latest',
                    'gemini-1.5-flash-8b',
                    'gemini-2.0-flash-exp',
                    'gemini-2.0-flash',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-pro'
                ];

            let found = false;
            for (const p of preferred) {
                if (workingModels.includes(p) && !excludeModels.includes(p)) {
                    this.modelName = p;
                    found = true;
                    break;
                }
            }

            if (!found && workingModels.length > 0) {
                // Exclude qilinmagan birinchi modelni olish
                const available = workingModels.filter(m => !excludeModels.includes(m));
                this.modelName = available.length > 0 ? available[0] : workingModels[0];
            }

            const apiVersion = 'v1beta';

            this.model = this.genAI.getGenerativeModel({ 
                model: this.modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                }
            }, { apiVersion });
            console.log(`Modelga almashtirildi: ${this.modelName} (API: ${apiVersion})`);
        } catch (e) {
            console.error("Ishlaydigan modelni topib bo'lmadi:", e.message);
        }
    }

    async analyzeAudio(audioBuffer, mimeType, type = 'general', targetText = null, retryCount = 0, failedModels = []) {
        try {
            if (!this.model) {
                await this.initializeModel();
            }
            
            // Hozirgi modelni failed ro'yxatiga qo'shish uchun tayyorlaymiz
            if (!failedModels.includes(this.modelName)) {
                failedModels.push(this.modelName);
            }

            let contextInstruction = "";
            if (type === 'test' && targetText) {
                contextInstruction = `The user is specifically trying to pronounce the word: "${targetText}". Focus your analysis on this word.`;
            } else if (type === 'compare' && targetText) {
                contextInstruction = `The user is reading the following text: "${targetText}". Compare the audio strictly to this text.`;
            }

            const prompt = `
                You are a world-class English Language Proficiency Assessor, mimicking the high-precision analysis of Azure Speech Services and Cambridge English Examiners.
                ${contextInstruction}
                Your task is to provide a rigorous, professional, and extremely detailed phonetic and linguistic assessment of the provided audio recording.
                
                IMPORTANT: Provide all explanations, feedback, strengths, and action plans in UZBEK language. The transcription and phonetic errors should remain in English/IPA, but the descriptions and tips must be in UZBEK.

                Evaluate the speech with absolute precision across these dimensions:
                1. **Phonetic Accuracy (0-100)**: Detect mispronunciations at the phoneme level. Analyze vowel length, consonant articulation, and diphthong purity.
                2. **Oral Fluency (0-100)**: Analyze speech rate (words per minute), hesitation patterns, and the placement of pauses. **CRITICAL: Include fillers like "uh", "um", "mmm" and indicate long pauses with "..." in the transcription.**
                3. **Prosody & Intonation (0-100)**: Evaluate word-level stress, sentence-level rhythm (stress-timed nature of English), and pitch contours.
                4. **Word Accuracy (0-100)**: Calculate the percentage of correctly pronounced words relative to the total words spoken.
                5. **Grammar & Lexical Complexity (0-100)**: Assess the sophistication of vocabulary and grammatical accuracy.
                6. **Intelligibility Score (0-100)**: Overall clarity for a native listener.

                Format your response as a JSON object:
                {
                    "overallScore": number,
                    "accuracyScore": number,
                    "fluencyScore": number,
                    "prosodyScore": number,
                    "completenessScore": number,
                    "wordAccuracy": number,
                    "ipa": "IPA transcription of the target word/text (for sentences, provide word-by-word IPA like: Word [ipa] Word [ipa])",
                    "stressExample": "The target text with stressed words in CAPITAL letters (e.g., 'I HAVE two friends')",
                    "transcription": "Verbatim transcription including fillers (uh, um) and pauses (...)",
                    "englishLevel": "CEFR Level (e.g., B2 High)",
                    "detailedFeedback": {
                        "strengths": ["string in Uzbek"],
                        "areasForImprovement": ["string in Uzbek"],
                        "phoneticAnalysis": {
                            "mispronouncedWords": [
                                {
                                    "word": "string",
                                    "errorType": "Vowel/Consonant/Stress",
                                    "phoneticError": "Specific description in UZBEK (e.g., 'uzun /i:/ o'rniga qisqa /ɪ/ ishlatildi')",
                                    "correctPronunciation": "IPA guide",
                                    "improvementTip": "Practical advice in UZBEK to fix this specific word"
                                }
                            ],
                            "prosodyFeedback": "Detailed notes on rhythm, intonation, stress patterns, and FLUENCY (pauses, repetitions) in UZBEK"
                        },
                        "actionPlan": ["3-5 high-impact steps in UZBEK to reach the next CEFR level"]
                    }
                }

                Strictly focus on objective data. If the audio quality is poor, mention it in feedback but still attempt the analysis.
                For each mispronounced word, be extremely specific about which phoneme was incorrect.
                Your tone must be academic, authoritative, yet encouraging.
            `;

            const result = await this.model.generateContent([
                {
                    inlineData: {
                        data: audioBuffer.toString("base64"),
                        mimeType: mimeType
                    }
                },
                prompt
            ]);

            const response = await result.response;
            const text = response.text();
            
            try {
                return JSON.parse(text);
            } catch (e) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error("Gemini returned invalid JSON format.");
            }
        } catch (error) {
            // Handle 429 (Quota) and 503 (Overloaded) errors
            const isRetryable = error.status === 404 || error.status === 429 || error.status === 503 || 
                               error.message?.includes('404') || error.message?.includes('429') || error.message?.includes('503') ||
                               error.message?.includes('quota') || error.message?.includes('overloaded') || error.message?.includes('not found');

            if (isRetryable && retryCount < 5) {
                let errorType = 'Xatolik';
                if (error.status === 404 || error.message?.includes('404') || error.message?.includes('not found')) {
                    errorType = 'Model topilmadi';
                } else if (error.status === 503 || error.message?.includes('overloaded')) {
                    errorType = 'Server yuklangan';
                } else {
                    errorType = 'Quota to\'lgan';
                }
                console.warn(`${errorType} (${this.modelName}). Boshqa modelga o'tilmoqda... Urinish: ${retryCount + 1}`);
                
                // Muvaffaqiyatsiz bo'lgan modelni exclude qilamiz
                await this.findWorkingModel(failedModels);
                
                // Modellarni almashtirish orasida biroz kutish (1-2 soniya)
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                return this.analyzeAudio(audioBuffer, mimeType, type, targetText, retryCount + 1, failedModels);
            }
            
            console.error("Gemini API Error Details:", error.message);
            throw error;
        }
    }
}

module.exports = new GeminiService();
