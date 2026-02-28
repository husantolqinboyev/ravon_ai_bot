import { Mic, User, CreditCard, HelpCircle, Home, Volume2, BarChart3, Users2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const menuItems = [
    {
      icon: Mic,
      label: '🎙 Talaffuzni tekshirish',
      description: 'Ingliz talaffuzini tekshiring',
      emoji: '🎙',
      path: '/pronunciation'
    },
    {
      icon: Volume2,
      label: '🔊 Matnni ovozga aylantirish',
      description: 'Matnni audiga aylantiring',
      emoji: '🔊',
      path: '/tts'
    },
    {
      icon: User,
      label: '👤 Profil va Natijalar',
      description: 'Shaxsiy statistika va reyting',
      emoji: '👤',
      path: '/profile'
    },
    {
      icon: BarChart3,
      label: '📊 Umumiy Statistika',
      description: 'Botdan foydalanish ko\'rsatkichlari',
      emoji: '📊',
      path: '/stats'
    },
    {
      icon: CreditCard,
      label: '💳 Tariflar | Premium',
      description: 'Cheksiz imkoniyatlarga ega bo\'ling',
      emoji: '💳',
      path: '/premium'
    },
    {
      icon: Users2,
      label: '🎁 Bepul limit olish',
      description: 'Do\'stlarni taklif qiling',
      emoji: '🎁',
      path: '/referral'
    },
    {
      icon: HelpCircle,
      label: '❓ Bot qanday ishlaydi?',
      description: 'Qo\'llanma va yordam',
      emoji: '❓',
      path: '/help'
    }
  ];

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Asosiy Menyu</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
            Ravon AI Web Panel
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Ingliz tili talaffuzini o'rganish va rivojlantirish uchun barcha vositalar bir joyda
          </p>
        </div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuItems.map((item, index) => (
            <Card
              key={index}
              className="border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card/50 backdrop-blur-sm group"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <span className="text-3xl">{item.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground italic">
            "Muvaffaqiyat kaliti - muntazam mashg'ulotda!" 🚀
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
