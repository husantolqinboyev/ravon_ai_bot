const express = require('express');
const crypto = require('crypto');
const database = require('./database');
const config = require('./config');
const assessmentService = require('./services/assessmentService');
const ttsService = require('./services/ttsService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Middleware to verify Telegram Mini App initData
const verifyTelegramWebAppData = (req, res, next) => {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
        return res.status(401).json({ error: 'Missing Telegram initData' });
    }

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();

        let dataCheckString = '';
        for (const [key, value] of urlParams.entries()) {
            dataCheckString += `${key}=${value}\n`;
        }
        dataCheckString = dataCheckString.slice(0, -1);

        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(config.TELEGRAM_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash === hash) {
            const userStr = urlParams.get('user');
            if (userStr) {
                req.tgUser = JSON.parse(userStr);
                return next();
            }
        }
        return res.status(401).json({ error: 'Invalid Telegram initData' });
    } catch (error) {
        console.error('Telegram Auth Error:', error);
        return res.status(500).json({ error: 'Auth internal error' });
    }
};

// GET user data (authenticated via initData)
router.get('/user-data', verifyTelegramWebAppData, async (req, res) => {
    try {
        const telegramId = req.tgUser.id;

        let user = await database.getUserByTelegramId(telegramId);
        if (!user) {
            // Save user if not exists
            await database.saveUser(req.tgUser);
            user = await database.getUserByTelegramId(telegramId);
        }

        const stats = await database.getUserStats(telegramId);
        const referralInfo = await database.getReferralInfo(telegramId);
        const tariffs = await database.getTariffs();
        const isAdmin = await database.isAdmin(telegramId);

        res.json({ user, stats, referralInfo, tariffs, isAdmin });
    } catch (error) {
        console.error('API User Data Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await database.getLeaderboard(50);
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST analyze audio
router.post('/analyze-audio', verifyTelegramWebAppData, upload.single('audio'), async (req, res) => {
    try {
        const audioBuffer = req.file.buffer;
        const referenceText = req.body.reference_text || null;
        const duration = parseFloat(req.body.duration) || 0;
        const type = referenceText ? 'compare' : 'general';

        const user = await database.getUserByTelegramId(req.tgUser.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const result = await assessmentService.processAudio(
            user,
            audioBuffer,
            duration,
            req.file.mimetype,
            type,
            referenceText
        );

        res.json(result);
    } catch (error) {
        console.error('API Analyze Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST text-to-speech
router.post('/text-to-speech', verifyTelegramWebAppData, async (req, res) => {
    try {
        const { text, voice = 'en-US-AriaNeural' } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const audioPath = await ttsService.generateAudio(text, 'en');
        // In a real app, you might want to serve the file or send buffer
        // For simplicity, we'll send the audio file
        res.sendFile(audioPath, {}, (err) => {
            if (err) console.error('Send file error:', err);
            ttsService.cleanup(audioPath);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET user assessments
router.get('/assessments', verifyTelegramWebAppData, async (req, res) => {
    try {
        const user = await database.getUserByTelegramId(req.tgUser.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { data, error } = await database.supabase
            .from('assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET test words
router.get('/test-words', async (req, res) => {
    try {
        const type = req.query.type || 'word';
        const limit = parseInt(req.query.limit) || 20;
        const words = await database.getRecentTestWordsByType(type, limit);
        res.json(words);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET random word
router.get('/random-word', async (req, res) => {
    try {
        const type = req.query.type || 'word';
        const word = await database.getRandomTestWordByType(type);
        res.json(word);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET learning materials (assigned and public)
router.get('/materials', verifyTelegramWebAppData, async (req, res) => {
    try {
        const telegramId = req.tgUser.id;
        const user = await database.getUserByTelegramId(telegramId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get public materials
        const { data: publicMaterials, error: pubError } = await database.supabase
            .from('learning_materials')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (pubError) throw pubError;

        // Get student tasks (assigned materials)
        const tasks = await database.getStudentTasks(user.id, 'pending');

        res.json({
            public: publicMaterials || [],
            assigned: tasks || []
        });
    } catch (error) {
        console.error('API Materials Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
