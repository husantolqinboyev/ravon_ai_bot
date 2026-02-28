import { useState, useEffect } from 'react';
import { Sparkles, LogIn, Mic, BarChart3, Crown, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CodeLogin } from '@/components/CodeLogin';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Telegram bot username
const TELEGRAM_BOT_NAME = 'ravonaiweb_bot';

const Index = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const { user, isLoading, isAuthenticated, loginWithCode } = useAuth();
  const { toast } = useToast();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/test', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleVerifyCode = async (code: string): Promise<boolean> => {
    setIsVerifying(true);
    try {
      const success = await loginWithCode(code);
      
      if (success) {
        toast({
          title: "Xush kelibsiz!",
          description: `Muvaffaqiyatli kirdingiz!`,
        });
      }
      return success;
    } finally {
      setIsVerifying(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const features = [
    { icon: Mic, title: 'AI Tahlil', desc: '4 ta ko\'rsatkich bo\'yicha baholash', emoji: '🎯' },
    { icon: BarChart3, title: 'Statistika', desc: 'Progress kuzatuvi', emoji: '📊' },
    { icon: Crown, title: 'Premium', desc: 'Cheksiz imkoniyatlar', emoji: '💎' },
    { icon: MessageCircle, title: 'TTS', desc: 'Matnni tinglash', emoji: '🔊' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold font-display text-foreground">Ravon AI</h1>
              <p className="text-xs text-muted-foreground">Talaffuz tahlil tizimi</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI Talaffuz Tahlili</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Ingliz tilini <span className="text-gradient">mukammal</span> o'rganing
            </h2>
            <p className="text-muted-foreground">
              Sun'iy intellekt bilan talaffuzingizni baholang va yaxshilang
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{feature.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Login Card */}
          <Card className="border-2 border-border shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full gradient-primary">
                <LogIn className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl font-display">Tizimga kirish</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Telegram orqali tezkor kirish
              </p>
            </CardHeader>
            <CardContent className="pb-6">
              <CodeLogin 
                botName={TELEGRAM_BOT_NAME}
                onVerify={handleVerifyCode}
                isLoading={isVerifying}
              />
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="text-center space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent">
                ✅ Bepul
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary">
                🔒 Xavfsiz
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary">
                🚀 Tezkor
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            🔒 Maxfiylik: Barcha tahlillar faqat brauzeringizda saqlanadi
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
