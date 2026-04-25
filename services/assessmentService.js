const geminiService = require('./geminiService');
const database = require('../database');

class AssessmentService {
    async processAudio(user, audioBuffer, audioDuration, mimeType, type = 'general', targetText = null) {
        try {
            // Check limits
            console.log('AssessmentService.processAudio - User:', JSON.stringify({
                id: user?.id,
                telegram_id: user?.telegram_id,
                username: user?.username
            }));

            // Check limits (using telegram_id because DB expects bigint)
            const canProceed = await database.checkLimit(user.telegram_id);
            if (!canProceed) {
                throw new Error('LIMIT_EXCEEDED');
            }

            // Step 1: Analyze audio with Gemini
            const assessment = await geminiService.analyzeAudio(audioBuffer, mimeType, type, targetText);

            // Log API usage if available
            if (assessment._usage) {
                try {
                    // OpenRouter usage structure can be different
                    const promptTokens = assessment._usage.prompt_tokens || assessment._usage.promptTokenCount || 0;
                    const completionTokens = assessment._usage.completion_tokens || assessment._usage.candidatesTokenCount || 0;
                    const totalTokens = assessment._usage.total_tokens || assessment._usage.totalTokenCount || 0;

                    await database.logApiUsage(
                        assessment._model,
                        promptTokens,
                        completionTokens,
                        totalTokens,
                        `assessment_${type}`
                    );
                } catch (logError) {
                    console.error('Failed to log API usage:', logError.message);
                }
            }

            // Step 2: Save assessment to database
            // Soft-fail: Supabase 502/503 bo'lsa ham AI natijasi foydalanuvchiga qaytariladi
            try {
                const userId = await database.saveUser(user);
                await database.saveAssessment(userId, {
                    audioDuration,
                    type,
                    target_text: targetText,
                    ...assessment,
                    feedback: JSON.stringify(assessment.detailedFeedback)
                });
                // Faqat muvaffaqiyatli saqlanganda limitni oshiramiz
                await database.incrementUsage(user.telegram_id);
            } catch (dbError) {
                const cleanMsg = this._cleanErrorMessage(dbError);
                console.error('DB save error (soft-fail):', cleanMsg);
                // Davom etamiz — foydalanuvchi AI natijasini baribir ko'rsin
            }

            // Add targetText to assessment for formatting
            assessment.targetText = targetText;

            // Step 3: Format response
            const formattedResponse = this.formatAssessmentResponse(assessment, type);
            return {
                success: true,
                text: formattedResponse,
                data: {
                    ...assessment,
                    targetText: targetText
                }
            };

        } catch (error) {
            if (error.message === 'LIMIT_EXCEEDED') {
                return { success: false, error: 'LIMIT_EXCEEDED' };
            }
            const cleanMsg = this._cleanErrorMessage(error);
            console.error('Assessment processing error:', cleanMsg);
            return {
                success: false,
                error: cleanMsg
            };
        }
    }

    /**
     * Supabase 502/503 HTML sahifasini log uchun tozalaydi
     */
    _cleanErrorMessage(error) {
        const msg = error?.message || String(error);
        if (msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('Bad gateway') || msg.includes('502')) {
            return 'Supabase DB vaqtincha ishlamayapti (502/503). Keyinroq urinib ko\'ring.';
        }
        if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND') {
            return `Tarmoq xatosi: ${error.code}`;
        }
        return msg;
    }

    formatAssessmentResponse(assessment, type = 'general') {
        // Detect if it's a single word or very short phrase (max 2 words)
        const wordCount = assessment.targetText ? assessment.targetText.trim().split(/\s+/).length : 0;
        const isWordAnalysis = wordCount > 0 && wordCount <= 2;

        if (type === 'compare') {
            if (isWordAnalysis) {
                return this.formatWordAssessmentResponse(assessment);
            } else if (wordCount > 2) {
                return this.formatTextAssessmentResponse(assessment);
            }
        }

        let response = `📊 *PROFESSIONAL TALAFFUZ TAHLILI*\n`;
        if (type === 'test') response = `🎯 *TALAFFUZ TESTI NATIJASI*\n`;
        if (type === 'compare') response = `📝 *MATN VA AUDIO TAQQOSLASH*\n`;

        response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        response += `🏆 *UMUMIY NATIJA: ${assessment.overallScore}/100*\n`;
        response += `🎓 *DARAJA: ${assessment.englishLevel}*\n\n`;

        response += `📝 *KO'RSATKICHLAR:*\n`;
        response += `🎯 Talaffuz aniqligi: *${assessment.accuracyScore}%*\n`;
        response += `⚡ Ravonlik (Fluency): *${assessment.fluencyScore}%*\n`;
        response += `🎵 Ohang (Prosody): *${assessment.prosodyScore}%*\n`;
        response += `✅ To'liqlik (Completeness): *${assessment.completenessScore}%*\n`;
        if (assessment.wordAccuracy !== undefined) {
            response += `📊 To'g'ri o'qilgan so'zlar: *${assessment.wordAccuracy}%*\n`;
        }
        response += `\n`;

        response += `💬 *TRANSKRIPSIYA (Matn):*\n`;
        response += `_"${assessment.transcription}"_\n\n`;

        const feedback = assessment.detailedFeedback;

        if (feedback.phoneticAnalysis.mispronouncedWords && feedback.phoneticAnalysis.mispronouncedWords.length > 0) {
            response += `⚠️ *XATOLAR TAHLILI:*\n`;
            feedback.phoneticAnalysis.mispronouncedWords.slice(0, 10).forEach(m => {
                const errorType = m.errorType ? `[${m.errorType}] ` : '';
                response += `• *${m.word}* ${errorType}\n`;
                response += `  └ ❌ Xato: _${m.phoneticError}_\n`;
                response += `  └ ✅ To'g'ri: \`${m.correctPronunciation}\`\n`;
                if (m.improvementTip) {
                    response += `  └ 💡 Maslahat: _${m.improvementTip}_\n`;
                }
            });
            response += `\n`;
        }

        if (feedback.phoneticAnalysis.prosodyFeedback) {
            response += `🎵 *OHANG VA RITM:*\n`;
            response += `_${feedback.phoneticAnalysis.prosodyFeedback}_\n\n`;
        }

        response += `🌟 *KUCHLI TOMONLARINGIZ:*\n`;
        feedback.strengths.slice(0, 3).forEach(s => response += `✅ ${s}\n`);
        response += `\n`;

        response += `📈 *RIVOJLANISH REJASI:*\n`;
        feedback.actionPlan.slice(0, 3).forEach(p => response += `🚀 ${p}\n`);

        response += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `_Ravon AI • Professional Tahlil_`;

        return response;
    }

    formatTextAssessmentResponse(assessment) {
        try {
            const feedback = assessment.detailedFeedback || {};
            const phoneticAnalysis = feedback.phoneticAnalysis || {};
            const mispronouncedWords = phoneticAnalysis.mispronouncedWords || [];
            const actionPlan = feedback.actionPlan || [];
            const score = assessment.overallScore || 0;

            let status = "🔴 (Rivojlanish kerak)";
            if (score >= 80) status = "🟢 (Ajoyib!)";
            else if (score >= 60) status = "🟡 (Yaxshi, lekin rivojlanish kerak)";

            let response = `📊 *Talaffuzingiz Tahlili Tayyor! Natija: ${score}% ${status}* \n\n`;

            if (assessment.ipa) {
                response += `📖 *Matn Transkripsiyasi:* ${assessment.ipa}\n\n`;
            }

            response += `🔍 *Tahlil natijalari:* \n\n`;

            // 1. Pronunciation Errors
            if (mispronouncedWords.length > 0) {
                response += `⚠️ *1. Talaffuz xatosi:* \n`;
                mispronouncedWords.slice(0, 3).forEach(m => {
                    const word = m.word || "So'z";
                    const correct = m.correctPronunciation || "";
                    const error = m.phoneticError || "";
                    response += `• *${word}* ${correct ? `[${correct}]` : ''} — ${error}\n`;
                    if (m.improvementTip) response += `  └ To'g'rilash: ${m.improvementTip}\n`;
                });
                response += `\n`;
            }

            // 2. Stress
            response += `⚖️ *2. Urg'u (Stress):* \n`;
            if (phoneticAnalysis.prosodyFeedback) {
                response += `${phoneticAnalysis.prosodyFeedback}\n`;
            }
            if (assessment.stressExample) {
                response += `• *${assessment.stressExample}*\n`;
            }
            response += `\n`;

            // 3. Fluency
            response += `🐢 *3. Ravonlik (Fluency):* \n`;
            response += `Nutqingizda ravonlik ko'rsatkichi: *${assessment.fluencyScore || 0}%*.\n`;
            const fluencyTips = actionPlan.filter(p => p.toLowerCase().includes('ravon') || p.toLowerCase().includes('bog\'lab'));
            if (fluencyTips.length > 0) {
                response += `• Maslahat: ${fluencyTips[0]}\n`;
            }
            response += `\n`;

            // Recommendations
            response += `💡 *Tavsiyalar:* \n`;
            actionPlan.slice(0, 3).forEach(p => response += `✅ ${p}\n`);
            response += `✅ Taqqoslash: Bot yuborgan audio bilan o'z ovozingizni solishtirib, xatolarni tahlil qiling. \n\n`;

            response += `🚀 *Talaffuzni 100% ga chiqaring!* Kursimizda barcha tovushlar, urg'u qoidalari va ravon gapirish sirlari noldan o'rgatilgan. \n\n`;

            response += `🔗 *Batafsil:* [ https://t.me/+Pl610Bsw6YA4M2Ri ] \n`;

            return response;
        } catch (e) {
            console.error('Format text response error:', e);
            return `📊 *Talaffuz tahlili tayyor!* \nUmumiy natija: ${assessment.overallScore}%`;
        }
    }

    formatWordAssessmentResponse(assessment) {
        try {
            const feedback = assessment.detailedFeedback || {};
            const phoneticAnalysis = feedback.phoneticAnalysis || {};
            const mispronouncedWords = phoneticAnalysis.mispronouncedWords || [];
            const targetWord = assessment.targetText || assessment.transcription || "Noma'lum";
            const ipa = assessment.ipa || "";
            const score = assessment.overallScore || 0;

            let response = `🌟 *Tahlil Tayyor!* \n\n`;
            response += `📝 *So'z:* ${targetWord} ${ipa ? `[/${ipa}/]` : ''} 🎯 *Natija:* ${score}% ✅ \n\n`;

            if (mispronouncedWords.length > 0) {
                response += `❌ *Xatoliklar:* \n`;
                mispronouncedWords.slice(0, 5).forEach(m => {
                    const word = m.word || targetWord;
                    const error = m.phoneticError || "Talaffuzda xatolik";
                    const tip = m.improvementTip || "";
                    const correct = m.correctPronunciation || "";

                    response += `• *"${word}"* — ${error}\n`;
                    if (correct) response += `  └ ✅ *To'g'ri talaffuz:* [/${correct}/]\n`;
                    if (tip) response += `  └ 💡 *Qanday to'g'rilash mumkin:* ${tip}\n`;
                });
                response += `\n`;
            } else {
                response += `✅ *Xatoliklar aniqlanmadi. Ajoyib talaffuz!*\n\n`;
            }

            response += `💡 *Maslahat:* O'z audiongizni bot audiosi bilan solishtiring va xato so'zni 5 marta qayta ayting. \n\n`;

            response += `🚀 *Talaffuzni 100% ga chiqaring!* Kursimizda barcha tovushlar va qoidalar noldan o'rgatilgan. \n\n`;

            response += `🔗 *Batafsil:* [ https://t.me/+Pl610Bsw6YA4M2Ri ] \n`;

            return response;
        } catch (e) {
            console.error('Format word response error:', e);
            return `🌟 *Tahlil tayyor!* \nNatija: ${assessment.overallScore}%`;
        }
    }

    async getLastAssessment(telegramId) {
        return await database.getLastAssessment(telegramId);
    }

    async getUserStats(telegramId) {
        return await database.getUserStats(telegramId);
    }
    async processWriting(user, text, topicId = null, imageData = null) {
        try {
            const canProceed = await database.checkLimit(user.telegram_id, 'writing');
            if (!canProceed) throw new Error('LIMIT_EXCEEDED');

            let topic = null;
            if (topicId) {
                topic = await database.getTopicById(topicId);
            }

            // Step 1: AI Analysis (supporting vision)
            const analysis = await geminiService.analyzeWriting(text, topic, imageData);

            // Log API usage
            if (analysis._usage) {
                try {
                    await database.logApiUsage(
                        analysis._model || 'gemini',
                        analysis._usage.prompt_tokens || 0,
                        analysis._usage.completion_tokens || 0,
                        analysis._usage.total_tokens || 0,
                        'writing_analysis'
                    );
                } catch (e) {}
            }

            // Step 2: Save to DB
            try {
                const userIdInDb = await database.saveUser(user);
                await database.saveUserResult({
                    user_id: userIdInDb,
                    type: 'writing',
                    topic_id: topicId,
                    content: analysis.extractedText || text,
                    score: analysis.overallScore,
                    analysis: analysis
                });
                await database.incrementUsage(user.telegram_id, 'writing');
            } catch (e) {
                console.error('DB error in processWriting:', e.message);
            }

            // Step 3: Format
            const responseText = this.formatWritingResponse(analysis);
            return { 
                success: true, 
                text: responseText, 
                data: analysis
            };
        } catch (error) {
            console.error('Writing processing error:', error.message);
            return { success: false, error: error.message };
        }
    }

    formatWritingResponse(analysis) {
        // AI returns a pre-formatted string in analysis.formattedFeedback
        // but we can also build it here for more control if needed.
        if (analysis.isOriginal === false) {
            let warn = `⚠️ *DIQQAT: KO'CHIRMA MATN ANIQLANDI!*\n`;
            warn += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            warn += `Siz yuborgan matn qisman yoki to'liq internetdan ko'chirilgan yoki AI yordamida yozilgan deb topildi.\n\n`;
            warn += `💡 *Qoida:* Ball olish uchun matnni o'zingiz, mustaqil ravishda yozishingiz shart. Ko'chirma matnlarga *0 ball* beriladi.\n\n`;
            warn += `🏆 *UMUMIY BALL: 0*\n`;
            warn += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            return warn;
        }

        let res = `📝 *WRITING TAHLILI NATIJASI*\n`;
        res += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        res += `🏆 *UMUMIY BALL: ${analysis.overallScore}*\n\n`;
        
        res += `📊 *KO'RSATKICHLAR:*\n`;
        res += `• Grammatika: *${analysis.grammarScore}*\n`;
        res += `• Lug'at: *${analysis.vocabularyScore}*\n`;
        res += `• Mazmun/Bog'liqlik: *${analysis.cohesionScore}*\n\n`;

        const feedback = analysis.feedback;
        if (feedback.grammar && feedback.grammar.length > 0) {
            res += `⚠️ *GRAMMATIK XATOLAR:*\n`;
            feedback.grammar.slice(0, 5).forEach(e => {
                res += `❌ _${e.error}_\n`;
                res += `✅ *${e.correction}*\n`;
                res += `💡 ${e.explanation}\n\n`;
            });
        }

        if (feedback.vocabulary && feedback.vocabulary.suggestions && feedback.vocabulary.suggestions.length > 0) {
            res += `📚 *LUG'AT BOYITISH:*\n`;
            feedback.vocabulary.suggestions.slice(0, 3).forEach(s => {
                res += `🔸 _${s.original}_ → *${s.better}*\n`;
                res += `💡 ${s.reason}\n`;
            });
            res += `\n`;
        }

        res += `🔗 *BOG'LIQLIK (COHESION):*\n`;
        res += `${feedback.cohesion}\n\n`;

        res += `💡 *UMUMIY TAVSIYALAR:*\n`;
        feedback.generalAdvice.forEach(a => res += `✅ ${a}\n`);

        res += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        res += `_Ravon AI • Professional Writing Tahlili_`;

        return res;
    }
}

module.exports = new AssessmentService();
