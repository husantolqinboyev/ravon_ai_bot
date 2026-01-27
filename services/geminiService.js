const axios = require('axios');
const config = require("../config");

class GeminiService {
    constructor() {
        if (!config.OPENROUTER_API_KEY) {
            console.error("OPENROUTER_API_KEY topilmadi!");
            return;
        }
        this.apiKey = config.OPENROUTER_API_KEY;
        this.modelName = config.OPENROUTER_MODEL || 'google/gemini-flash-1.5';
    }

    async analyzeAudio(audioBuffer, mimeType, type = 'general', targetText = null, retryCount = 0) {
        try {
            let contextInstruction = "";
            if (type === 'test' && targetText) {
                contextInstruction = `Focus analysis on word: "${targetText}".`;
            } else if (type === 'compare' && targetText) {
                contextInstruction = `Compare audio to text: "${targetText}".`;
            }

            const prompt = `
                Analyze English audio (Azure/Cambridge style). 
                ${contextInstruction}
                Feedback in UZBEK. Transcription/IPA in English.

                Metrics (0-100):
                1. Phonetic Accuracy (phonemes, vowel length).
                2. Oral Fluency (rate, hesitations, fillers "uh", "um", pauses "...").
                3. Prosody (stress, rhythm, intonation).
                4. Word Accuracy.
                5. Grammar/Lexical complexity.
                6. Intelligibility.

                Return JSON:
                {
                    "overallScore": number,
                    "accuracyScore": number,
                    "fluencyScore": number,
                    "prosodyScore": number,
                    "completenessScore": number,
                    "wordAccuracy": number,
                    "ipa": "Word [ipa]",
                    "stressExample": "STRESSED words in CAPS",
                    "transcription": "Verbatim with fillers/pauses",
                    "englishLevel": "CEFR",
                    "detailedFeedback": {
                        "strengths": ["UZB"],
                        "areasForImprovement": ["UZB"],
                        "phoneticAnalysis": {
                            "mispronouncedWords": [{"word": "str", "errorType": "type", "phoneticError": "UZB", "correctPronunciation": "IPA", "improvementTip": "UZB"}],
                            "prosodyFeedback": "UZB"
                        },
                        "actionPlan": ["3-5 steps UZB"]
                    }
                }
            `;

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: this.modelName,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt.replace(/\s+/g, ' ').trim() // Promptni siqish (token tejash)
                            },
                            {
                                type: "input_audio",
                                input_audio: {
                                    data: audioBuffer.toString("base64"),
                                    format: mimeType.includes('wav') ? 'wav' : (mimeType.includes('mpeg') ? 'mp3' : 'ogg')
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3, // Barqarorlik uchun
                max_tokens: 1500  // Limitni cheklash (keraksiz uzun javoblarni oldini olish)
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://github.com/ravon-ai',
                    'X-Title': 'Ravon AI Bot',
                    'Content-Type': 'application/json'
                }
            });

            const text = response.data.choices[0].message.content;
            const usage = response.data.usage;
            
            let assessmentData;
            try {
                assessmentData = JSON.parse(text);
            } catch (e) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    assessmentData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("OpenRouter returned invalid JSON format.");
                }
            }

            return {
                ...assessmentData,
                _usage: usage,
                _model: this.modelName
            };
        } catch (error) {
            console.error("OpenRouter API Error Details:", error.response?.data || error.message);
            
            if (retryCount < 2) {
                console.log(`Retrying... (${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.analyzeAudio(audioBuffer, mimeType, type, targetText, retryCount + 1);
            }
            
            throw error;
        }
    }
}

module.exports = new GeminiService();
