const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const googleTTS = require('google-tts-api');
const axios = require('axios');

class TtsService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp/tts');
        fs.ensureDirSync(this.tempDir);
    }

    async generateAudio(text, lang = 'en') {
        const fileName = `${uuidv4()}.mp3`;
        const filePath = path.join(this.tempDir, fileName);

        try {
            console.log(`Generating Google TTS: "${text.substring(0, 20)}..." Lang: ${lang}`);
            await this.generateGoogleAudio(text, filePath, lang);
            return filePath;
        } catch (error) {
            console.error('Google TTS generation error:', error.message);
            throw error;
        }
    }

    async generateGoogleAudio(text, filePath, lang = 'en') {
        try {
            if (text.length <= 200) {
                const url = googleTTS.getAudioUrl(text, {
                    lang: lang,
                    slow: false,
                    host: 'https://translate.google.com',
                });
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await fs.writeFile(filePath, Buffer.from(response.data));
            } else {
                const results = googleTTS.getAllAudioUrls(text, {
                    lang: lang,
                    slow: false,
                    host: 'https://translate.google.com',
                });
                
                const buffers = [];
                for (const result of results) {
                    const response = await axios.get(result.url, { responseType: 'arraybuffer' });
                    buffers.push(Buffer.from(response.data));
                }
                await fs.writeFile(filePath, Buffer.concat(buffers));
            }
        } catch (error) {
            throw new Error(`Google TTS synthesis failed: ${error.message}`);
        }
    }

    async cleanup(filePath) {
        try {
            if (filePath && await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        } catch (error) {
            console.error('TTS Cleanup Error:', error);
        }
    }
}

module.exports = new TtsService();
