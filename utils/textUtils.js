/**
 * Count words in text
 * @param {string} text - Input text
 * @returns {number} - Word count
 */
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Remove extra whitespace and split by spaces
    const words = text.trim().split(/\s+/);
    
    // Filter out empty strings
    return words.filter(word => word.length > 0).length;
}

/**
 * Check if text exceeds word limit
 * @param {string} text - Input text
 * @param {number} limit - Word limit
 * @returns {boolean} - True if exceeds limit
 */
function exceedsWordLimit(text, limit) {
    return countWords(text) > limit;
}

/**
 * Get word limit info for user
 * @param {Object} user - User object from database
 * @returns {Object} - Word limit info
 */
function getUserWordLimit(user) {
    const defaultLimits = {
        free: 30,
        basic: 70,
        standard: 200,
        premium: 500
    };
    
    // If user has custom word_limit, use it
    if (user.word_limit) {
        return {
            limit: user.word_limit,
            type: 'custom'
        };
    }
    
    // Otherwise use default based on plan
    if (user.is_premium) {
        return {
            limit: defaultLimits.premium,
            type: 'premium'
        };
    }
    
    // For free users, check if they have bonus limits
    const totalLimit = user.daily_limit + user.bonus_limit;
    if (totalLimit > 3) {
        return {
            limit: defaultLimits.basic,
            type: 'basic'
        };
    }
    
    return {
        limit: defaultLimits.free,
        type: 'free'
    };
}

/**
 * Check if text is within user's word limit
 * @param {string} text - Input text
 * @param {Object} user - User object
 * @returns {Object} - Check result
 */
function checkTextLimit(text, user) {
    const wordCount = countWords(text);
    const limitInfo = getUserWordLimit(user);
    
    return {
        wordCount,
        limit: limitInfo.limit,
        type: limitInfo.type,
        allowed: wordCount <= limitInfo.limit,
        exceeded: wordCount > limitInfo.limit
    };
}

module.exports = {
    countWords,
    exceedsWordLimit,
    getUserWordLimit,
    checkTextLimit
};
