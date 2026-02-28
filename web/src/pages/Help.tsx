import { HelpCircle, MessageCircle, ExternalLink, Mic, BarChart3, Crown, Users, ArrowLeft, Volume2, User, CreditCard } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';

// Admin and channel info
const ADMIN_USERNAME = 'khamidovsanat';
const CHANNEL_USERNAME = 'englishwithSanatbek';

const Help = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const faqItems = [
    {
      question: "Bot qanday ishlaydi?",
      answer: "Ravon AI bot - bu ingliz tili talaffuzingizni sun'iy intellekt yordamida tahlil qiluvchi tizim. Siz matn tanlab o'zingiz gapirsangiz, AI talaffuzingizni 4 ta ko'rsatkich bo'yicha baholaydi: to'g'rilik, ravonlik, to'liqlik va ohang."
    },
    {
      question: "Talaffuzni tekshirish qanday ishlaydi?",
      answer: "Ikkita usul bor: 1) O'zingiz matn yozib, unga mos audio yuborasiz. 2) Bazadan tasodifiy matn tanlab, unga mos audio yuborasiz. AI matn bilan sizning talaffuzingizni solishtirib, baho beradi."
    },
    {
      question: "Matnni ovozga aylantirish qanday ishlaydi?",
      answer: "Matn kiriting, jinsni tanlang (erkak/ayol ovozi), va 'Ovozga aylantirish' tugmasini bosing. Bot matnni audio faylga aylantirib beradi. Bepul foydalanuvchilar kuniga 5 marta, Premium foydalanuvchilar 50 marta foydalanishi mumkin."
    },
    {
      question: "Kunlik limit nima?",
      answer: "Bepul foydalanuvchilar kuniga 3 marta talaffuz testi va 5 marta matnni ovozga aylantirish imkoniyatiga ega. Premium foydalanuvchilar uchun cheklov yo'q - cheksiz foydalanish mumkin."
    },
    {
      question: "Tariflar qanday ishlaydi?",
      answer: "Turli muddatli tariflar mavjud (7, 30, 90 kun). Premium sotib olish uchun admin bilan bog'laning. To'lov tasdiqlangandan so'ng premium faollashadi va barcha cheklovlar olib tashlanadi."
    },
    {
      question: "Profilda nimalar bor?",
      answer: "Profilingizda: shaxsiy ma'lumotlar (ism, ID, joriy tarif), natijalar (foydalanish soni, o'rtacha ball), top foydalanuvchilar reytingi, admin bilan bog'lanish imkoniyati mavjud."
    },
    {
      question: "Referal tizimi qanday ishlaydi?",
      answer: "'Bepul limit olish' tugmasini bosib referal havolangizni oling. Do'stlaringizni havola orqali taklif qiling. Har bir do'stingiz uchun +3 kunlik bepul test limiti olasiz."
    },
    {
      question: "Tahlil natijalari nima anglatadi?",
      answer: "Accuracy (To'g'rilik) - so'zlarning to'g'ri talaffuz qilinishi. Fluency (Ravonlik) - gapirish tezligi va ritmi. Completeness (To'liqlik) - barcha so'zlar aytilganmi. Prosody (Ohang) - urg'u va intonatsiya. 100/100 tizimida baholanadi."
    },
  ];

  const features = [
    {
      icon: Mic,
      title: "Talafuz tekshirish",
      description: "O'zingiz yozing yoki tasodifiy tanlang"
    },
    {
      icon: Volume2,
      title: "Matnni ovozga aylantirish",
      description: "Matnni audio faylga aylantiring"
    },
    {
      icon: User,
      title: "Profil",
      description: "Ma'lumotlar va statistika"
    },
    {
      icon: CreditCard,
      title: "Tariflar",
      description: "Premium imkoniyatlar"
    },
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Bot qanday ishlaydi?</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Bot qanday ishlaydi?
          </h1>
          <p className="text-muted-foreground">
            Qo'llanma va ko'p so'raladigan savollar
          </p>
        </div>

        {/* Main Features Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 Bot qanday ishlaydi?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                <div>
                  <h4 className="font-medium text-foreground">Asosiy menyu</h4>
                  <p className="text-sm text-muted-foreground">
                    Botga kirganda sizga 5 ta asosiy bo'lim ko'rinadi: Talaffuz tekshirish, Matnni ovozga aylantirish, Profil, Tariflar, Yordam
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                <div>
                  <h4 className="font-medium text-foreground">Bo'limni tanlang</h4>
                  <p className="text-sm text-muted-foreground">
                    Kerakli bo'limni tanlang va ko'rsatmalarga amal qiling
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                <div>
                  <h4 className="font-medium text-foreground">Natijalarni oling</h4>
                  <p className="text-sm text-muted-foreground">
                    AI tahlilini oling, o'rganing va rivojlaning
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ❓ Ko'p so'raladigan savollar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📞 Bog'lanish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Admin</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Savollar va premium uchun
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://t.me/${ADMIN_USERNAME}`, '_blank')}
                >
                  @{ADMIN_USERNAME}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                  <span className="font-medium text-foreground">Kanal</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Yangiliklar va darslar
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://t.me/${CHANNEL_USERNAME}`, '_blank')}
                >
                  @{CHANNEL_USERNAME}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💡 Foydali maslahatlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Yaxshi audio sifati uchun sokin joyda gapiring
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Har bir test 30 soniyadan oshmasligi kerak
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Aniq va ravon gapiring, shoshilmang
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Tahlil natijalarini diqqat bilan o'qing va takroriy mashq qiling
                </span>
              </li>
            </ul>
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

export default Help;
