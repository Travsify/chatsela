-- =============================================
-- God-Mode Schema: Advanced Intelligence & Autonomous Engine
-- =============================================

-- 1. Add Missing Intelligence Columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS is_autonomous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS autonomous_instruction TEXT;

-- 2. Create Bot Activity Table for Real-time Monitoring
CREATE TABLE IF NOT EXISTS public.bot_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contact_phone TEXT,
  event_type TEXT CHECK (event_type IN ('scrape', 'tool_call', 'intent', 'system')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS and Configure Policy
ALTER TABLE public.bot_activity ENABLE ROW LEVEL SECURITY;

-- Check and create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own bot activity'
  ) THEN
    CREATE POLICY "Users can view their own bot activity" 
    ON public.bot_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_bot_activity_user_created ON public.bot_activity (user_id, created_at DESC);

-- =============================================
-- Schema Update Complete
-- =============================================
