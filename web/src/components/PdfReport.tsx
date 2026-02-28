import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

interface TestResult {
  content: string;
  transcript?: string;
  accuracy_score?: number;
  fluency_score?: number;
  completeness_score?: number;
  prosody_score?: number;
  overall_score?: number;
  ai_feedback?: string;
  created_at: string;
  duration?: number;
}

interface PdfReportProps {
  results: TestResult[];
  userName: string;
}

export function PdfReport({ results, userName }: PdfReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generatePdf = async () => {
    if (results.length === 0) {
      toast({
        title: "Ma'lumot yo'q",
        description: "Hisobot yaratish uchun test natijalari kerak",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Calculate average scores
      const avgScores = { accuracy: 0, fluency: 0, completeness: 0, prosody: 0, overall: 0 };
      let count = 0;
      results.forEach(r => {
        if (r.overall_score) {
          avgScores.accuracy += r.accuracy_score || 0;
          avgScores.fluency += r.fluency_score || 0;
          avgScores.completeness += r.completeness_score || 0;
          avgScores.prosody += r.prosody_score || 0;
          avgScores.overall += r.overall_score || 0;
          count++;
        }
      });

      if (count > 0) {
        avgScores.accuracy = Math.round(avgScores.accuracy / count);
        avgScores.fluency = Math.round(avgScores.fluency / count);
        avgScores.completeness = Math.round(avgScores.completeness / count);
        avgScores.prosody = Math.round(avgScores.prosody / count);
        avgScores.overall = Math.round(avgScores.overall / count);
      }

      // Header
      doc.setFontSize(24);
      doc.setTextColor(244, 163, 0);
      doc.text('Ravon AI', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Ingliz tili talaffuz tahlil tizimi', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // User info
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(userName, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Hisobot sanasi: ${new Date().toLocaleDateString('uz-UZ', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, margin, y);
      y += 15;

      // Summary scores
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');
      y += 10;

      const scoreWidth = (pageWidth - 2 * margin) / 5;
      const scores = [
        { label: "To'g'rilik", value: avgScores.accuracy },
        { label: 'Ravonlik', value: avgScores.fluency },
        { label: "To'liqlik", value: avgScores.completeness },
        { label: 'Ohang', value: avgScores.prosody },
        { label: 'Umumiy', value: avgScores.overall }
      ];

      doc.setFontSize(18);
      doc.setTextColor(244, 163, 0);
      scores.forEach((score, i) => {
        const x = margin + scoreWidth * i + scoreWidth / 2;
        doc.text(`${score.value}%`, x, y, { align: 'center' });
      });
      y += 8;

      doc.setFontSize(8);
      doc.setTextColor(100);
      scores.forEach((score, i) => {
        const x = margin + scoreWidth * i + scoreWidth / 2;
        doc.text(score.label, x, y, { align: 'center' });
      });
      y += 20;

      // Results title
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Test natijalari (${results.length} ta)`, margin, y);
      y += 10;

      // Results
      results.forEach((r, index) => {
        // Check if we need a new page
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        // Result card
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 45, 2, 2, 'F');
        
        // Left border accent
        doc.setFillColor(244, 163, 0);
        doc.rect(margin, y, 3, 45, 'F');

        y += 8;

        // Content
        doc.setFontSize(10);
        doc.setTextColor(0);
        const contentText = r.content.length > 60 ? r.content.substring(0, 60) + '...' : r.content;
        doc.text(`"${contentText}"`, margin + 8, y);
        y += 6;

        // Transcript
        if (r.transcript) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          const transcriptText = r.transcript.length > 70 ? r.transcript.substring(0, 70) + '...' : r.transcript;
          doc.text(`Aytilgan: "${transcriptText}"`, margin + 8, y);
        }
        y += 8;

        // Scores row
        doc.setFontSize(8);
        doc.setTextColor(50);
        const scoreText = `To'g'rilik: ${r.accuracy_score || 0}% | Ravonlik: ${r.fluency_score || 0}% | To'liqlik: ${r.completeness_score || 0}% | Ohang: ${r.prosody_score || 0}% | Umumiy: ${r.overall_score || 0}%`;
        doc.text(scoreText, margin + 8, y);
        y += 6;

        // Feedback
        if (r.ai_feedback) {
          doc.setTextColor(46, 125, 50);
          const feedbackText = r.ai_feedback.length > 80 ? r.ai_feedback.substring(0, 80) + '...' : r.ai_feedback;
          doc.text(`💡 ${feedbackText}`, margin + 8, y);
        }
        y += 6;

        // Duration and date
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Davomiylik: ${formatDuration(r.duration)} | ${new Date(r.created_at).toLocaleString('uz-UZ')}`, margin + 8, y);
        
        y += 15;
      });

      // Footer
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      y = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`© ${new Date().getFullYear()} Ravon AI - Talaffuz tahlil tizimi`, pageWidth / 2, y, { align: 'center' });

      // Save the PDF
      doc.save(`talaffuz-hisobot-${userName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Tayyor!",
        description: "PDF hisobot yuklab olindi"
      });

    } catch (err) {
      console.error('PDF generation error:', err);
      toast({
        title: "Xatolik",
        description: "Hisobot yaratishda xatolik",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={generatePdf}
      disabled={isGenerating || results.length === 0}
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      PDF Hisobot
    </Button>
  );
}