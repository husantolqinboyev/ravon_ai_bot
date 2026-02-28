import { useState, useEffect } from 'react';
import { Mic, Target, Waves, FileCheck, Music, Volume2, User, CreditCard, HelpCircle, Home } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { MaterialSelector } from '@/components/MaterialSelector';
import { PdfReport } from '@/components/PdfReport';
import { saveAnalysis } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const Dashboard = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>();
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

  // Load previous test results for PDF report
  useEffect(() => {
    const loadTestResults = async () => {
      if (!user?.telegramUserId) return;

      try {
        const response = await api.getUserAssessments();
        if (response.ok) {
          const data = await response.json();
          setTestResults(data);
        }
      } catch (error) {
        console.error('Error loading test results:', error);
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
      if (selectedContent) {
        formData.append('reference_text', selectedContent);
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

      // Save to IndexedDB for local history
      await saveAnalysis({
        analysis: result.text,
        transcript: result.data?.transcription,
        duration,
        createdAt: new Date(),
        telegramUserId: user?.telegramUserId,
      });

      // Update test results for PDF
      const newResult = {
        content: selectedContent || result.data?.transcription || 'Free speech',
        transcript: result.data?.transcription,
        accuracy_score: result.data?.accuracyScore,
        fluency_score: result.data?.fluencyScore,
        completeness_score: result.data?.completenessScore,
        prosody_score: result.data?.prosodyScore,
        overall_score: result.data?.overallScore,
        ai_feedback: result.text,
        duration,
        created_at: new Date().toISOString()
      };

      setTestResults(prev => [newResult, ...prev]);

      toast({
        title: "Tahlil muvaffaqiyatli!",
        description: "Natija tarixga saqlandi",
      });

      setRefreshTrigger((prev) => prev + 1);
      setSelectedContent('');
      setSelectedMaterialId(undefined);
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

  const menuItems = [
    {
      icon: Mic,
      label: '🎙 Talaffuzni tekshirish',
      description: 'Ingliz talaffuzini tekshiring',
      emoji: '🎙',
      action: () => navigate('/pronunciation')
    },
    {
      icon: Volume2,
      label: '🔊 Matnni ovozga aylantirish',
      description: 'Matnni audiga aylantiring',
      emoji: '🔊',
      action: () => navigate('/tts')
    },
    {
      icon: User,
      label: '👤 Profil',
      description: 'Ma\'lumotlar va statistika',
      emoji: '👤',
      action: () => navigate('/profile')
    },
    {
      icon: CreditCard,
      label: '💳 Tariflar | Ko\'proq foyda olish',
      description: 'Premium imkoniyatlar',
      emoji: '💳',
      action: () => navigate('/premium')
    },
    {
      icon: HelpCircle,
      label: '❓ Bot qanday ishlaydi?',
      description: 'Qo\'llanma va yordam',
      emoji: '❓',
      action: () => navigate('/help')
    }
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
            <Home className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium">Asosiy Menyu</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">
            Ravon AI Bot
          </h1>
          <p className="text-muted-foreground">
            Ingliz tili talaffuzini o'rganish va rivojlantirish
          </p>
        </div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {menuItems.map((item, index) => (
            <Card
              key={index}
              className="border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              onClick={item.action}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10">
                    <span className="text-xl md:text-2xl">{item.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm md:text-base">
                      {item.label}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                  <item.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pronunciation Section - Only show when pronunciation is selected */}
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
              <Mic className="h-4 w-4" />
              <span className="text-xs md:text-sm font-medium">Talaffuzni Test Qilish</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold font-display text-foreground">
              Ingliz Tili Talaffuz Tahlili
            </h2>
            <p className="text-muted-foreground">
              Matn tanlang yoki o'zingiz yozing, keyin talaffuz qiling
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

          {/* Material Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Matn tanlang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialSelector
                telegramUserId={user.telegramUserId}
                onSelect={handleSelectContent}
                selectedContent={selectedContent}
              />
            </CardContent>
          </Card>

          {/* Audio Recorder */}
          <AudioRecorder
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />

          {/* PDF Report Button */}
          {testResults.length > 0 && (
            <div className="flex justify-end">
              <PdfReport
                results={testResults}
                userName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Foydalanuvchi'}
              />
            </div>
          )}

          {/* Analysis History */}
          <AnalysisHistory
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
