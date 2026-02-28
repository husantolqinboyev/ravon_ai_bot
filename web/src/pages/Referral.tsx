import { useState } from 'react';
import { Users2, Gift, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const Referral = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referralCount] = useState(0); // TODO: Load from DB

  const referralLink = user ? `https://t.me/ravonaiweb_bot?start=ref_${user.telegramUserId}` : '';
  const bonusesEarned = Math.min(referralCount, 3);
  const progress = (referralCount / 3) * 100;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Nusxalandi!",
        description: "Referal havola buferga nusxalandi",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: "Nusxalashda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ravon AI - Ingliz tili talaffuzini yaxshilang',
        text: `Men Ravon AI orqali ingliz tili talaffuzimni yaxshilayapman! Sen ham sinab ko'r:`,
        url: referralLink,
      });
    } else {
      copyToClipboard();
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
            <Users2 className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium">Referal Dasturi</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">
            Do'stlaringizni taklif qiling
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            3 ta do'st taklif qiling va 3 ta bonus limit oling!
          </p>
        </div>

        {/* Progress Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Sizning yutuqlaringiz</span>
              </div>
              {referralCount >= 3 && (
                <Badge className="bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Bajarildi!
                </Badge>
              )}
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
              <div className="text-center p-3 md:p-4 bg-background/80 backdrop-blur rounded-xl">
                <p className="text-2xl md:text-3xl font-bold text-primary">{referralCount}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Taklif qilingan</p>
              </div>
              <div className="text-center p-3 md:p-4 bg-background/80 backdrop-blur rounded-xl">
                <p className="text-2xl md:text-3xl font-bold text-primary">{bonusesEarned}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Bonus limitlar</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{referralCount}/3 do'st</span>
              </div>
              <Progress value={progress} className="h-2 md:h-3" />
              {referralCount >= 3 ? (
                <p className="text-center text-xs md:text-sm text-primary font-medium">
                  🎉 Tabriklaymiz! Siz 3 ta bonus limit oldingiz!
                </p>
              ) : (
                <p className="text-center text-xs md:text-sm text-muted-foreground">
                  Yana {3 - referralCount} ta do'st taklif qiling
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Referral Link Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Share2 className="h-5 w-5 text-primary" />
              Referal havolangiz
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Bu havolani do'stlaringiz bilan ulashing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 p-2.5 md:p-3 bg-muted rounded-lg text-xs md:text-sm break-all font-mono">
                {referralLink}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <Button onClick={copyToClipboard} variant="outline" size="sm" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Nusxalash
              </Button>
              <Button onClick={shareLink} size="sm" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Ulashish
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bonuses Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Bonuslar haqida</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Har bir do'st uchun 1 ta qo'shimcha tahlil limiti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((num) => (
                <div 
                  key={num}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    referralCount >= num ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    referralCount >= num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {referralCount >= num ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{num}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${referralCount >= num ? 'text-primary' : 'text-foreground'}`}>
                      {num}-do'st
                    </p>
                    <p className="text-xs text-muted-foreground">+1 ta qo'shimcha tahlil limiti</p>
                  </div>
                  {referralCount >= num && (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      Olingan
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground px-4">
          Bonus limitlar bir martalik beriladi va faqat tahlil qilish uchun ishlatiladi
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Referral;
