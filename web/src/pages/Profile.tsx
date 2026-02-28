import { useState, useEffect } from 'react';
import { User, Calendar, BarChart3, Clock, Crown, Mic, Trophy, Users, MessageSquare, ArrowLeft, Star } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getAnalyses, type AnalysisRecord } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [userDataResponse, leaderboardResponse] = await Promise.all([
          api.getUserData(),
          api.getLeaderboard()
        ]);

        if (userDataResponse.ok) {
          const result = await userDataResponse.json();
          setIsPremium(result.user.is_premium);
          setUserStats(result.stats);
        }

        if (leaderboardResponse.ok) {
          const result = await leaderboardResponse.json();
          setTopUsers(result);
        }

        const analysesData = await getAnalyses(user.telegramUserId);
        setAnalyses(analysesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (!user) return null;

  // Calculate stats
  const totalTests = analyses.length;
  const totalDuration = analyses.reduce((sum, a) => sum + (a.duration || 0), 0);
  const avgDuration = totalTests > 0 ? Math.round(totalDuration / totalTests) : 0;

  // Daily limit
  const today = new Date().toDateString();
  const todayTests = analyses.filter(a => new Date(a.createdAt).toDateString() === today).length;
  const dailyLimit = isPremium ? 50 : 3;
  const remainingTests = Math.max(0, dailyLimit - todayTests);

  // Average score from user stats or calculate from analyses
  const avgScore = userStats?.avg_overall || 0;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Profil</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Mening Profilim
          </h1>
        </div>

        {/* User Card */}
        <Card className="border-border overflow-hidden">
          <div className="h-20 gradient-primary" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col items-center -mt-10">
              <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center overflow-hidden">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold text-foreground">
                {user.firstName} {user.lastName || ''}
              </h2>
              {user.username && (
                <p className="text-muted-foreground">@{user.username}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isPremium ? "default" : "outline"} className="text-xs">
                  {isPremium ? "💎 Premium" : "Bepul foydalanuvchi"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ma'lumotlarim */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Ma'lumotlarim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Foydalanuvchi nomi</span>
                <span className="font-medium">{user.firstName} {user.lastName || ''}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">ID raqami</span>
                <span className="font-mono text-sm">{user.telegramUserId}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Joriy tarif</span>
                <Badge variant={isPremium ? "default" : "outline"}>
                  {isPremium ? "💎 Premium" : "Bepul"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Tarif muddati</span>
                <span className="font-medium">
                  {isPremium ? "Cheksiz" : "Cheklangan"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Natijalarim */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Natijalarim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalTests}</div>
                <div className="text-xs text-muted-foreground">Botdan foydalanish</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{avgScore}/100</div>
                <div className="text-xs text-muted-foreground">O'rtacha ball</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{todayTests}</div>
                <div className="text-xs text-muted-foreground">Bugungi testlar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{avgDuration}s</div>
                <div className="text-xs text-muted-foreground">O'rtacha vaqt</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top foydalanuvchilar */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Top foydalanuvchilar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUsers.slice(0, 5).map((topUser, index) => (
                <div key={topUser.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <span className="text-sm font-bold text-primary">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {topUser.name}
                      </p>
                      {topUser.username && (
                        <p className="text-xs text-muted-foreground">
                          @{topUser.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{topUser.total || 0}</p>
                    <p className="text-xs text-muted-foreground">tahlil</p>
                  </div>
                </div>
              ))}
              {topUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Hali hech kim top foydalanuvchiga aylanmagan
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin bilan bog'lanish */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Admin bilan bog'lanish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-3">
                Quyidagi holatlarda admin bilan bog'lanishingiz mumkin:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Texnik muammolar va xatoliklar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Tarif sotib olish masalalari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Takliflar va shikoyatlar</span>
                </li>
              </ul>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate('/help')}
            >
              Yordam olish
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

export default Profile;
