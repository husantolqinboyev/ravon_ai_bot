import { useState } from 'react';
import { Mic, Square, Pause, Play, Send, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onAnalyze: (audioBlob: Blob, duration: number) => Promise<void>;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export function AudioRecorder({ onAnalyze, isAnalyzing, disabled = false }: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording
  } = useAudioRecorder();

  const [error, setError] = useState<string | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      await startRecording();
    } catch (err) {
      setError("Mikrofondan foydalanish uchun ruxsat bering");
    }
  };

  const handleAnalyze = async () => {
    if (audioBlob) {
      await onAnalyze(audioBlob, duration);
      resetRecording();
    }
  };

  return (
    <Card className="border-2 border-border bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-6">
          {/* Timer Display */}
          <div className="text-4xl font-mono font-bold text-foreground">
            {formatDuration(duration)}
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-center justify-center gap-1 h-16 w-full max-w-xs">
            {isRecording && !isPaused ? (
              [...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))
            ) : audioBlob ? (
              <div className="flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-muted-foreground rounded-full"
                    style={{ height: `${30 + Math.random() * 70}%` }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Yozishni boshlash uchun mikrofon tugmasini bosing
              </p>
            )}
          </div>

          {/* Audio Playback */}
          {audioUrl && !isRecording && (
            <audio src={audioUrl} controls className="w-full max-w-xs" />
          )}

          {/* Error Message */}
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                onClick={handleStartRecording}
                disabled={disabled}
                className="rounded-full h-16 w-16"
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}

            {isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="rounded-full h-12 w-12"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="rounded-full h-16 w-16"
                >
                  <Square className="h-6 w-6" />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetRecording}
                  className="rounded-full h-12 w-12"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="rounded-full h-16 w-16"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </Button>
              </>
            )}
          </div>

          {isAnalyzing && (
            <p className="text-muted-foreground text-sm animate-pulse">
              Tahlil qilinmoqda...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
