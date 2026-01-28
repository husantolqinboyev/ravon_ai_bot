const { Telegraf } = require('telegraf');
const config = require('../config');

async function stopRenderBot() {
    try {
        console.log('Stopping Render bot...');
        
        const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
        
        // Delete webhook and clear all updates
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook deleted');
        
        // Get webhook info to confirm
        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log('📊 Webhook info:', webhookInfo);
        
        console.log('🛑 Render bot stopped successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error stopping bot:', error.message);
        process.exit(1);
    }
}

stopRenderBot();
