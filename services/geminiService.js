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
            console.log(`Audio tahlili boshlandi: Mime: ${mimeType}, Hajm: ${audioBuffer.length} bytes`);
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
                1. Phonetic Accuracy.
                2. Oral Fluency (fillers "uh", "um", pauses "...").
                3. Prosody.
                4. Word Accuracy.
                5. Grammar/Lexical.
                6. Intelligibility.

                IMPORTANT: Return ONLY a valid JSON object.
                {
                    "overallScore": number,
                    "accuracyScore": number,
                    "fluencyScore": number,
                    "prosodyScore": number,
                    "completenessScore": number,
                    "wordAccuracy": number,
                    "ipa": "IPA",
                    "stressExample": "STRESS",
                    "transcription": "Verbatim",
                    "englishLevel": "CEFR",
                    "detailedFeedback": {
                        "strengths": ["UZB"],
                        "areasForImprovement": ["UZB"],
                        "phoneticAnalysis": {
                            "mispronouncedWords": [{"word": "str", "errorType": "type", "phoneticError": "UZB", "correctPronunciation": "IPA", "improvementTip": "UZB"}],
                            "prosodyFeedback": "UZB"
                        },
                        "actionPlan": ["steps UZB"]
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
                                text: prompt.replace(/\s+/g, ' ').trim() // Promptni siqish
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${audioBuffer.toString("base64")}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1, 
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://github.com/ravon-ai',
                    'X-Title': 'Ravon AI Bot',
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 sekund kutish (audio tahlili uzoqroq vaqt olishi mumkin)
            });

            if (!response.data || !response.data.choices || response.data.choices.length === 0) {
                console.error("OpenRouter javobi bo'sh:", JSON.stringify(response.data));
                throw new Error("OpenRouterdan bo'sh javob keldi.");
            }

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
            if (error.response) {
                console.error("OpenRouter API Xatosi (Response):", JSON.stringify(error.response.data));
            } else {
                console.error("OpenRouter API Xatosi (Message):", error.message);
            }
            
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
