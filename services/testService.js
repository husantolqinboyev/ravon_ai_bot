const database = require('../database');

class TestService {
    constructor() {
        this.sessions = new Map();
    }

    async startTest(userId, topicId = null, questionCount = 20) {
        const canProceed = await database.checkLimit(userId, 'test');
        if (!canProceed) {
            return { success: false, error: 'LIMIT_EXCEEDED' };
        }

        const questions = await database.getRandomQuestions(questionCount, topicId);
        
        if (!questions || questions.length === 0) {
            return { success: false, error: 'NO_QUESTIONS' };
        }

        const session = {
            userId,
            topicId,
            questions,
            currentIndex: 0,
            score: 0,
            answers: [],
            startTime: Date.now(),
            lastQuestionTime: Date.now(),
            consecutiveTimeouts: 0
        };

        this.sessions.set(userId, session);
        return { success: true, session };
    }

    getSession(userId) {
        return this.sessions.get(userId);
    }

    async submitAnswer(userId, answerIndex) {
        const session = this.sessions.get(userId);
        if (!session) return null;

        const currentQuestion = session.questions[session.currentIndex];
        
        // Timer check
        const now = Date.now();
        const timeLimit = (currentQuestion.time_limit || 30) * 1000; // to ms
        const timeSpent = now - session.lastQuestionTime;
        
        const timedOut = answerIndex === null || timeSpent > timeLimit;
        
        if (timedOut) {
            session.consecutiveTimeouts++;
        } else {
            session.consecutiveTimeouts = 0;
            isCorrect = currentQuestion.correct_option === parseInt(answerIndex);
            if (isCorrect) {
                scoreEarned = currentQuestion.points || 1;
                session.score += scoreEarned;
            }
        }

        session.answers.push({
            questionId: currentQuestion.id,
            answerIndex,
            isCorrect,
            scoreEarned,
            timedOut
        });

        session.currentIndex++;
        session.lastQuestionTime = Date.now();

        const isFinished = session.currentIndex >= session.questions.length || session.consecutiveTimeouts >= 4;
        const forceQuit = session.consecutiveTimeouts >= 4;
        
        if (isFinished) {
            await this.finishTest(userId);
        }

        return {
            isCorrect,
            correctOption: currentQuestion.correct_option,
            isFinished,
            forceQuit,
            nextQuestion: isFinished ? null : session.questions[session.currentIndex],
            score: session.score,
            total: session.questions.length
        };
    }

    async finishTest(userId) {
        const session = this.sessions.get(userId);
        if (!session) return;

        const scorePercentage = (session.score / session.questions.length) * 100;

        try {
            const userIdInDb = await database.saveUser({ id: userId }); // Minimal user object for saveUser
            await database.saveUserResult({
                user_id: userIdInDb,
                type: 'test',
                topic_id: session.topicId,
                score: scorePercentage,
                total_questions: session.questions.length,
                correct_answers: session.score,
                details: {
                    answers: session.answers,
                    duration: Date.now() - session.startTime
                }
            });
            await database.incrementUsage(userId, 'test');
        } catch (e) {
            console.error('Error saving test results:', e.message);
        }

        // Keep session for a while to show final results, or delete immediately
        // this.sessions.delete(userId);
    }

    getProgressBar(current, total, length = 10) {
        const progress = Math.round((current / total) * length);
        const empty = length - progress;
        return '█'.repeat(progress) + '░'.repeat(empty);
    }
}

module.exports = new TestService();
