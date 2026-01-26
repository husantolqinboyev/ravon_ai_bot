require('dotenv').config();

module.exports = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    // Bot configuration
    MAX_AUDIO_DURATION: 30, // seconds
    SUPPORTED_AUDIO_TYPES: ['audio/ogg', 'audio/mpeg', 'audio/wav'],
    
    // Gemini Settings
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

    // Admin Settings
    ADMIN_IDS: process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map(id => id.trim()) : [],

    // Channel Subscription Check
    REQUIRED_CHANNEL_ID: '-1003014655042',
    CHANNEL_URL: 'https://t.me/englishwithSanatbek',
};
