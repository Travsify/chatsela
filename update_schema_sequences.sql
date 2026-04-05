-- =============================================
-- Migration: Bot Sequences & Stateful Sessions
-- =============================================

-- 1. Add sequences to bots table
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS sequences JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure chat_memory table exists and has state tracking
CREATE TABLE IF NOT EXISTS public.chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  current_step TEXT,
  step_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_chat_memory_session ON public.chat_memory (channel_id, customer_phone, created_at DESC);

-- Update RLS if needed (omitted for brevity if already globally accessible by service role)
