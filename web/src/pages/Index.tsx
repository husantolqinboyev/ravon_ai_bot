import { useEffect } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/test', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-pulse space-y-6 text-center max-w-sm w-full">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary/40" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, it means initData failed or is missing
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-border shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-foreground">
              Telegram orqali kiring
            </h2>
            <p className="text-muted-foreground">
              Ushbu ilova faqat Telegram Mini App ichida ishlaydi.
            </p>
          </div>

          <div className="pt-4">
            <a
              href="https://t.me/ravonai_bot"
              className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Botga o'tish
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
