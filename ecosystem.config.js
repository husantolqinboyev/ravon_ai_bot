module.exports = {
  apps: [{
    name: 'ravon_bot',
    script: 'index.js',
    instances: 1, // Faqat bitta instance
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/ravon-bot-error.log',
    out_file: './logs/ravon-bot-out.log',
    log_file: './logs/ravon-bot-combined.log',
    time: true
  }]
};
