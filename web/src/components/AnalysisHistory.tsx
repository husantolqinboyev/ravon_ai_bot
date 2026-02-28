import { useEffect, useState } from 'react';
import { Trash2, Clock, FileAudio, Target, Waves, FileCheck, Music, MessageSquare, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getAnalyses, deleteAnalysis, type AnalysisRecord } from '@/lib/db';
import { format } from 'date-fns';

interface AnalysisHistoryProps {
  refreshTrigger: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

const getScoreBadge = (score: number) => {
  if (score >= 90) return { label: "A'lo", variant: 'default' as const };
  if (score >= 80) return { label: "Yaxshi", variant: 'secondary' as const };
  if (score >= 60) return { label: "O'rta", variant: 'outline' as const };
  return { label: "Yaxshilash kerak", variant: 'destructive' as const };
};

export function AnalysisHistory({ refreshTrigger }: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalyses = async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, [refreshTrigger]);

  const handleDelete = async (id: number) => {
    await deleteAnalysis(id);
    await loadAnalyses();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse scores from analysis text if available
  const parseScores = (analysis: string) => {
    const scores: { accuracy?: number; fluency?: number; completeness?: number; prosody?: number; overall?: number } = {};
    
    // Try to find JSON in analysis
    const jsonMatch = analysis.match(/\{[\s\S]*?"scores"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.scores) return parsed.scores;
      } catch {}
    }
    
    return null;
  };

  if (loading) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-primary" />
            Tarix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-primary" />
            Tarix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Mic2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Hali tahlillar yo'q. Ovoz yozib, tahlil qiling!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-primary" />
          Tarix ({analyses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Accordion type="single" collapsible className="px-4 pb-4">
            {analyses.map((record, index) => {
              const scores = parseScores(record.analysis);
              
              return (
                <AccordionItem key={record.id} value={`item-${record.id}`} className="border rounded-lg mb-2 bg-muted/30 px-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 w-full text-left">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                        <Mic2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm')}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{formatDuration(record.duration)}</span>
                          {scores?.overall && (
                            <Badge {...getScoreBadge(scores.overall)} className="ml-auto">
                              {scores.overall}%
                            </Badge>
                          )}
                        </div>
                        {record.transcript && (
                          <p className="text-sm text-foreground/80 mt-1 line-clamp-1 pr-4">
                            {record.transcript}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Transcript */}
                      {record.transcript && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Matn:
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "{record.transcript}"
                          </p>
                        </div>
                      )}

                      {/* Scores Grid */}
                      {scores && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-background rounded-lg border space-y-2">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium">To'g'rilik</span>
                              <span className={`ml-auto text-sm font-bold ${getScoreColor(scores.accuracy || 0)}`}>
                                {scores.accuracy || 0}%
                              </span>
                            </div>
                            <Progress value={scores.accuracy || 0} className="h-2" />
                          </div>
                          
                          <div className="p-3 bg-background rounded-lg border space-y-2">
                            <div className="flex items-center gap-2">
                              <Waves className="h-4 w-4 text-secondary" />
                              <span className="text-xs font-medium">Ravonlik</span>
                              <span className={`ml-auto text-sm font-bold ${getScoreColor(scores.fluency || 0)}`}>
                                {scores.fluency || 0}%
                              </span>
                            </div>
                            <Progress value={scores.fluency || 0} className="h-2" />
                          </div>
                          
                          <div className="p-3 bg-background rounded-lg border space-y-2">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-accent" />
                              <span className="text-xs font-medium">To'liqlik</span>
                              <span className={`ml-auto text-sm font-bold ${getScoreColor(scores.completeness || 0)}`}>
                                {scores.completeness || 0}%
                              </span>
                            </div>
                            <Progress value={scores.completeness || 0} className="h-2" />
                          </div>
                          
                          <div className="p-3 bg-background rounded-lg border space-y-2">
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-info" />
                              <span className="text-xs font-medium">Ohang</span>
                              <span className={`ml-auto text-sm font-bold ${getScoreColor(scores.prosody || 0)}`}>
                                {scores.prosody || 0}%
                              </span>
                            </div>
                            <Progress value={scores.prosody || 0} className="h-2" />
                          </div>
                        </div>
                      )}

                      {/* Analysis/Feedback */}
                      <div className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          Tavsiyalar:
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {record.analysis}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            O'chirish
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu tahlilni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                            <AlertDialogAction onClick={() => record.id && handleDelete(record.id)}>
                              O'chirish
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
