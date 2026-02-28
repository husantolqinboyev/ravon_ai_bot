import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ArrowRight } from 'lucide-react';

interface CodeLoginProps {
  onVerify: (code: string) => Promise<boolean>;
  isLoading: boolean;
  botName: string;
}

export function CodeLogin({ onVerify, isLoading, botName }: CodeLoginProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Kod 6 ta raqamdan iborat bo\'lishi kerak');
      return;
    }

    const success = await onVerify(code);
    if (!success) {
      setError('Kod noto\'g\'ri yoki muddati tugagan');
      setCode('');
    }
  };

  const openBot = () => {
    window.open(`https://t.me/${botName}?start=login`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Open Bot */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
          Telegram botga o'ting
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={openBot}
          className="w-full gap-2"
        >
          <Send className="h-5 w-5" />
          @{botName} ni ochish
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Botga /start yuboring va 6 raqamli kod oling
        </p>
      </div>

      {/* Step 2: Enter Code */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
          Kodni kiriting
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="6 raqamli kod"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setCode(value);
              setError('');
            }}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            disabled={isLoading}
          />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={code.length !== 6 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Tekshirilmoqda...
              </>
            ) : (
              'Kirish'
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          Kod 5 daqiqa davomida amal qiladi
        </p>
      </div>
    </div>
  );
}
