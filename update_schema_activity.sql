-- =============================================
-- Bot Activity Logging (God-Mode Visibility)
-- =============================================

CREATE TABLE IF NOT EXISTS public.bot_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contact_phone TEXT,
  event_type TEXT CHECK (event_type IN ('scrape', 'tool_call', 'intent', 'system')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bot_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bot activity" 
  ON public.bot_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Cleanup policy (Optional: Keep only last 1000 logs per user)
-- This is just for visibility, so we don't need infinite history here.

CREATE INDEX IF NOT EXISTS idx_bot_activity_user_created ON public.bot_activity (user_id, created_at DESC);
