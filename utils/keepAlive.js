const axios = require('axios');
const config = require('../config');

/**
 * Initializes the self-pinging mechanism to keep the server awake.
 * @param {string} url - The URL to ping. If not provided, uses config.APP_URL.
 * @param {number} intervalMinutes - Interval in minutes. Default is 5.
 */
function startKeepAlive(url = null, intervalMinutes = 5) {
    const pingUrl = url || config.APP_URL;
    
    if (!pingUrl) {
        console.warn('⚠️ Keep-alive: APP_URL is not defined in config. Skipping self-ping.');
        return;
    }

    // Ensure URL is absolute
    const targetUrl = pingUrl.startsWith('http') ? pingUrl : `https://${pingUrl}`;
    const finalPingUrl = `${targetUrl.replace(/\/$/, '')}/ping`;

    console.log(`🚀 Keep-alive tizimi ishga tushdi: ${finalPingUrl}`);
    console.log(`⏱️ Interval: ${intervalMinutes} daqiqa`);

    const performPing = async () => {
        try {
            const startTime = Date.now();
            const response = await axios.get(finalPingUrl, {
                timeout: 10000,
                headers: { 'User-Agent': 'RavonAiKeepAlive/1.0' }
            });
            const duration = Date.now() - startTime;
            
            if (response.status === 200) {
                console.log(`✅ [${new Date().toLocaleTimeString()}] Self-ping muvaffaqiyatli: ${response.status} (${duration}ms)`);
            } else {
                console.warn(`⚠️ [${new Date().toLocaleTimeString()}] Self-ping status: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ [${new Date().toLocaleTimeString()}] Self-ping xatosi: ${error.message}`);
            
            // If it's a 404, maybe the /ping route isn't set up yet or path is wrong
            if (error.response?.status === 404) {
                console.error('   Maslahat: /ping endpointi mavjudligini tekshiring.');
            }
        }
    };

    // Initial ping after 30 seconds to let the server fully start
    setTimeout(performPing, 30000);

    // Regular interval
    const interval = setInterval(performPing, intervalMinutes * 60 * 1000);

    // Graceful cleanup
    process.on('shutdown', () => {
        clearInterval(interval);
        console.log('🛑 Keep-alive to\'xtatildi.');
    });

    return interval;
}

module.exports = { startKeepAlive };
