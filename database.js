const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'bot.db'), (err) => {
            if (err) {
                console.error('Database connection error:', err);
            } else {
                console.log('Connected to SQLite database');
                this.initializeTables();
            }
        });
    }

    initializeTables() {
        const tableQueries = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT,
                is_admin INTEGER DEFAULT 0,
                is_teacher INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                premium_until DATETIME,
                daily_limit INTEGER DEFAULT 10,
                used_today INTEGER DEFAULT 0,
                bonus_limit INTEGER DEFAULT 0,
                tts_voice TEXT DEFAULT 'en-US-AriaNeural',
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                referred_by INTEGER,
                referral_count INTEGER DEFAULT 0
            )`,
            
            `CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                audio_duration REAL,
                overall_score REAL,
                accuracy_score REAL,
                fluency_score REAL,
                completeness_score REAL,
                prosody_score REAL,
                word_accuracy REAL,
                transcription TEXT,
                target_text TEXT,
                feedback TEXT,
                english_level TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            `CREATE TABLE IF NOT EXISTS test_words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT UNIQUE,
                difficulty TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS tariffs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                price INTEGER,
                duration_days INTEGER,
                limit_per_day INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                tariff_id INTEGER,
                photo_file_id TEXT,
                payment_details TEXT,
                status TEXT DEFAULT 'pending', -- pending, approved, rejected
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (tariff_id) REFERENCES tariffs (id)
            )`,

            `CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`
        ];

        // Column check and migration
        const migrationQueries = [
            // Users table columns
            { table: 'users', column: 'is_premium', type: 'INTEGER DEFAULT 0' },
            { table: 'users', column: 'premium_until', type: 'DATETIME' },
            { table: 'users', column: 'is_admin', type: 'INTEGER DEFAULT 0' },
            { table: 'users', column: 'is_teacher', type: 'INTEGER DEFAULT 0' },
            { table: 'users', column: 'daily_limit', type: 'INTEGER DEFAULT 10' },
            { table: 'users', column: 'used_today', type: 'INTEGER DEFAULT 0' },
            { table: 'users', column: 'bonus_limit', type: 'INTEGER DEFAULT 0' },
            { table: 'users', column: 'tts_voice', type: "TEXT DEFAULT 'en-US-AriaNeural'" },
            { table: 'users', column: 'last_active', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
            { table: 'users', column: 'referred_by', type: 'INTEGER' },
            { table: 'users', column: 'referral_count', type: 'INTEGER DEFAULT 0' },
            // Assessments table columns
            { table: 'assessments', column: 'type', type: 'TEXT' },
            { table: 'assessments', column: 'word_accuracy', type: 'REAL' },
            { table: 'assessments', column: 'target_text', type: 'TEXT' }
        ];

        // 1. Create tables
        tableQueries.forEach(query => {
            this.db.run(query, (err) => {
                if (err) console.error('Table creation error:', err);
            });
        });

        // 2. Add missing columns
        migrationQueries.forEach(m => {
            this.db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes('duplicate column name')) {
                    // We don't log "duplicate column" errors to keep console clean
                    // but we can log other migration errors if needed
                }
            });
        });
    }

    async getUserLimitInfo(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT used_today, daily_limit, bonus_limit FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row || { used_today: 0, daily_limit: 10, bonus_limit: 0 });
            });
        });
    }

    async getUserVoice(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT tts_voice FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.tts_voice : 'en-US-AriaNeural');
            });
        });
    }

    async setUserVoice(telegramId, voice) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE users SET tts_voice = ? WHERE telegram_id = ?', [voice, telegramId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async isAdmin(telegramId) {
        // First check .env ADMIN_ID
        if (config.ADMIN_ID && String(telegramId) === String(config.ADMIN_ID)) {
            return true;
        }
        return new Promise((resolve, reject) => {
            this.db.get('SELECT is_admin FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.is_admin === 1 : false);
            });
        });
    }

    async isTeacher(telegramId) {
        // Admins are also considered teachers
        const adminStatus = await this.isAdmin(telegramId);
        if (adminStatus) return true;

        return new Promise((resolve, reject) => {
            this.db.get('SELECT is_teacher FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.is_teacher === 1 : false);
            });
        });
    }

    async setTeacher(telegramId, isTeacher) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE users SET is_teacher = ? WHERE telegram_id = ?', [isTeacher ? 1 : 0, telegramId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async setAdmin(telegramId, isAdmin) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE users SET is_admin = ? WHERE telegram_id = ?', [isAdmin ? 1 : 0, telegramId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getAdminCount() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    async checkLimit(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT used_today, daily_limit, bonus_limit, last_active FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else {
                    if (!row) return resolve(true);
                    
                    const lastActive = new Date(row.last_active);
                    const today = new Date();
                    
                    // If last active was not today, reset used_today
                    if (lastActive.toDateString() !== today.toDateString()) {
                        this.db.run('UPDATE users SET used_today = 0 WHERE telegram_id = ?', [telegramId], (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        });
                    } else {
                        // Check if daily limit or bonus limit is available
                        const hasDailyLimit = row.used_today < row.daily_limit;
                        const hasBonusLimit = row.bonus_limit > 0;
                        resolve(hasDailyLimit || hasBonusLimit);
                    }
                }
            });
        });
    }

    async incrementUsage(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT used_today, daily_limit, bonus_limit FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve();

                if (row.used_today < row.daily_limit) {
                    // Use daily limit
                    this.db.run('UPDATE users SET used_today = used_today + 1, last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                } else if (row.bonus_limit > 0) {
                    // Use bonus limit
                    this.db.run('UPDATE users SET bonus_limit = bonus_limit - 1, last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    async addTestWord(word, difficulty = 'medium') {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT OR IGNORE INTO test_words (word, difficulty) VALUES (?, ?)', [word, difficulty], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async getRandomTestWord() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM test_words ORDER BY RANDOM() LIMIT 1', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getRecentTestWords(limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM test_words ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async deleteTestWord(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM test_words WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM users ORDER BY last_active DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async updateUserLimit(telegramId, limit) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE users SET daily_limit = ? WHERE telegram_id = ?', [limit, telegramId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getUserByTelegramId(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async saveUser(userData, referrerId = null) {
        return new Promise((resolve, reject) => {
            // Check if user exists first to preserve existing data like tts_voice and limits
            this.db.get('SELECT id, referred_by FROM users WHERE telegram_id = ?', [userData.id], (err, row) => {
                if (err) return reject(err);
                
                if (row) {
                    // Update existing user
                    const query = `
                        UPDATE users 
                        SET username = ?, first_name = ?, last_name = ?, language_code = ?, last_active = CURRENT_TIMESTAMP
                        WHERE telegram_id = ?
                    `;
                    this.db.run(query, [
                        userData.username,
                        userData.first_name,
                        userData.last_name,
                        userData.language_code,
                        userData.id
                    ], function(err) {
                        if (err) reject(err);
                        else resolve(row.id);
                    });
                } else {
                    // Insert new user
                    const query = `
                        INSERT INTO users 
                        (telegram_id, username, first_name, last_name, language_code, referred_by) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    this.db.run(query, [
                        userData.id,
                        userData.username,
                        userData.first_name,
                        userData.last_name,
                        userData.language_code,
                        referrerId
                    ], async (err) => {
                        if (err) return reject(err);
                        
                        const newUserId = this.lastID;

                        // If there's a referrer, update their count and check for reward
                        if (referrerId && String(referrerId) !== String(userData.id)) {
                            // Anti-cheat: Check if referrer exists
                            this.db.get('SELECT id FROM users WHERE telegram_id = ?', [referrerId], async (err, referrerRow) => {
                                if (!err && referrerRow) {
                                    try {
                                        await this.handleReferralReward(referrerId);
                                    } catch (error) {
                                        console.error('Referral reward error:', error);
                                    }
                                }
                            });
                        }
                        
                        resolve(newUserId);
                    });
                }
            });
        });
    }

    async handleReferralReward(referrerId) {
        return new Promise((resolve, reject) => {
            // 1. Increment referral count
            this.db.run('UPDATE users SET referral_count = referral_count + 1 WHERE telegram_id = ?', [referrerId], (err) => {
                if (err) return reject(err);

                // 2. Check if count is a multiple of 3
                this.db.get('SELECT referral_count FROM users WHERE telegram_id = ?', [referrerId], (err, row) => {
                    if (err) return reject(err);
                    
                    if (row && row.referral_count > 0 && row.referral_count % 3 === 0) {
                        // 3. Add 3 to bonus_limit (one-time bonus that doesn't reset)
                        this.db.run('UPDATE users SET bonus_limit = bonus_limit + 3 WHERE telegram_id = ?', [referrerId], (err) => {
                            if (err) return reject(err);
                            resolve(true); // Reward given
                        });
                    } else {
                        resolve(false); // No reward yet
                    }
                });
            });
        });
    }

    async getReferralInfo(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT referral_count, daily_limit, bonus_limit FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row || { referral_count: 0, daily_limit: 10, bonus_limit: 0 });
            });
        });
    }

    // --- Settings Management ---
    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)', [key, value], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT value FROM bot_settings WHERE key = ?', [key], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.value : null);
            });
        });
    }

    // --- Tariff Management ---
    async addTariff(name, price, duration, limit) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO tariffs (name, price, duration_days, limit_per_day) VALUES (?, ?, ?, ?)', 
                [name, price, duration, limit], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    async getTariffs() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM tariffs ORDER BY price ASC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async deleteTariff(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM tariffs WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    // --- Payment Management ---
    async createPaymentRequest(userId, tariffId, photoFileId, details) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO payments (user_id, tariff_id, photo_file_id, payment_details) VALUES (?, ?, ?, ?)',
                [userId, tariffId, photoFileId, details], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async getPendingPayments() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, u.first_name, u.username, t.name as tariff_name, t.price 
                FROM payments p 
                JOIN users u ON p.user_id = u.id 
                JOIN tariffs t ON p.tariff_id = t.id 
                WHERE p.status = 'pending'
            `;
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async getPaymentById(id) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, u.telegram_id, t.duration_days, t.limit_per_day 
                FROM payments p 
                JOIN users u ON p.user_id = u.id 
                JOIN tariffs t ON p.tariff_id = t.id 
                WHERE p.id = ?
            `;
            this.db.get(query, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updatePaymentStatus(id, status) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE payments SET status = ? WHERE id = ?', [status, id], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    async approvePremium(userId, days, dailyLimit) {
        return new Promise((resolve, reject) => {
            const until = new Date();
            until.setDate(until.getDate() + days);
            const untilStr = until.toISOString();

            this.db.run('UPDATE users SET is_premium = 1, premium_until = ?, daily_limit = ? WHERE id = ?',
                [untilStr, dailyLimit, userId], (err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    async checkPremiumStatus(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT is_premium, premium_until FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else {
                    if (!row || !row.is_premium) return resolve(false);
                    
                    const until = new Date(row.premium_until);
                    if (until < new Date()) {
                        // Premium expired
                        this.db.run('UPDATE users SET is_premium = 0, daily_limit = 10 WHERE telegram_id = ?', [telegramId]);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
            });
        });
    }

    async getAdmins() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT telegram_id FROM users WHERE is_admin = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async saveAssessment(userId, assessmentData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO assessments 
                (user_id, type, audio_duration, overall_score, accuracy_score, 
                 fluency_score, completeness_score, prosody_score, word_accuracy, 
                 transcription, target_text, feedback, english_level) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                userId,
                assessmentData.type || 'general',
                assessmentData.audioDuration,
                assessmentData.overallScore || 0,
                assessmentData.accuracyScore || 0,
                assessmentData.fluencyScore || 0,
                assessmentData.completenessScore || 0,
                assessmentData.prosodyScore || 0,
                assessmentData.wordAccuracy || 0,
                assessmentData.transcription || '',
                assessmentData.target_text || '',
                assessmentData.feedback || '',
                assessmentData.englishLevel || ''
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async getLastAssessment(telegramId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT a.* FROM assessments a
                JOIN users u ON a.user_id = u.id
                WHERE u.telegram_id = ?
                ORDER BY a.created_at DESC
                LIMIT 1
            `;
            
            this.db.get(query, [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getUserStats(telegramId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_assessments,
                    AVG(overall_score) as avg_overall,
                    AVG(accuracy_score) as avg_accuracy,
                    AVG(fluency_score) as avg_fluency
                FROM assessments a
                JOIN users u ON a.user_id = u.id
                WHERE u.telegram_id = ?
                GROUP BY u.id
            `;
            
            this.db.get(query, [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}

module.exports = new Database();
