-- Add channel_links column to users table
-- Run this in Supabase SQL editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS channel_links JSONB DEFAULT '{}';

-- Index for performance (optional, JSONB can be slow for large datasets but fine for this)
-- CREATE INDEX IF NOT EXISTS idx_users_channel_links ON users USING GIN (channel_links);
