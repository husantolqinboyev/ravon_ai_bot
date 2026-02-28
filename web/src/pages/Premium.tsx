import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, MessageCircle, Copy, ExternalLink, Users, Gift, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

// Admin Telegram username
const ADMIN_USERNAME = 'khamidovsanat';

const Premium = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [referralInfo, setReferralInfo] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const response = await api.getUserData();
        if (response.ok) {
          const result = await response.json();
          setIsPremium(result.user.is_premium);
          setTariffs(result.tariffs || []);
          setReferralInfo(result.referralInfo);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user]);

  if (!user) return null;

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${ADMIN_USERNAME}`);
    toast({
      title: "Nusxalandi!",
      description: `@${ADMIN_USERNAME} nusxalandi`,
    });
  };

  const handleContactAdmin = () => {
    window.open(`https://t.me/${ADMIN_USERNAME}`, '_blank');
  };

  const handleCopyReferralLink = () => {
    if (referralInfo?.referral_code) {
      const referralLink = `https://t.me/ravonaiweb_bot?start=${referralInfo.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Referal havola nusxalandi!",
        description: "Do'stlaringizga ulashing",
      });
    }
  };

  const features = [
    '✅ Cheksiz kunlik test',
    '✅ Tezroq tahlil natijalari',
    '✅ Batafsil transkripsiya',
    '✅ So\'z-so\'z tahlil',
    '✅ Audio yuklab olish',
    '✅ Prioritet qo\'llab-quvvatlash',
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">Tariflar | Ko'proq foyda olish</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Tariflar
          </h1>
          <p className="text-muted-foreground">
            Premium imkoniyatlar bilan ingliz tilingizni rivojlantiring
          </p>
        </div>

        {/* Current Status */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Joriy tarif</h3>
                <p className="text-sm text-muted-foreground">
                  Siz hozirda {isPremium ? 'Premium' : 'bepul'} rejada foydalanmoqdasiz
                  {isPremium ? ' (cheksiz imkoniyatlar)' : ' (kuniga 3 ta test)'}
                </p>
              </div>
              <Badge variant={isPremium ? "default" : "outline"} className="text-xs">
                {isPremium ? '💎 Premium' : 'Bepul'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tariff Plans */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Tariflar ro'yxati</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tariffs.map((tariff) => (
              <Card
                key={tariff.id}
                className={`border-border hover:shadow-md transition-all duration-200 ${selectedPlan === tariff.id ? 'ring-2 ring-primary' : ''
                  }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tariff.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {tariff.duration_days} kun
                    </Badge>
                  </div>
                  <CardDescription>
                    {tariff.description || 'Premium imkoniyatlar'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {tariff.price.toLocaleString()} so'm
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tariff.duration_days} kunga
                    </div>
                  </div>
                  <div className="space-y-2">
                    {tariff.features && Array.isArray(tariff.features) ? (
                      tariff.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Cheksiz testlar</span>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan(tariff.id);
                      handleContactAdmin();
                    }}
                  >
                    Sotib olish
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🌟 Premium imkoniyatlari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bepul limit olish - Referral */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Bepul limit olish
            </CardTitle>
            <CardDescription>
              Do'stlaringizni taklif qiling va bepul limit oling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-foreground">Referal tizimi</h4>
                  <p className="text-sm text-muted-foreground">
                    Har bir do'stingiz uchun +3 kunlik bepul test
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Taklif qilingan do'stlar</p>
                    <p className="text-xs text-muted-foreground">
                      {referralInfo?.referral_count || 0} ta
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">Qo'shimcha kunlar</p>
                    <p className="text-xs text-muted-foreground">
                      {(referralInfo?.referral_count || 0) * 3} kun
                    </p>
                  </div>
                </div>

                {referralInfo?.referral_code && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Referal havolangiz:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-2 bg-muted rounded-lg text-xs font-mono truncate">
                        https://t.me/ravonaiweb_bot?start={referralInfo.referral_code}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCopyReferralLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to buy */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💳 Tarif sotib olish
            </CardTitle>
            <CardDescription>
              Premium sotib olish uchun admin bilan bog'laning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-4 p-6 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Admin bilan bog'laning</p>
                <div className="flex items-center gap-2 justify-center">
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    @{ADMIN_USERNAME}
                  </Badge>
                  <Button variant="outline" size="icon" onClick={handleCopyUsername}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleContactAdmin}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Admin bilan bog'lanish
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
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

export default Premium;
