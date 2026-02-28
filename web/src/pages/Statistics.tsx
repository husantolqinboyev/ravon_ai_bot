import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Mic, Award } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getAnalyses, type AnalysisRecord } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Statistics = () => {
  const { user, logout } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const data = await getAnalyses(user.telegramUserId);
        setAnalyses(data);
      } catch (error) {
        console.error('Error loading analyses:', error);
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

  // Group by date
  const testsByDate: Record<string, number> = {};
  analyses.forEach(a => {
    const date = new Date(a.createdAt).toLocaleDateString('uz-UZ');
    testsByDate[date] = (testsByDate[date] || 0) + 1;
  });

  // Last 7 days stats
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('uz-UZ');
    last7Days.push({
      date: dateStr,
      count: testsByDate[dateStr] || 0,
    });
  }

  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">📊 Statistika</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Mening Statistikam
          </h1>
          <p className="text-muted-foreground">
            O'rganish jarayoningizni kuzating
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{totalTests}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Jami testlar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{Math.round(totalDuration / 60)}m</p>
                  )}
                  <p className="text-xs text-muted-foreground">Jami vaqt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{avgDuration}s</p>
                  )}
                  <p className="text-xs text-muted-foreground">O'rtacha vaqt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{Object.keys(testsByDate).length}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Faol kunlar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Oxirgi 7 kun
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-end gap-2">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="flex-1 h-full" />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-end gap-2">
                {last7Days.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full rounded-t-lg transition-all duration-300 gradient-primary"
                      style={{ 
                        height: `${Math.max(10, (day.count / maxCount) * 100)}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.date.split('.').slice(0, 2).join('.')}
                    </span>
                    <span className="text-xs font-medium">{day.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🕐 So'nggi faollik
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-8">
                <Mic className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Hali testlar yo'q</p>
                <p className="text-sm text-muted-foreground">
                  Talaffuzni test qilish bo'limiga o'ting
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analyses.slice(0, 10).map((analysis, index) => (
                  <div 
                    key={analysis.id || index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {analysis.transcript?.slice(0, 50) || 'Audio tahlil'}
                        {(analysis.transcript?.length || 0) > 50 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(analysis.createdAt).toLocaleString('uz-UZ')}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {analysis.duration}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Statistics;
