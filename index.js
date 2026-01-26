const { Telegraf, session, Markup } = require('telegraf');
const http = require('http');
const https = require('https');
const config = require('./config');
const commandHandler = require('./handlers/commandHandler');
const audioHandler = require('./handlers/audioHandler');
const database = require('./database');

// Initialize bot
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// Middleware
bot.use(session());

// Channel Membership Middleware
bot.use(async (ctx, next) => {
    // Skip check for certain update types or commands
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'check_subscription') {
        return next();
    }

    const userId = ctx.from?.id;
    if (!userId) return next();

    // Handle Broadcast state first
    if (ctx.session?.state === 'waiting_for_broadcast_message' && (ctx.message || ctx.editedMessage)) {
        return commandHandler.handleBroadcast(ctx);
    }

    // Skip check for Admin
    const isAdmin = await database.isAdmin(userId);
    if (isAdmin) return next();

    // Check Premium Status (handles expiry)
    await database.checkPremiumStatus(userId);

    try {
        const member = await ctx.telegram.getChatMember(config.REQUIRED_CHANNEL_ID, userId);
        const isMember = ['member', 'administrator', 'creator'].includes(member.status);

        if (!isMember) {
            return ctx.reply(
                "⚠️ Botdan foydalanish uchun rasmiy kanalimizga a'zo bo'lishingiz kerak!",
                Markup.inlineKeyboard([
                    [Markup.button.url("Kanalga a'zo bo'lish", config.CHANNEL_URL)],
                    [Markup.button.callback("✅ A'zo bo'ldim / Tekshirish", "check_subscription")]
                ])
            );
        }
    } catch (error) {
        console.error('Membership check error:', error);
        // If error (e.g. bot not admin in channel), allow access but log it
        if (error.description && error.description.includes('chat not found')) {
            console.error('CRITICAL: Bot is not admin in the channel or Channel ID is wrong!');
        }
    }

    return next();
});

// Handle Subscription Check Callback
bot.action('check_subscription', async (ctx) => {
    const userId = ctx.from.id;
    try {
        const member = await ctx.telegram.getChatMember(config.REQUIRED_CHANNEL_ID, userId);
        const isMember = ['member', 'administrator', 'creator'].includes(member.status);

        if (isMember) {
            await ctx.answerCbQuery("✅ Rahmat! Endi botdan foydalanishingiz mumkin.");
            await ctx.deleteMessage().catch(() => {});
            return commandHandler.handleStart(ctx);
        } else {
            await ctx.answerCbQuery("❌ Siz hali kanalga a'zo emassiz!", { show_alert: true });
        }
    } catch (error) {
        console.error('Check action error:', error);
        await ctx.answerCbQuery("Xatolik yuz berdi. Iltimos, kanalga a'zo ekanligingizni tekshiring.");
    }
});

// Start command
bot.start((ctx) => commandHandler.handleStart(ctx));

// Admin commands
bot.command('admin', (ctx) => commandHandler.handleAdmin(ctx));
bot.command('teacher', (ctx) => commandHandler.handleTeacher(ctx));

// Main Menu Handlers
bot.hears('🎯 Talaffuzni test qilish', (ctx) => commandHandler.handleTestPronunciation(ctx));
bot.hears('📝 Matn va Audio', (ctx) => commandHandler.handleCompareTextAudio(ctx));
bot.hears('🔊 Matnni audyoga o\'tkazish', (ctx) => commandHandler.handleTextToAudio(ctx));
bot.hears('📊 Mening natijalarim', (ctx) => commandHandler.handleStats(ctx));
bot.hears('📊 Limitim', (ctx) => commandHandler.handleLimitInfo(ctx));
bot.hears('👤 Profil', (ctx) => commandHandler.handleProfile(ctx));
bot.hears('🔗 Referal', (ctx) => commandHandler.handleReferral(ctx));
bot.hears('💎 Premium', (ctx) => commandHandler.handlePremium(ctx));
bot.hears('🏠 Asosiy menyu', (ctx) => commandHandler.handleMainMenu(ctx));
bot.hears('🔙 Asosiy menyu', (ctx) => commandHandler.handleMainMenu(ctx));

// Admin & Teacher Panel Handlers
bot.hears('👥 Foydalanuvchilar', (ctx) => commandHandler.handleUsers(ctx));
bot.hears(['➕ Test so\'zi qo\'shish', '➕ Matn qo\'shish'], (ctx) => commandHandler.handleTestWord(ctx));
bot.hears('📚 Matnlar ro\'yxati', (ctx) => commandHandler.handleManageTexts(ctx));
bot.hears('📊 Umumiy statistika', (ctx) => commandHandler.handleAdminStats(ctx));
bot.hears('📋 Oxirgi natijalar', (ctx) => commandHandler.handleUserResults(ctx));
bot.hears('👨‍🏫 O\'qituvchilar', (ctx) => commandHandler.handleTeachers(ctx));
bot.hears('💳 Karta sozlamalari', (ctx) => commandHandler.handleCardSettings(ctx));
bot.hears('💰 Tariflar', (ctx) => commandHandler.handleTariffSettings(ctx));
bot.hears('📩 To\'lov so\'rovlari', (ctx) => commandHandler.handlePaymentRequests(ctx));
bot.hears('📢 E\'lon berish', (ctx) => commandHandler.handleBroadcastRequest(ctx));

// Admin commands with arguments
bot.command('setcard', (ctx) => commandHandler.handleSetCard(ctx));
bot.command('addtariff', (ctx) => commandHandler.handleAddTariff(ctx));

// Action handlers
bot.action('admin_set_card', (ctx) => commandHandler.handleSetCardRequest(ctx));
bot.action('admin_add_tariff', (ctx) => commandHandler.handleAddTariffRequest(ctx));
bot.action('admin_panel_main', (ctx) => commandHandler.handleAdmin(ctx));
bot.action(/select_tariff_(.+)/, (ctx) => commandHandler.handleSelectTariff(ctx));
bot.action(/delete_tariff_(.+)/, (ctx) => commandHandler.handleDeleteTariff(ctx));
bot.action(/approve_payment_(.+)/, (ctx) => commandHandler.handleApprovePayment(ctx));
bot.action(/reject_payment_(.+)/, (ctx) => commandHandler.handleRejectPayment(ctx));
bot.action(/manage_user_(.+)/, (ctx) => commandHandler.handleManageUser(ctx));
bot.action(/toggle_teacher_(\d+)_(0|1)/, (ctx) => commandHandler.handleToggleTeacher(ctx));
bot.action(/add_limit_(\d+)_(\d+)/, (ctx) => commandHandler.handleAddLimit(ctx));
bot.action('admin_users_list', (ctx) => commandHandler.handleUsers(ctx));
bot.action('show_referral_info', (ctx) => commandHandler.handleReferral(ctx));

// Help command
bot.help((ctx) => commandHandler.handleHelp(ctx));

// Compare choice callback
bot.action(/compare_choice_/, (ctx) => commandHandler.handleCompareChoice(ctx));
bot.action('download_pdf_report', (ctx) => commandHandler.handleDownloadPdfReport(ctx));
bot.action(/play_correct_/, (ctx) => commandHandler.handlePlayCorrect(ctx));
bot.action('listen_test_text', (ctx) => commandHandler.handleListenTestText(ctx));
bot.action('confirm_test_reading', (ctx) => commandHandler.handleConfirmTestReading(ctx));
bot.action(/start_test_(\d+)/, (ctx) => commandHandler.handleStartTestById(ctx));
bot.action('test_pronunciation_list', (ctx) => commandHandler.handleTestPronunciationList(ctx));
bot.action(/delete_text_(\d+)/, (ctx) => commandHandler.handleDeleteText(ctx));

// Audio and voice messages
bot.on(['audio', 'voice'], (ctx) => audioHandler.handleAudio(ctx));

// Text message handling for state machine and other messages
bot.on('text', async (ctx, next) => {
    if (ctx.session?.state === 'waiting_for_text_for_pronunciation') {
        return commandHandler.processTextForPronunciation(ctx);
    }

    if (ctx.session?.state === 'waiting_for_card_info') {
        return commandHandler.handleSetCard(ctx);
    }

    if (ctx.session?.state === 'waiting_for_tariff_info') {
        return commandHandler.handleAddTariff(ctx);
    }
    
    // Check if it's a command or menu button, if so, reset state and let next middleware handle it
    const menuButtons = [
        '🎯 Talaffuzni test qilish', '📝 Matn va Audio', '🔊 Matnni audyoga o\'tkazish',
        '📊 Mening natijalarim', '📊 Limitim', '👤 Profil', '🔗 Referal', '💎 Premium',
        '🏠 Asosiy menyu', '🔙 Asosiy menyu'
    ];
    
    if (ctx.message.text.startsWith('/') || menuButtons.includes(ctx.message.text)) {
        ctx.session.state = null;
        return next();
    }

    return audioHandler.handleText(ctx);
});

// Photo handling for payment receipts
bot.on('photo', async (ctx) => {
    if (ctx.session?.state === 'waiting_for_payment_details') {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const caption = ctx.message.caption || '';
        
        if (!caption || caption.length < 5) {
            return ctx.reply("⚠️ Iltimos, rasm bilan birga ismingizni va to'lov tafsilotlarini (caption qismida) yuboring.");
        }

        const tariff = ctx.session.selectedTariff;
        const user = await database.getUserByTelegramId(ctx.from.id);
        
        await database.createPaymentRequest(user.id, tariff.id, photo.file_id, caption);
        
        ctx.session.state = null;
        ctx.session.selectedTariff = null;

        await ctx.reply("✅ To'lov cheki qabul qilindi! Adminlar tez orada ko'rib chiqib, Premium obunangizni tasdiqlashadi.");
        
        // Notify admin
        const admins = await database.getAdmins();
        for (const admin of admins) {
            try {
                await ctx.telegram.sendMessage(admin.telegram_id, `📩 *Yangi to'lov so'rovi keldi!* \n\nFoydalanuvchi: ${ctx.from.first_name} \nTarif: ${tariff.name}\n\nKo'rish uchun /admin panelidan '📩 To'lov so'rovlari' bo'limiga kiring.`, { parse_mode: 'Markdown' });
            } catch (e) {}
        }
        return;
    }
    
    await ctx.reply("Iltimos, avval menyudan kerakli bo'limni tanlang.");
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
    ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
});

// Start bot with retry logic
const startBot = async (retries = 5) => {
    // Start dummy HTTP server for Render before launching bot
    const PORT = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot is running\n');
    }).listen(PORT, '0.0.0.0', () => {
        console.log(`📡 Health check server listening on port ${PORT}`);
    });

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🚀 Starting Preimum English AI bot... (Attempt ${i + 1}/${retries})`);
            await bot.launch();
            console.log('✅ Bot is running!');
            return;
        } catch (err) {
            console.error(`❌ Launch error (Attempt ${i + 1}):`, err.message);
            if (i < retries - 1) {
                const waitTime = 5000 * (i + 1);
                console.log(`🔄 Retrying in ${waitTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                console.error('💥 Max retries reached. Could not start bot.');
                process.exit(1);
            }
        }
    }
};

startBot();

// Keep-alive mechanism for Render free tier
const RENDER_URL = 'https://ravon-ai-bot.onrender.com';
setInterval(() => {
    https.get(RENDER_URL, (res) => {
        console.log(`ping: ${RENDER_URL} - Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error(`ping error: ${err.message}`);
    });
}, 10 * 60 * 1000); // Every 10 minutes (600,000 ms)

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));