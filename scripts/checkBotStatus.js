const { Telegraf } = require('telegraf');
const config = require('../config');

async function checkBotStatus() {
    try {
        console.log('Checking bot status...');
        
        const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
        
        // Get bot info
        const botInfo = await bot.telegram.getMe();
        console.log(`🤖 Bot: @${botInfo.username} (${botInfo.first_name})`);
        
        // Get webhook info
        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log('📊 Webhook status:', webhookInfo);
        
        if (webhookInfo.url) {
            console.log(`⚠️ Bot has webhook set to: ${webhookInfo.url}`);
            console.log('Deleting webhook...');
            await bot.telegram.deleteWebhook({ drop_pending_updates: true });
            console.log('✅ Webhook deleted');
        }
        
        console.log('🎉 Bot is ready to start!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error checking bot:', error.message);
        process.exit(1);
    }
}

checkBotStatus();
