import { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Loader2, User, UserCircle, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { AudioPlayer } from '@/components/AudioPlayer';

// Limits
const FREE_CHAR_LIMIT = 200;
const PREMIUM_CHAR_LIMIT = 2000;
const FREE_DAILY_LIMIT = 5;
const PREMIUM_DAILY_LIMIT = 50;

const TextToSpeech = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('male');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const charLimit = isPremium ? PREMIUM_CHAR_LIMIT : FREE_CHAR_LIMIT;
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remainingDaily = Math.max(0, dailyLimit - dailyUsed);

  // Load premium status and daily usage
  useEffect(() => {
    const loadUsageData = async () => {
      if (!user?.telegramUserId) return;

      try {
        const response = await api.getUserData();
        if (response.ok) {
          const result = await response.json();
          setIsPremium(result.user.is_premium);
          setDailyUsed(result.user.used_today);
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    loadUsageData();
  }, [user?.telegramUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  if (!user) return null;

  const handleSpeak = async () => {
    if (!text.trim()) {
      toast({
        title: "Matn kiriting",
        description: "Iltimos, o'qitish uchun matn kiriting",
        variant: "destructive",
      });
      return;
    }

    // Check daily limit
    if (remainingDaily <= 0) {
      toast({
        title: "Kunlik limit tugadi",
        description: `Bugun ${dailyUsed}/${dailyLimit} marta ishlatildi. ${!isPremium ? "Premium obunaga o'ting!" : "Limit yangilanishini kuting."}`,
        variant: "destructive",
      });
      return;
    }

    // Check character limit
    if (text.length > charLimit) {
      toast({
        title: "Matn juda uzun",
        description: `Maksimal ${charLimit} ta belgi. ${!isPremium ? "Premium bilan ko'proq imkoniyat!" : ""}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setAudioUrl(null);

    try {
      const response = await api.textToSpeech(text);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setDailyUsed(prev => prev + 1);
        setIsPlaying(true);
      } else {
        const err = await response.json();
        throw new Error(err.error || 'TTS failed');
      }
    } catch (error) {
      console.error('TTS Error:', error);
      toast({
        title: "Xatolik",
        description: "Audioni yaratishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleTexts = [
    "Hello, how are you today?",
    "The weather is beautiful today.",
    "I would like to improve my English pronunciation.",
    "Practice makes perfect.",
  ];

  const usagePercent = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm font-medium">Matnni ovozga aylantirish</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Matnni ovozga aylantirish
          </h1>
          <p className="text-muted-foreground">
            Inglizcha matnni kiriting va ovozini eshiting
          </p>
        </div>

        {/* Usage Info */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Kunlik foydalanish</span>
                <Badge variant={isPremium ? "default" : "outline"} className="text-xs">
                  {isPremium ? "💎 Premium" : "Bepul"}
                </Badge>
              </div>
              <span className="text-sm font-medium text-foreground">
                {isLoadingUsage ? "..." : `${dailyUsed} / ${dailyLimit}`}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            {remainingDaily <= 2 && remainingDaily > 0 && (
              <p className="text-xs text-warning mt-1">⚠️ Faqat {remainingDaily} ta qoldi</p>
            )}
            {remainingDaily === 0 && (
              <p className="text-xs text-destructive mt-1">❌ Kunlik limit tugadi. Ertaga soat 12:00 da yangilanadi.</p>
            )}
          </CardContent>
        </Card>

        {/* Voice Selection */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Jinsni tanlang</CardTitle>
            <CardDescription>
              Ovoz turini tanlang
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={selectedVoice === 'male' ? 'default' : 'outline'}
                onClick={() => setSelectedVoice('male')}
                className="flex items-center gap-2 h-16"
              >
                <User className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Erkak ovozi</div>
                  <div className="text-xs opacity-70">Past ohang</div>
                </div>
              </Button>
              <Button
                variant={selectedVoice === 'female' ? 'default' : 'outline'}
                onClick={() => setSelectedVoice('female')}
                className="flex items-center gap-2 h-16"
              >
                <UserCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Ayol ovozi</div>
                  <div className="text-xs opacity-70">Yuqori ohang</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Input */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Matn kiriting</CardTitle>
            <CardDescription>
              Inglizcha matn yozing yoki nusxalab qo'ying (maks. {charLimit} belgi)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ingliz tilida matn kiriting..."
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= charLimit) {
                  setText(e.target.value);
                }
              }}
              className="min-h-[150px] resize-none"
              maxLength={charLimit}
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${text.length >= charLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {text.length} / {charLimit}
                {!isPremium && text.length >= FREE_CHAR_LIMIT && (
                  <span className="ml-2 text-primary">💎 Premium bilan 2000 belgigacha!</span>
                )}
              </span>
              <Button
                onClick={handleSpeak}
                disabled={!text.trim() || remainingDaily <= 0 || isProcessing}
                className="min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Tayyorlanmoqda...
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Qayta tinglash
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Ovozga aylantirish
                  </>
                )}
              </Button>
            </div>
            {audioUrl && (
              <div className="mt-4 p-4 bg-muted rounded-xl">
                <AudioPlayer src={audioUrl} onEnded={() => setIsPlaying(false)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Texts */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📝 Namuna matnlar
            </CardTitle>
            <CardDescription>
              Bosing va matnni sinab ko'ring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exampleTexts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setText(example)}
                >
                  <span className="text-sm">{example}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
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
};

export default TextToSpeech;
