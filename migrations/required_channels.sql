-- ============================================================
-- Majburiy Obuna Kanallar Jadvali
-- Supabase SQL Editor da ushbu skriptni bajaring
-- ============================================================

CREATE TABLE IF NOT EXISTS required_channels (
    id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_url TEXT NOT NULL DEFAULT '',
    channel_name TEXT NOT NULL DEFAULT 'Kanal',
    is_private BOOLEAN DEFAULT false,
    invite_link TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index qo'shish (tez qidirish uchun)
CREATE INDEX IF NOT EXISTS idx_required_channels_active
    ON required_channels (is_active);

-- RLS (Row Level Security) ochish — agar kerak bo'lsa
-- ALTER TABLE required_channels ENABLE ROW LEVEL SECURITY;

-- Tekshirish: jadval yaratilganini ko'rish
SELECT * FROM required_channels LIMIT 5;
