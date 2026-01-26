const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

class PdfService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp/reports');
        fs.ensureDirSync(this.tempDir);
        // Windows system fonts
        this.fonts = {
            regular: 'C:\\Windows\\Fonts\\arial.ttf',
            bold: 'C:\\Windows\\Fonts\\arialbd.ttf',
            italic: 'C:\\Windows\\Fonts\\ariali.ttf'
        };
        this.channelUrl = 'https://t.me/englishwithSanatbek';
    }

    async generateQRCodeBuffer(text) {
        try {
            return await QRCode.toBuffer(text, {
                margin: 2,
                width: 100,
                color: {
                    dark: '#2c3e50',
                    light: '#ffffff'
                }
            });
        } catch (err) {
            console.error('QR Code generation error:', err);
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        // Remove common problematic characters/emojis that PDFKit might struggle with
        return text
            .replace(/[🚀💡✅❌•]/g, '-') // Replace emojis with dashes for safety
            .replace(/[\u0080-\uFFFF]/g, (m) => {
                // Keep some basic Latin-1 but filter out others if needed
                // For now, let's try to keep most but Arial should handle them
                return m;
            });
    }

    async generateReport(user, assessment, type = 'general') {
        const qrBuffer = await this.generateQRCodeBuffer(this.channelUrl);
        
        return new Promise((resolve, reject) => {
            try {
                const fileName = `report_${uuidv4()}.pdf`;
                const filePath = path.join(this.tempDir, fileName);
                
                const doc = new PDFDocument({ 
                    margin: 0, // No margins to prevent automatic page breaks
                    size: 'A4',
                    bufferPages: true 
                });
                const stream = fs.createWriteStream(filePath);

                doc.pipe(stream);

                const colors = {
                    darkBlue: '#1a237e',
                    orange: '#ff6d00',
                    lightBlue: '#e3f2fd',
                    green: '#2e7d32',
                    yellow: '#fbc02d',
                    red: '#d32f2f',
                    text: '#2c3e50',
                    lightGray: '#f5f5f5'
                };

                // Helper for Background Decorations
                const drawBackground = (pdfDoc) => {
                    const pw = pdfDoc.page.width;
                    const ph = pdfDoc.page.height;
                    
                    pdfDoc.save();
                    // Top Left
                    pdfDoc.moveTo(0, 0).lineTo(120, 0).lineTo(0, 120).fill(colors.orange);
                    // Bottom Right - Stay slightly away from absolute edge
                    pdfDoc.moveTo(pw - 2, ph - 2).lineTo(pw - 120, ph - 2).lineTo(pw - 2, ph - 120).fill(colors.orange);
                    pdfDoc.moveTo(pw - 2, ph - 2).lineTo(pw - 80, ph - 2).lineTo(pw - 2, ph - 80).fill(colors.darkBlue);
                    pdfDoc.restore();
                };

                // Helper to check space and add page
                const checkPage = (pdfDoc, neededHeight = 50) => {
                    // Very permissive threshold
                    if (pdfDoc.y + neededHeight > pdfDoc.page.height - 20) {
                        pdfDoc.addPage({ margin: 0 });
                        drawBackground(pdfDoc);
                        pdfDoc.y = 50; 
                        return true;
                    }
                    return false;
                };

                // Register Fonts
                try {
                    doc.registerFont('Main', this.fonts.regular);
                    doc.registerFont('MainBold', this.fonts.bold);
                    doc.font('Main');
                } catch (e) {
                    console.error('Font loading failed:', e.message);
                }

                drawBackground(doc);

                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;

                // --- Header Section ---
                doc.fillColor(colors.text)
                   .font('MainBold')
                   .fontSize(18)
                   .text('ravon_ai bot', 0, 40, { align: 'center' });
                doc.fontSize(8)
                   .font('Main')
                   .text('TALAFUZNI PROFESIONAL TAHLILI', 0, 60, { align: 'center' });

                // User Info
                doc.fillColor('#7f8c8d')
                   .fontSize(9)
                   .text(`Foydalanuvchi: ${user.first_name} ${user.last_name || ''}`, pageWidth - 220, 40, { width: 170, align: 'right' });
                doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, pageWidth - 220, 52, { width: 170, align: 'right' });

                // Title
                doc.fillColor(colors.text)
                   .font('MainBold')
                   .fontSize(20)
                   .text('NUTQ RAVONLIGI TAHLILI', 0, 95, { align: 'center' });

                // --- Score Circle ---
                const score = assessment.overallScore;
                const scoreColor = score >= 85 ? colors.green : (score >= 50 ? colors.yellow : colors.red);
                
                const circleX = pageWidth / 2;
                const circleY = 210;
                const radius = 70;

                doc.circle(circleX, circleY, radius).lineWidth(12).stroke(colors.lightGray);
                doc.save().lineWidth(12).strokeColor(scoreColor).circle(circleX, circleY, radius).stroke().restore();

                doc.fillColor(colors.text).font('MainBold').fontSize(40)
                   .text(`${score}%`, circleX - 100, circleY - 20, { width: 200, align: 'center' });

                // --- Rating Stars ---
                const starCount = Math.round(score / 20);
                const starY = circleY + radius + 15;
                doc.fontSize(18).fillColor(colors.yellow);
                let stars = '';
                for(let i=0; i<5; i++) stars += i < starCount ? '★' : '☆';
                doc.text(stars, circleX - 60, starY, { width: 120, align: 'center' });

                doc.fillColor(colors.text).font('MainBold').fontSize(11)
                   .text(`Umumiy Ball: ${assessment.englishLevel}`, 0, starY + 25, { align: 'center' });
                
                doc.font('Main').fontSize(9)
                   .text('Nutqingiz tahlili natijalari quyidagicha:', 0, starY + 42, { align: 'center' });

                doc.y = starY + 65;
                doc.moveTo(100, doc.y).lineTo(pageWidth - 100, doc.y).lineWidth(1).stroke(colors.lightGray);
                doc.moveDown(1);

                // --- Transcript Section ---
                checkPage(doc, 100);
                doc.fillColor(colors.text).font('MainBold').fontSize(13)
                   .text('TRANSKRIPT VA XATOLAR', 0, doc.y, { align: 'center' });
                doc.moveDown(0.5);

                const transcription = assessment.transcription;
                const mispronouncedWords = assessment.detailedFeedback?.phoneticAnalysis?.mispronouncedWords || [];
                const mispronouncedList = mispronouncedWords.map(m => m.word.toLowerCase());

                doc.font('Main').fontSize(12).fillColor(colors.text);
                const words = transcription.split(/\s+/);
                let currentX = 80;
                let currentLineY = doc.y;
                const maxWidth = pageWidth - 160;

                words.forEach(word => {
                    const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                    const isError = mispronouncedList.includes(cleanWord);
                    const wordWidth = doc.widthOfString(word + ' ');
                    
                    if (currentX + wordWidth > maxWidth + 80) {
                        currentX = 80;
                        currentLineY += 22;
                        if (checkPage(doc, 30)) {
                            currentLineY = 50;
                        }
                    }

                    if (isError) doc.fillColor(colors.red).font('MainBold');
                    else doc.fillColor(colors.text).font('Main');

                    doc.text(word + ' ', currentX, currentLineY, { lineBreak: false });
                    currentX += wordWidth;
                });

                doc.y = currentLineY + 35;

                // --- Errors Detailed Analysis ---
                if (mispronouncedWords.length > 0) {
                    checkPage(doc, 50);
                    doc.fillColor(colors.red).font('MainBold').fontSize(11).text('XATOLAR TAHLILI (BATAFSIL)', 75, doc.y);
                    doc.moveDown(0.5);
                    
                    mispronouncedWords.slice(0, 8).forEach(m => {
                        checkPage(doc, 40);
                        const errorY = doc.y;
                        doc.fillColor(colors.red).font('MainBold').fontSize(9).text(`${m.word.toUpperCase()}`, 85, errorY);
                        
                        const wordWidth = doc.widthOfString(m.word.toUpperCase());
                        doc.fillColor(colors.darkBlue).font('Main').fontSize(9).text(`[${m.correctPronunciation}]`, 85 + wordWidth + 8, errorY);
                        
                        doc.moveDown(0.2);
                        doc.fillColor(colors.text).font('Main').fontSize(8.5).text(`• ${m.phoneticError}. ${m.improvementTip}`, 100, doc.y, { width: pageWidth - 180 });
                        doc.moveDown(0.4);
                    });
                    doc.moveDown(0.5);
                    doc.moveTo(100, doc.y).lineTo(pageWidth - 100, doc.y).stroke(colors.lightGray);
                    doc.moveDown(0.8);
                }

                // --- Recommendations Section ---
                checkPage(doc, 80);
                const strengths = assessment.detailedFeedback?.strengths || [];
                const actionPlan = assessment.detailedFeedback?.actionPlan || [];
                const recWidth = (pageWidth - 140) / 2;
                
                const sectionStartY = doc.y;
                let col1Y = sectionStartY;
                let col2Y = sectionStartY;

                // Column 1: Strengths
                doc.fillColor(colors.green).font('MainBold').fontSize(11).text('KUCHLI TOMONLAR', 70, col1Y);
                col1Y += 18;
                strengths.slice(0, 3).forEach(s => {
                    doc.fillColor(colors.text).font('Main').fontSize(9).text(`• ${s}`, 70, col1Y, { width: recWidth });
                    col1Y += doc.heightOfString(`• ${s}`, { width: recWidth }) + 4;
                });

                // Column 2: Action Plan
                doc.fillColor(colors.orange).font('MainBold').fontSize(11).text('RIVOJLANISH REJASI', pageWidth / 2 + 10, col2Y);
                col2Y += 18;
                actionPlan.slice(0, 3).forEach(p => {
                    doc.fillColor(colors.text).font('Main').fontSize(9).text(`• ${p}`, pageWidth / 2 + 10, col2Y, { width: recWidth });
                    col2Y += doc.heightOfString(`• ${p}`, { width: recWidth }) + 4;
                });

                doc.y = Math.max(col1Y, col2Y) + 20;

                // --- QR Code & Footer ---
                // We only add a page if the content is EXTREMELY low, 
                // overlapping with the absolute bottom of the page.
                if (doc.y > pageHeight - 60) {
                    doc.addPage({ margin: 0 });
                    drawBackground(doc);
                }

                if (qrBuffer) {
                    doc.save();
                    const qrX = pageWidth - 100;
                    const qrY = pageHeight - 90;
                    
                    // Absolute positioning for QR and text
                    doc.image(qrBuffer, qrX, qrY, { width: 50 });
                    
                    doc.fillColor('#7f8c8d')
                       .fontSize(6)
                       .text('Batafsil ma\'lumot uchun skaner qiling', qrX - 30, qrY + 55, { 
                           width: 110, 
                           align: 'center',
                           lineBreak: false 
                       });
                    doc.restore();
                }

                doc.end();
                stream.on('finish', () => resolve(filePath));
                stream.on('error', reject);
            } catch (err) {
                console.error('PDF generation error:', err);
                reject(err);
            }
        });
    }

    getTypeLabel(type) {
        switch (type) {
            case 'test': return 'Talaffuz Testi';
            case 'compare': return 'Matn va Audio Taqqoslash';
            default: return 'Umumiy Tahlil';
        }
    }

    async cleanup(filePath) {
        try {
            if (filePath && await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        } catch (error) {
            console.error('PDF Cleanup Error:', error);
        }
    }
}

module.exports = new PdfService();
