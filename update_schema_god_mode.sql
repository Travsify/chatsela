-- 🚀 God-Mode Intelligence Migration (Phase 1)
-- Enables Semantic RAG and Self-Healing Knowledge Gaps

-- 1. Enable pgvector extension (Required for Embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add 'category' and 'embedding' to 'ai_knowledge_base' if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge_base' AND column_name='category') THEN 
    ALTER TABLE public.ai_knowledge_base ADD COLUMN category TEXT DEFAULT 'general';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge_base' AND column_name='embedding') THEN 
    ALTER TABLE public.ai_knowledge_base ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- 3. Create Postgres Function for Similarity Search
CREATE OR REPLACE FUNCTION match_knowledge_base (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  category text,
  source text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ai_knowledge_base.id,
    ai_knowledge_base.content,
    ai_knowledge_base.category,
    ai_knowledge_base.source,
    1 - (ai_knowledge_base.embedding <=> query_embedding) AS similarity
  FROM ai_knowledge_base
  WHERE ai_knowledge_base.user_id = p_user_id
  AND 1 - (ai_knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 4. Create 'knowledge_gaps' Table for the Self-Healing Loop
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  question TEXT NOT NULL,
  context_memory JSONB DEFAULT '[]'::jsonb, -- Last few messages for context
  status TEXT DEFAULT 'pending', -- pending, resolved
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their knowledge gaps" 
  ON public.knowledge_gaps FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- Optional: Create Index for vector search (HNSW or IVFFlat)
-- Leaving out strict index for now as row count is small, but good for scaling
