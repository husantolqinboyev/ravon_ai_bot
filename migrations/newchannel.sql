-- 1. Kanallar jadvaliga yangi ustunlarni qo'shish
ALTER TABLE public.required_channels 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_link TEXT DEFAULT '';

-- 2. Foydalanuvchilar jadvaliga keshlash ustunini qo'shish
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS channel_links JSONB DEFAULT '{}';

-- 3. Indeksni yangilash
CREATE INDEX IF NOT EXISTS idx_required_channels_active_new ON public.required_channels(is_active);
