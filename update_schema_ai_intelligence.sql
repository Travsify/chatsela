-- 🧠 AI Intelligence Expansion Schema

-- 1. Knowledge Base Table
-- Stores business-specific data (scraped URLs, custom text, PDFs, etc.)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- e.g. 'https://example.com', 'custom_text', 'manual_entry'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge base" 
  ON public.ai_knowledge_base FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Chat Insights Table
-- Stores AI-generated summaries and metrics for the merchant dashboard
CREATE TABLE IF NOT EXISTS public.chat_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  summary TEXT,
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  intent TEXT, -- 'inquiry', 'purchase', 'complaint'
  value_estimate NUMERIC(10,2), -- Potential sale value
  next_steps TEXT,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat insights" 
  ON public.chat_insights FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_ai_knowledge_user ON public.ai_knowledge_base(user_id);
CREATE INDEX idx_chat_insights_user ON public.chat_insights(user_id);
CREATE INDEX idx_chat_insights_phone ON public.chat_insights(customer_phone);
