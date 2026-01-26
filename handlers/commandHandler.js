const { Markup } = require('telegraf');
const assessmentService = require('../services/assessmentService');
const pdfService = require('../services/pdfService');
const ttsService = require('../services/ttsService');
const database = require('../database');
const config = require('../config');

class CommandHandler {
    constructor() {
        this.mainMenu = Markup.keyboard([
            ['🎯 Talaffuzni test qilish', '📝 Matn va Audio'],
            ['🔊 Matnni audyoga o\'tkazish', '📊 Mening natijalarim'],
            ['📊 Limitim', '👤 Profil'],
            ['🔗 Referal', '💎 Premium']
        ]).resize();

        this.adminMenu = Markup.keyboard([
            ['👥 Foydalanuvchilar', '➕ Matn qo\'shish'],
            ['📚 Matnlar ro\'yxati', '📋 Oxirgi natijalar'],
            ['📊 Umumiy statistika', '👨‍🏫 O\'qituvchilar'],
            ['💳 Karta sozlamalari', '💰 Tariflar'],
            ['📩 To\'lov so\'rovlari', '📢 E\'lon berish'],
            ['🔙 Asosiy menyu']
        ]).resize();

        this.teacherMenu = Markup.keyboard([
            ['➕ Matn qo\'shish', '📋 Oxirgi natijalar'],
            ['📚 Matnlar ro\'yxati', '📊 Umumiy statistika'],
            ['🔙 Asosiy menyu']
        ]).resize();
    }

    async handleStart(ctx) {
        const startPayload = ctx.startPayload; // Deep link payload (referrer ID)
        let referrerId = null;
        
        if (startPayload && !isNaN(startPayload)) {
            referrerId = parseInt(startPayload);
        }

        await database.saveUser(ctx.from, referrerId);
        
        // Auto-set first user as admin if no admin exists and no ADMIN_ID in .env
        const adminCount = await database.getAdminCount();
        if (adminCount === 0 && (!config.ADMIN_IDS || config.ADMIN_IDS.length === 0)) {
            await database.setAdmin(ctx.from.id, true);
        }

        const isAdmin = await database.isAdmin(ctx.from.id);
        const isTeacher = await database.isTeacher(ctx.from.id);
        
        let welcomeMessage = `Assalomu alaykum! 👋\n\n` +
            `Men sizning ingliz tili talaffuzingizni baholashga yordam beruvchi botman.\n` +
            `Quyidagi bo'limlardan birini tanlang:`;
        
        if (isAdmin) {
            welcomeMessage += `\n\n👨‍💼 Siz adminsiz. Admin panelga kirish uchun /admin buyrug'ini yuboring.`;
        } else if (isTeacher) {
            welcomeMessage += `\n\n👨‍🏫 Siz o'qituvchisiz. O'qituvchi paneliga kirish uchun /teacher buyrug'ini yuboring.`;
        }

        await ctx.reply(welcomeMessage, this.mainMenu);
    }

    async handleAdmin(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const msg = '👨‍💼 Admin panelga xush kelibsiz!';
        if (ctx.callbackQuery) {
            await ctx.editMessageText(msg, this.adminMenu).catch(() => {
                ctx.reply(msg, this.adminMenu);
            });
            await ctx.answerCbQuery();
        } else {
            await ctx.reply(msg, this.adminMenu);
        }
    }

    async handleTeacher(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        await ctx.reply('👨‍🏫 O\'qituvchi paneliga xush kelibsiz!', this.teacherMenu);
    }

    async handleTeachers(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        database.db.all('SELECT * FROM users WHERE is_teacher = 1 OR is_admin = 1', (err, rows) => {
            if (err) return ctx.reply('Xatolik yuz berdi.');
            
            let msg = `👨‍🏫 *O'qituvchilar va Adminlar ro'yxati:*\n\n`;
            const buttons = [];

            rows.forEach(u => {
                const role = u.is_admin ? 'Admin' : 'O\'qituvchi';
                msg += `• ${u.first_name} (@${u.username || 'yo\'q'}) - [${role}]\n`;
                if (!u.is_admin) {
                    buttons.push([Markup.button.callback(`❌ ${u.first_name} ni o'chirish`, `toggle_teacher_${u.telegram_id}_0`)]);
                }
            });

            if (buttons.length > 0) {
                ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
            } else {
                ctx.replyWithMarkdown(msg);
            }
        });
    }

    async handleMainMenu(ctx) {
        await ctx.reply('🏠 Asosiy menyu:', this.mainMenu);
    }

    async handleTestPronunciation(ctx) {
        try {
            const words = await database.getRecentTestWords(10);
            if (!words || words.length === 0) {
                return ctx.reply('Hozircha test matnlari yo\'q. O\'qituvchilar tez orada qo\'shadi.');
            }

            let msg = `🎯 *Talaffuz testi*\n\nO'zingizga kerakli matnni tanlang va uni o'qib bering:`;
            const buttons = [];

            words.forEach((w) => {
                const shortText = w.word.length > 25 ? w.word.substring(0, 22) + '...' : w.word;
                buttons.push([Markup.button.callback(shortText, `start_test_${w.id}`)]);
            });

            await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
        } catch (error) {
            console.error('Test Pronunciation Menu Error:', error);
            ctx.reply('Xatolik yuz berdi.');
        }
    }

    async handleStartTestById(ctx) {
        try {
            const textId = ctx.match[1];
            const word = await new Promise((resolve) => {
                database.db.get('SELECT * FROM test_words WHERE id = ?', [textId], (err, row) => resolve(row));
            });

            if (!word) {
                return ctx.answerCbQuery("⚠️ Matn topilmadi.", { show_alert: true });
            }

            ctx.session = ctx.session || {};
            // State'ni hali o'rnatmaymiz, faqat matnni saqlaymiz
            ctx.session.testWord = word.word;

            const isLong = word.word.trim().split(/\s+/).length > 2;
            const typeText = isLong ? 'matnni' : 'so\'zni';

            const msg = `🎯 *Talaffuz testi!*\n\nSiz tanlagan ${typeText}:\n\n👉 *${word.word}*\n\nTayyor bo'lsangiz, "O'qish" tugmasini bosing:`;
            
            await ctx.editMessageText(msg, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🎙 O\'qish', 'confirm_test_reading')],
                    [Markup.button.callback('🔊 Eshitish', 'listen_test_text')],
                    [Markup.button.callback('🔙 Orqaga', 'test_pronunciation_list')]
                ])
            });
            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Start Test By Id Error:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.');
        }
    }

    async handleConfirmTestReading(ctx) {
        try {
            const text = ctx.session?.testWord;
            if (!text) {
                return ctx.answerCbQuery("⚠️ Xatolik: Matn topilmadi.", { show_alert: true });
            }

            ctx.session.state = 'waiting_for_test_audio';
            
            await ctx.editMessageText(`🎙 *Sizning navbatingiz!*\n\nMatn: *${text}*\n\nIltimos, audioni yozib yuboring...`, { parse_mode: 'Markdown' });
            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Confirm Test Reading Error:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.');
        }
    }

    async handleTestPronunciationList(ctx) {
        try {
            const words = await database.getRecentTestWords(10);
            if (!words || words.length === 0) {
                return ctx.editMessageText('Hozircha test matnlari yo\'q.');
            }

            let msg = `🎯 *Talaffuz testi*\n\nO'zingizga kerakli matnni tanlang va uni o'qib bering:`;
            const buttons = [];

            words.forEach((w) => {
                const shortText = w.word.length > 25 ? w.word.substring(0, 22) + '...' : w.word;
                buttons.push([Markup.button.callback(shortText, `start_test_${w.id}`)]);
            });

            await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Test Pronunciation List Error:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.');
        }
    }

    async handleListenTestText(ctx) {
        try {
            const text = ctx.session?.testWord;
            if (!text) {
                return ctx.answerCbQuery("⚠️ Matn topilmadi. Iltimos, qaytadan boshlang.", { show_alert: true });
            }

            await ctx.answerCbQuery("Audio tayyorlanmoqda... ⏳");
            const audioPath = await ttsService.generateAudio(text, 'en');
            
            await ctx.reply(`🔊 *Namuna:*\n\n_"${text}"_`, { parse_mode: 'Markdown' });
            await ctx.replyWithAudio({ source: audioPath });
            
            await ttsService.cleanup(audioPath);
        } catch (error) {
            console.error('Listen Test Text Error:', error);
            await ctx.reply("Audioni yaratishda xatolik yuz berdi.");
        }
    }

    async handleManageTexts(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        try {
            const rows = await database.getRecentTestWords(20);
            
            if (!rows || rows.length === 0) {
                return ctx.reply('Hozircha matnlar mavjud emas.');
            }

            let msg = `📚 *Matnlar va so'zlar ro'yxati (oxirgi 20 ta):*\n\n`;
            const buttons = [];

            rows.forEach((r, index) => {
                const shortText = r.word.length > 20 ? r.word.substring(0, 17) + '...' : r.word;
                msg += `${index + 1}. ${r.word}\n\n`;
                buttons.push([Markup.button.callback(`❌ O'chirish: ${shortText}`, `delete_text_${r.id}`)]);
            });

            ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
        } catch (err) {
            console.error('Manage Texts Error:', err);
            ctx.reply('Xatolik yuz berdi.');
        }
    }

    async handleDeleteText(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        const textId = ctx.match[1];
        try {
            await database.deleteTestWord(textId);
            await ctx.answerCbQuery('Matn muvaffaqiyatli o\'chirildi!');
            ctx.deleteMessage().catch(() => {});
        } catch (err) {
            console.error('Delete Text Error:', err);
            await ctx.answerCbQuery('O\'chirishda xatolik yuz berdi.');
        }
    }

    async handleCompareTextAudio(ctx) {
        const compareMenu = Markup.inlineKeyboard([
            [Markup.button.callback('🔤 So\'z yuborish', 'compare_choice_word')],
            [Markup.button.callback('📝 Matn yuborish', 'compare_choice_text')]
        ]);

        await ctx.reply('📝 Matn va Audio taqqoslash!\n\nIltimos, turini tanlang:', compareMenu);
    }

    async handleCompareChoice(ctx) {
        const choice = ctx.callbackQuery.data;
        ctx.session = ctx.session || {};
        
        if (choice === 'compare_choice_word') {
            ctx.session.state = 'waiting_for_compare_word';
            await ctx.editMessageText('🔤 Iltimos, so\'zni yuboring (maksimal 2 ta so\'z):');
        } else if (choice === 'compare_choice_text') {
            ctx.session.state = 'waiting_for_compare_text_long';
            await ctx.editMessageText('📝 Iltimos, matnni yuboring (3 ta va undan ko\'p so\'z):');
        }
        await ctx.answerCbQuery();
    }

    async handleTextToAudio(ctx) {
        ctx.session = ctx.session || {};
        ctx.session.state = 'waiting_for_tts_text';
        await ctx.reply('🔊 Matnni audyoga o\'tkazish!\n\nIltimos, audio qilinishi kerak bo\'lgan matnni yozib yuboring:');
    }

    async handleProfile(ctx) {
        const stats = await database.getUserStats(ctx.from.id);
        const user = await new Promise((resolve) => {
            database.db.get('SELECT * FROM users WHERE telegram_id = ?', [ctx.from.id], (err, row) => resolve(row));
        });

        if (!user) {
            return ctx.reply("Siz hali ro'yxatdan o'tmagansiz. Iltimos, /start buyrug'ini bosing.");
        }

        const profileMsg = `👤 *Sizning profilingiz:*\n\n` +
            `🆔 ID: \`${ctx.from.id}\`\n` +
            `📅 Ro'yxatdan o'tilgan: ${user.created_at ? user.created_at.split(' ')[0] : 'Noma\'lum'}\n` +
            `🎯 Kunlik limit: ${user.used_today}/${user.daily_limit}\n\n` +
            `📈 *Umumiy statistika:*\n` +
            `• Jami testlar: ${stats ? stats.total_assessments : 0}\n` +
            `• O'rtacha ball: ${stats ? Math.round(stats.avg_overall) : 0}/100`;

        await ctx.replyWithMarkdown(profileMsg);
    }

    async handleUsers(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const users = await database.getAllUsers();
        let msg = `👥 *Foydalanuvchilar ro'yxati (oxirgi 15 ta):*\n\n`;
        
        const inlineKeyboard = [];
        
        users.slice(0, 15).forEach(u => {
            const firstName = (u.first_name || 'Foydalanuvchi').replace(/[_*`\[\]()]/g, '\\$&');
            const username = u.username ? `(@${u.username.replace(/[_*`\[\]()]/g, '\\$&')})` : "(yo'q)";
            msg += `• ${firstName} ${username} - ID: \`${u.telegram_id}\`\n`;
            inlineKeyboard.push([Markup.button.callback(`👤 ${u.first_name} ni boshqarish`, `manage_user_${u.telegram_id}`)]);
        });

        if (users.length === 0) {
            msg = " Foydalanuvchilar topilmadi.";
        }

        if (ctx.callbackQuery) {
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(inlineKeyboard) }).catch(e => {
                console.error('Error editing message in handleUsers:', e);
                ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(inlineKeyboard));
            });
            try {
                await ctx.answerCbQuery();
            } catch (e) {}
        } else {
            await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(inlineKeyboard)).catch(e => {
                console.error('Error replying in handleUsers:', e);
                ctx.reply(msg.replace(/[*_`]/g, ''));
            });
        }
    }

    async handleBroadcastRequest(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        ctx.session.state = 'waiting_for_broadcast_message';
        await ctx.reply('📢 Barcha foydalanuvchilarga yuboriladigan xabarni yuboring.\n\nSiz matn, rasm, video yoki audio yuborishingiz mumkin. Media xabarlarning tagidagi izohi (caption) ham birga yuboriladi.', Markup.keyboard([['❌ Bekor qilish']]).resize());
    }

    async handleBroadcast(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const messageText = ctx.message.text || ctx.message.caption || '';

        if (messageText === '❌ Bekor qilish') {
            ctx.session.state = null;
            return ctx.reply('Bekor qilindi.', this.adminMenu);
        }

        const users = await database.getAllUsers();
        await ctx.reply(`Xabar ${users.length} ta foydalanuvchiga yuborilmoqda...`);
        
        ctx.session.state = null;
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                // copyMessage copies the original message with all its properties (caption, entities, etc.)
                await ctx.telegram.copyMessage(user.telegram_id, ctx.chat.id, ctx.message.message_id);
                successCount++;
                // Add small delay to avoid hitting rate limits (30 messages per second is Telegram's limit)
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error(`Broadcast failed for ${user.telegram_id}:`, error.message);
                // If user blocked the bot, we could potentially deactivate them in DB here
                failCount++;
            }
        }

        await ctx.reply(`✅ E'lon yakunlandi!\n\n Muvaffaqiyatli: ${successCount}\n Xatolik: ${failCount}`, this.adminMenu);
    }

    async handleManageUser(ctx) {
        try {
            const isAdmin = await database.isAdmin(ctx.from.id);
            if (!isAdmin) return;

            const targetId = ctx.match[1];
            const user = await database.getUserByTelegramId(targetId);

            if (!user) {
                return ctx.answerCbQuery('Foydalanuvchi topilmadi.', { show_alert: true });
            }

            const isTeacher = user.is_teacher === 1;
            const firstName = (user.first_name || 'Foydalanuvchi').replace(/[_*`\[\]()]/g, '\\$&');
            
            const msg = `👤 *Foydalanuvchini boshqarish:*\n\n` +
                `Ism: ${firstName}\n` +
                `ID: \`${user.telegram_id}\`\n` +
                `Rol: ${user.is_admin ? 'Admin' : (isTeacher ? 'O\'qituvchi' : 'Talaba')}\n` +
                `Limit: ${user.daily_limit}`;

            const buttons = [
                [Markup.button.callback(isTeacher ? '❌ O\'qituvchilikdan olish' : '👨‍🏫 O\'qituvchi etib tayinlash', `toggle_teacher_${targetId}_${isTeacher ? 0 : 1}`)],
                [Markup.button.callback('➕ Limit qo\'shish (+3)', `add_limit_${targetId}_3`)],
                [Markup.button.callback('🔙 Orqaga', 'admin_users_list')]
            ];

            await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }).catch(async (e) => {
                console.error('Error editing message in handleManageUser:', e);
                await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
            });
            
            await ctx.answerCbQuery().catch(() => {});
        } catch (error) {
            console.error('Error in handleManageUser:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.', { show_alert: true }).catch(() => {});
        }
    }

    async handleToggleTeacher(ctx) {
        try {
            const isAdmin = await database.isAdmin(ctx.from.id);
            if (!isAdmin) return;

            const [_, targetId, status] = ctx.match;
            const isTeacher = status === '1';

            await database.setTeacher(targetId, isTeacher);
            
            await ctx.answerCbQuery(isTeacher ? 'O\'qituvchi etib tayinlandi!' : 'O\'qituvchilikdan olindi!');
            return this.handleManageUser(ctx);
        } catch (error) {
            console.error('Error in handleToggleTeacher:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.', { show_alert: true }).catch(() => {});
        }
    }

    async handleAddLimit(ctx) {
        try {
            const isAdmin = await database.isAdmin(ctx.from.id);
            if (!isAdmin) return;

            const [_, targetId, amount] = ctx.match;
            
            const user = await database.getUserByTelegramId(targetId);

            if (user) {
                const newLimit = user.daily_limit + parseInt(amount);
                await database.updateUserLimit(targetId, newLimit);
                await ctx.answerCbQuery(`Limit ${newLimit} ga oshirildi!`);
                return this.handleManageUser(ctx);
            }
            await ctx.answerCbQuery('Foydalanuvchi topilmadi.', { show_alert: true });
        } catch (error) {
            console.error('Error in handleAddLimit:', error);
            await ctx.answerCbQuery('Xatolik yuz berdi.', { show_alert: true }).catch(() => {});
        }
    }

    async handleAddTestWord(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        ctx.session = ctx.session || {};
        ctx.session.state = 'waiting_for_new_test_word';
        await ctx.reply('➕ Yangi test so\'zini yuboring:');
    }

    async handleTestWord(ctx) {
        return this.handleAddTestWord(ctx);
    }

    async handleAdminStats(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        const stats = await new Promise((resolve) => {
            database.db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM assessments) as total_assessments,
                    (SELECT COUNT(*) FROM test_words) as total_words
            `, (err, row) => resolve(row));
        });

        const msg = `📊 *Umumiy statistika:*\n\n` +
            `👥 Jami foydalanuvchilar: ${stats.total_users}\n` +
            `📝 Jami tahlillar: ${stats.total_assessments}\n` +
            `🎯 Jami test so'zlari: ${stats.total_words}`;

        await ctx.replyWithMarkdown(msg);
    }

    async handleAdminStatsOnly(ctx) {
        return this.handleAdminStats(ctx);
    }

    async handleLimitInfo(ctx) {
        const user = await database.getUserByTelegramId(ctx.from.id);
        const referralInfo = await database.getReferralInfo(ctx.from.id);
        
        let msg = `📊 *Sizning limitingiz:*\n\n`;
        
        if (user.is_premium) {
            const until = new Date(user.premium_until).toLocaleDateString();
            msg += `💎 *Premium:* Faol\n`;
            msg += `📅 Muddat: ${until} gacha\n`;
        } else {
            msg += `🆓 *Tarif:* Bepul\n`;
        }

        msg += `✅ Kunlik: ${user.used_today} / ${user.daily_limit}\n`;
        msg += `🎁 Bonus: ${referralInfo.bonus_limit}\n\n`;
        
        if (user.used_today >= user.daily_limit && referralInfo.bonus_limit <= 0) {
            msg += `⚠️ Bugungi limitingiz tugadi. \n`;
            if (!user.is_premium) {
                msg += `Premium sotib olish uchun '💎 Premium' bo'limiga kiring yoki do'stlaringizni taklif qiling.`;
            } else {
                msg += `Ertaga limitingiz yangilanadi.`;
            }
        }

        await ctx.replyWithMarkdown(msg);
    }

    async handleUserResults(ctx) {
        const isTeacher = await database.isTeacher(ctx.from.id);
        if (!isTeacher) return;

        database.db.all(`
            SELECT u.first_name, a.type, a.overall_score, a.created_at 
            FROM assessments a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC LIMIT 10
        `, (err, rows) => {
            if (err || !rows) return ctx.reply('Natijalarni yuklashda xato.');
            
            let msg = `📋 *Oxirgi 10 ta natija:*\n\n`;
            rows.forEach(r => {
                msg += `• ${r.first_name} | ${r.type} | Ball: ${r.overall_score}\n`;
            });
            ctx.replyWithMarkdown(msg);
        });
    }

    async handleHelp(ctx) {
        const helpMessage = `🤖 *Botdan qanday foydalanish mumkin?*\n\n` +
            `1️⃣ *Talaffuzni test qilish* - Bot so'z beradi, siz o'qiysiz.\n` +
            `2️⃣ *Matn va Audio* - Siz matn yozasiz, keyin o'qiysiz.\n` +
            `3️⃣ *Matnni audyoga* - Siz matn yozasiz, bot uni o'qib beradi.\n\n` +
            `📊 Natijalar Gemini AI orqali tahlil qilinadi.`;
        
        await ctx.replyWithMarkdown(helpMessage);
    }

    async handlePremium(ctx) {
        const tariffs = await database.getTariffs();
        const cardNum = await database.getSetting('card_number');
        const cardHolder = await database.getSetting('card_holder') || '';

        if (tariffs.length === 0) {
            return ctx.reply("⚠️ Hozirda faol tariflar mavjud emas. Iltimos, keyinroq urinib ko'ring.");
        }

        let msg = `💎 *Premium Obuna Bo'lish*\n\n`;
        msg += `Premium obuna bilan siz kunlik limitlarni oshirishingiz va botning barcha imkoniyatlaridan cheklovsiz foydalanishingiz mumkin.\n\n`;
        msg += `📋 *Tariflar:*\n`;
        
        const buttons = tariffs.map(t => [Markup.button.callback(`${t.name} - ${t.price.toLocaleString()} so'm`, `select_tariff_${t.id}`)]);
        
        tariffs.forEach(t => {
            msg += `• *${t.name}*: ${t.price.toLocaleString()} so'm / ${t.duration_days} kun (${t.limit_per_day} limit/kun)\n`;
        });

        msg += `\n💳 *To'lov usuli:*\n`;
        if (cardNum) {
            msg += `Karta: \`${cardNum}\`\n`;
            if (cardHolder) msg += `Ega: ${cardHolder}\n`;
        } else {
            msg += `_Karta ma'lumotlari hali qo'shilmagan._\n`;
        }

        msg += `\n📝 *Qo'llanma:*\n`;
        msg += `1. O'zingizga ma'qul tarifni tanlang.\n`;
        msg += `2. Yuqoridagi kartaga tarif narxini o'tkazing.\n`;
        msg += `3. To'lov chekini (rasm) va ma'lumotlaringizni botga yuboring.\n`;
        msg += `4. Admin tasdiqlaganidan so'ng Premium faollashadi.`;

        const keyboard = Markup.inlineKeyboard(buttons);
        
        if (ctx.callbackQuery) {
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
            await ctx.answerCbQuery();
        } else {
            await ctx.replyWithMarkdown(msg, keyboard);
        }
    }

    async handleSelectTariff(ctx) {
        const tariffId = ctx.match[1];
        const tariffs = await database.getTariffs();
        const tariff = tariffs.find(t => t.id == tariffId);

        if (!tariff) return ctx.answerCbQuery("Tarif topilmadi.");

        ctx.session.selectedTariff = tariff;
        ctx.session.state = 'waiting_for_payment_details';

        await ctx.reply(`✅ Siz *${tariff.name}* tarifini tanladingiz.\n\n` +
            `Iltimos, endi to'lov chekini (rasm/screenshot) yuboring.\n` +
            `Rasm bilan birga izohda quyidagilarni yozing:\n` +
            `1. Ism va familiyangiz\n` +
            `2. Qaysi kartadan pul o'tkazilgani (oxirgi 4 raqami)`, { parse_mode: 'Markdown' });
        
        await ctx.answerCbQuery();
    }

    // --- Admin Settings ---
    async handleCardSettings(ctx) {
        try {
            const isAdmin = await database.isAdmin(ctx.from.id);
            if (!isAdmin) return;

            const cardNum = await database.getSetting('card_number');
            const cardHolder = await database.getSetting('card_holder');

            let msg = `💳 *Karta Sozlamalari*\n\n`;
            msg += `Hozirgi karta: \`${cardNum || 'yo\'q'}\`\n`;
            msg += `Karta egasi: \`${cardHolder || 'yo\'q'}\`\n\n`;
            msg += `O'zgartirish uchun quyidagi tugmani bosing:`;

            const buttons = [
                [Markup.button.callback('✏️ Kartani o\'zgartirish', 'admin_set_card')],
                [Markup.button.callback('🔙 Orqaga', 'admin_panel_main')]
            ];

            if (ctx.callbackQuery) {
                await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }).catch(() => {});
            } else {
                await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
            }
        } catch (error) {
            console.error('Error in handleCardSettings:', error);
            await ctx.reply('Xatolik yuz berdi.');
        }
    }

    async handleSetCardRequest(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        ctx.session.state = 'waiting_for_card_info';
        await ctx.reply('💳 Yangi karta ma\'lumotlarini quyidagi formatda yuboring:\n\n`KARTA_RAKAMI KARTA_EGASI`\n\nMisol: `8600123456789012 Eshmat Toshmatov`\n\nBekor qilish uchun /cancel deb yozing.', { parse_mode: 'Markdown' });
        if (ctx.callbackQuery) await ctx.answerCbQuery();
    }

    async handleSetCard(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const text = ctx.message.text;
        if (text === '/cancel') {
            ctx.session.state = null;
            return ctx.reply('Bekor qilindi.', this.adminMenu);
        }

        const parts = text.split(' ');
        if (parts.length < 2) return ctx.reply("❌ Format noto'g'ri. Iltimos, karta raqami va egasini yozing. Misol: `8600123456789012 Eshmat Toshmatov`", { parse_mode: 'Markdown' });

        const cardNum = parts[0];
        const cardHolder = parts.slice(1).join(' ');

        await database.setSetting('card_number', cardNum);
        await database.setSetting('card_holder', cardHolder);

        ctx.session.state = null;
        await ctx.reply(`✅ Karta muvaffaqiyatli saqlandi:\n\n💳 Karta: \`${cardNum}\`\n👤 Ega: \`${cardHolder}\``, { parse_mode: 'Markdown', ...this.adminMenu });
    }

    async handleTariffSettings(ctx) {
        try {
            const isAdmin = await database.isAdmin(ctx.from.id);
            if (!isAdmin) return;

            const tariffs = await database.getTariffs();

            let msg = `💰 *Tariflar Sozlamalari*\n\n`;
            const buttons = [];

            if (tariffs.length === 0) {
                msg += "_Hozircha tariflar yo'q._\n";
            } else {
                tariffs.forEach(t => {
                    msg += `• *${t.name}*: ${t.price.toLocaleString()} so'm / ${t.duration_days} kun (${t.limit_per_day} ta/kun)\n`;
                    buttons.push([Markup.button.callback(`❌ O'chirish: ${t.name}`, `delete_tariff_${t.id}`)]);
                });
            }

            msg += `\nYangisini qo'shish uchun tugmani bosing:`;
            buttons.push([Markup.button.callback('➕ Yangi tarif qo\'shish', 'admin_add_tariff')]);
            buttons.push([Markup.button.callback('🔙 Orqaga', 'admin_panel_main')]);

            if (ctx.callbackQuery) {
                await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }).catch(() => {});
                await ctx.answerCbQuery();
            } else {
                await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
            }
        } catch (error) {
            console.error('Error in handleTariffSettings:', error);
            await ctx.reply('Xatolik yuz berdi.');
        }
    }

    async handleAddTariffRequest(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        ctx.session.state = 'waiting_for_tariff_info';
        await ctx.reply('💰 Yangi tarif ma\'lumotlarini quyidagi formatda yuboring:\n\n`NOM NARX KUN LIMIT`\n\nMisol: `Premium 50000 30 50`\n\nBekor qilish uchun /cancel deb yozing.', { parse_mode: 'Markdown' });
        if (ctx.callbackQuery) await ctx.answerCbQuery();
    }

    async handleAddTariff(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const text = ctx.message.text;
        if (text === '/cancel') {
            ctx.session.state = null;
            return ctx.reply('Bekor qilindi.', this.adminMenu);
        }

        const parts = text.split(' ');
        if (parts.length < 4) return ctx.reply("❌ Format noto'g'ri. Misol: `Standard 50000 30 50`", { parse_mode: 'Markdown' });

        const name = parts[0];
        const price = parseInt(parts[1]);
        const duration = parseInt(parts[2]);
        const limit = parseInt(parts[3]);

        if (isNaN(price) || isNaN(duration) || isNaN(limit)) {
            return ctx.reply("❌ Narx, kun va limit son bo'lishi kerak.");
        }

        await database.addTariff(name, price, duration, limit);
        ctx.session.state = null;
        await ctx.reply(`✅ Yangi tarif qo'shildi: *${name}*`, { parse_mode: 'Markdown', ...this.adminMenu });
    }

    async handleDeleteTariff(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const id = ctx.match[1];
        await database.deleteTariff(id);
        await ctx.answerCbQuery("Tarif o'chirildi.");
        await this.handleTariffSettings(ctx);
    }

    async handlePaymentRequests(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const payments = await database.getPendingPayments();

        if (payments.length === 0) {
            return ctx.reply("📩 Hozirda yangi to'lov so'rovlari yo'q.");
        }

        for (const p of payments) {
            let msg = `📩 *Yangi To'lov So'rovi (ID: ${p.id})*\n\n`;
            msg += `👤 Foydalanuvchi: ${p.first_name} (@${p.username || 'yo\'q'})\n`;
            msg += `💎 Tarif: ${p.tariff_name} (${p.price.toLocaleString()} so'm)\n`;
            msg += `📝 Tafsilotlar: ${p.payment_details}\n`;
            msg += `📅 Sana: ${p.created_at}`;

            const buttons = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Tasdiqlash', `approve_payment_${p.id}`)],
                [Markup.button.callback('❌ Rad etish', `reject_payment_${p.id}`)]
            ]);

            await ctx.replyWithPhoto(p.photo_file_id, { caption: msg, parse_mode: 'Markdown', ...buttons });
        }
    }

    async handleApprovePayment(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const paymentId = ctx.match[1];
        const payment = await database.getPaymentById(paymentId);

        if (!payment) return ctx.answerCbQuery("To'lov topilmadi.");

        await database.updatePaymentStatus(paymentId, 'approved');
        await database.approvePremium(payment.user_id, payment.duration_days, payment.limit_per_day);

        await ctx.answerCbQuery("✅ To'lov tasdiqlandi!");
        await ctx.editMessageCaption(`✅ *To'lov tasdiqlandi (ID: ${paymentId})*`, { parse_mode: 'Markdown' });

        // Notify user
        try {
            await ctx.telegram.sendMessage(payment.telegram_id, 
                `🎉 *Tabriklaymiz!* Sizning to'lovingiz tasdiqlandi.\n\n` +
                `💎 Premium obuna faollashdi!\n` +
                `📅 Amal qilish muddati: ${payment.duration_days} kun\n` +
                `🚀 Kunlik limitingiz: ${payment.limit_per_day} taga oshirildi.`, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Notify user error:', e);
        }
    }

    async handleRejectPayment(ctx) {
        const isAdmin = await database.isAdmin(ctx.from.id);
        if (!isAdmin) return;

        const paymentId = ctx.match[1];
        const payment = await database.getPaymentById(paymentId);

        if (!payment) return ctx.answerCbQuery("To'lov topilmadi.");

        await database.updatePaymentStatus(paymentId, 'rejected');

        await ctx.answerCbQuery("❌ To'lov rad etildi.");
        await ctx.editMessageCaption(`❌ *To'lov rad etildi (ID: ${paymentId})*`, { parse_mode: 'Markdown' });

        // Notify user
        try {
            await ctx.telegram.sendMessage(payment.telegram_id, 
                `❌ Kechirasiz, sizning to'lovingiz rad etildi.\n` +
                `Iltimos, ma'lumotlarni qaytadan tekshirib ko'ring yoki admin bilan bog'laning.`, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Notify user error:', e);
        }
    }

    async handleReferral(ctx) {
        const userId = ctx.from.id;
        const botUsername = ctx.botInfo.username;
        const referralLink = `https://t.me/${botUsername}?start=${userId}`;
        
        const referralInfo = await database.getReferralInfo(userId);
        const count = referralInfo.referral_count;
        const bonusLimit = referralInfo.bonus_limit;
        
        const nextReward = 3 - (count % 3);
        
        let msg = `🔗 *Sizning referal havolangiz:*\n\n` +
            `\`${referralLink}\`\n\n` +
            `👥 Taklif qilingan do'stlar: *${count}* ta\n` +
            `🎁 To'plangan bonus limitlar: *${bonusLimit}* ta\n\n` +
            `⭐ *Bonus tizimi:*\n` +
            `Har 3 ta taklif qilingan do'stingiz uchun sizga *+3 ta bonus limit* beriladi!\n\n` +
            `💡 Bonus limitlar kunlik limitingiz tugaganda avtomatik ishlatiladi va ular hech qachon yo'qolmaydi.\n\n`;
            
        if (nextReward === 3 && count > 0) {
            msg += `✅ Tabriklaymiz! Oxirgi 3 ta taklif uchun bonus oldingiz.`;
        } else {
            msg += `⏳ Keyingi bonusgaacha yana *${nextReward}* ta do'stingizni taklif qilishingiz kerak.`;
        }

        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Ingliz tili talaffuzini Gemini AI yordamida bepul tahlil qiling! 🚀")}`;

        await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard([
            [Markup.button.url('📤 Do\'stlarga ulashish', shareLink)]
        ]));
    }

    async handleStats(ctx) {
        try {
            const stats = await assessmentService.getUserStats(ctx.from.id);
            
            if (!stats) {
                await ctx.reply("Siz hali audio yubormagansiz. Iltimos, birinchi bo'lib audio yuboring!");
                return;
            }
            
            const statsMessage = `📈 *Sizning umumiy statistikangiz*\n\n` +
                `📊 Jami tahlillar: ${stats.total_assessments}\n` +
                `⭐ O'rtacha umumiy ball: ${Math.round(stats.avg_overall)}/100\n` +
                `🎯 O'rtacha aniqlik: ${Math.round(stats.avg_accuracy)}/100\n` +
                `🗣 O'rtacha ravonlik: ${Math.round(stats.avg_fluency)}/100`;
            
            await ctx.replyWithMarkdown(statsMessage);
            
        } catch (error) {
            console.error('Stats command error:', error);
            await ctx.reply("Kechirasiz, statistikani olishda xatolik yuz berdi.");
        }
    }

    async handleDownloadPdfReport(ctx) {
        try {
            const data = ctx.session?.lastAssessmentData;
            const type = ctx.session?.lastAssessmentType || 'general';

            if (!data) {
                return ctx.answerCbQuery('⚠️ Ma\'lumot topilmadi. Iltimos, qaytadan tahlil qiling.', { show_alert: true });
            }

            await ctx.answerCbQuery('PDF tayyorlanmoqda... ⏳');
            const pdfPath = await pdfService.generateReport(ctx.from, data, type);

            await ctx.replyWithDocument({ source: pdfPath, filename: `Talaffuz_Tahlili_${ctx.from.id}.pdf` });

            // Cleanup
            await pdfService.cleanup(pdfPath);
        } catch (error) {
            console.error('PDF generation error:', error);
            await ctx.reply('PDF yaratishda xatolik yuz berdi.');
        }
    }

    async handlePlayCorrect(ctx) {
        try {
            const data = ctx.session?.lastAssessmentData;
            const type = ctx.session?.lastAssessmentType;
            
            if (!data || !data.transcription) {
                return ctx.answerCbQuery("⚠️ Ma'lumot topilmadi.", { show_alert: true });
            }

            await ctx.answerCbQuery("Audio tayyorlanmoqda... ⏳");
            
            const textToRead = data.targetText || data.transcription;
            const audioPath = await ttsService.generateAudio(textToRead, 'en');
            
            await ctx.reply(`🔊 *To'g'ri talaffuz:*\n\n_"${textToRead}"_`, { parse_mode: 'Markdown' });
            await ctx.replyWithAudio({ source: audioPath });
            
            await ttsService.cleanup(audioPath);
        } catch (error) {
            console.error('Play Correct Error:', error);
            await ctx.reply("Audioni yaratishda xatolik yuz berdi.");
        }
    }
}

module.exports = new CommandHandler();
