import { useState, useEffect } from 'react';
import { Mic, Target, Waves, FileCheck, Music, ArrowLeft, Edit3, Shuffle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AudioRecorder } from '@/components/AudioRecorder';
import { MaterialSelector } from '@/components/MaterialSelector';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { saveAnalysis } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const Pronunciation = () => {
  const [mode, setMode] = useState<'menu' | 'own' | 'random'>('menu');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>();
  const [customText, setCustomText] = useState('');
  const [testResults, setTestResults] = useState<Array<{
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
  }>>([]);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load previous test results
  useEffect(() => {
    const loadTestResults = async () => {
      if (!user?.telegramUserId) return;

      const response = await api.getUserAssessments();
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      }
    };

    loadTestResults();
  }, [user?.telegramUserId]);

  const handleSelectContent = (content: string, materialId?: string) => {
    setSelectedContent(content);
    setSelectedMaterialId(materialId);
  };

  const handleAnalyze = async (audioBlob: Blob, duration: number) => {
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('duration', duration.toString());

      const textToUse = mode === 'own' ? customText : selectedContent;
      if (textToUse) {
        formData.append('reference_text', textToUse);
      }

      const response = await api.analyzeAudio(formData);

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();

      if (!result.success) {
        if (result.error === 'LIMIT_EXCEEDED') {
          toast({
            title: "Kunlik limit tugadi",
            description: "Bugun barcha test imkoniyatlaridan foydalandingiz. Premium obunaga o'ting!",
            variant: "destructive",
          });
          return;
        }
        throw new Error(result.error);
      }

      // Save to IndexedDB
      await saveAnalysis({
        analysis: result.text,
        transcript: result.data?.transcription,
        duration,
        createdAt: new Date(),
        telegramUserId: user?.telegramUserId,
      });

      // Update local state with new result
      setTestResults(prev => [{
        content: textToUse || result.data?.transcription || 'Free speech',
        transcript: result.data?.transcription,
        overall_score: result.data?.overallScore,
        accuracy_score: result.data?.accuracyScore,
        fluency_score: result.data?.fluencyScore,
        completeness_score: result.data?.completenessScore,
        prosody_score: result.data?.prosodyScore,
        ai_feedback: result.text,
        duration,
        created_at: new Date().toISOString()
      }, ...prev]);

      toast({
        title: "Tahlil muvaffaqiyatli!",
        description: "Natija tarixga saqlandi",
      });

      setRefreshTrigger((prev) => prev + 1);
      if (mode === 'own') {
        setCustomText('');
      } else {
        setSelectedContent('');
        setSelectedMaterialId(undefined);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Tahlil qilishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!user) return null;

  if (mode === 'menu') {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
              <Mic className="h-4 w-4" />
              <span className="text-xs md:text-sm font-medium">Talafuz tekshirish</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">
              Talaffuzni tekshirish
            </h1>
            <p className="text-muted-foreground">
              Talaffuzingizni tekshirish usulini tanlang
            </p>
          </div>

          {/* Menu Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card
              className="border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setMode('own')}
            >
              <CardContent className="p-6 md:p-8">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Edit3 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Talaffuz matnni o'zim yozaman
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      O'zingiz xohlagan matnni yozib, talaffuzini tekshiring
                    </p>
                  </div>
                  <Button className="w-full">
                    Boshlash
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setMode('random')}
            >
              <CardContent className="p-6 md:p-8">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Shuffle className="h-8 w-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Tasodifiy so'z va matn orqali tekshirish
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bazadan tasodifiy matn tanlab, talaffuz qiling
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Boshlash
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/test')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Asosiy menyu
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
            <Mic className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium">
              {mode === 'own' ? 'O\'z matningiz' : 'Tasodifiy matn'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">
            Talaffuzni tekshirish
          </h1>
          <p className="text-muted-foreground">
            {mode === 'own'
              ? 'Matningizni yozing va talaffuz qiling'
              : 'Matn tanlang va talaffuz qiling'
            }
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Target className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
              <p className="text-xs font-medium text-foreground">To'g'rilik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Waves className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-secondary" />
              <p className="text-xs font-medium text-foreground">Ravonlik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Fluency</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <FileCheck className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-accent" />
              <p className="text-xs font-medium text-foreground">To'liqlik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Completeness</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Music className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-info" />
              <p className="text-xs font-medium text-foreground">Ohang</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Prosody</p>
            </CardContent>
          </Card>
        </div>

        {/* Text Input Section */}
        {mode === 'own' ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Matningizni kiriting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ingliz tilida matn kiriting..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              {customText && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Ajoyib, endi ovozli xabar yuboring 👇
                  </p>
                  <p className="text-sm font-medium">{customText}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-primary" />
                Matn tanlang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialSelector
                telegramUserId={user.telegramUserId}
                onSelect={handleSelectContent}
                selectedContent={selectedContent}
              />
              {selectedContent && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Ajoyib, endi ovozli xabar yuboring 👇
                  </p>
                  <p className="text-sm font-medium">{selectedContent}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audio Recorder */}
        <AudioRecorder
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          disabled={mode === 'own' ? !customText : !selectedContent}
        />

        {/* Navigation */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => setMode('menu')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/test')}
            className="flex items-center gap-2"
          >
            Asosiy menyu
          </Button>
        </div>

        {/* Analysis History */}
        <AnalysisHistory
          refreshTrigger={refreshTrigger}
        />
      </div>
    </DashboardLayout>
  );
};

export default Pronunciation;
