-- 🛡️ TENANT SHIELD: Strict Multi-Tenant Isolation for Semantic Search
-- This ensures that facts from one user never leak into another user's bot.

-- 1. Ensure the vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ensure ai_knowledge_base has the embedding column (Fail-safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_knowledge_base' AND column_name = 'embedding') THEN
        ALTER TABLE ai_knowledge_base ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- 3. Redefine the RAG Function with STRICT User Isolation
CREATE OR REPLACE FUNCTION match_knowledge_base (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  category text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ai_knowledge_base.id,
    ai_knowledge_base.content,
    ai_knowledge_base.category,
    1 - (ai_knowledge_base.embedding <=> query_embedding) as similarity
  from ai_knowledge_base
  where 1 - (ai_knowledge_base.embedding <=> query_embedding) > match_threshold
    and ai_knowledge_base.user_id = p_user_id  -- 🛡️ THE TENANT SHIELD
  order by similarity desc
  limit match_count;
end;
$$;

COMMENT ON FUNCTION match_knowledge_base IS 'Semantic search with strict multi-tenant isolation. REQUIRES p_user_id matching.';
