import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ApiLog {
  id: string;
  telegram_user_id: string | null;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_summary: string | null;
  duration_ms: number | null;
  created_at: string;
}

export function ApiRequestLogs() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getStatusColor = (status: number | null) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400 && status < 500) return 'destructive';
    if (status >= 500) return 'destructive';
    return 'secondary';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500/10 text-blue-600';
      case 'POST': return 'bg-green-500/10 text-green-600';
      case 'PUT': return 'bg-yellow-500/10 text-yellow-600';
      case 'DELETE': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            API So'rovlar
          </CardTitle>
          <CardDescription>Oxirgi 100 ta API so'rov</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>API so'rovlar yo'q</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={`${getMethodColor(log.method)} text-xs font-mono`}>
                      {log.method}
                    </Badge>
                    <Badge variant={getStatusColor(log.status_code)}>
                      {log.status_code || '---'}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{log.endpoint}</p>
                    {log.response_summary && (
                      <p className="text-xs text-muted-foreground truncate">
                        {log.response_summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {log.duration_ms && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.duration_ms}ms
                      </span>
                    )}
                    <span>
                      {new Date(log.created_at).toLocaleString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}