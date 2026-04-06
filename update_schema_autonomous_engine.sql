-- 🚀 God-Mode Autonomous Sales Engine Migration
-- Adds 'is_autonomous' toggle and 'autonomous_instruction' to the profiles table.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_autonomous') THEN 
    ALTER TABLE public.profiles ADD COLUMN is_autonomous BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='autonomous_instruction') THEN 
    ALTER TABLE public.profiles ADD COLUMN autonomous_instruction TEXT;
  END IF;
END $$;

-- 📊 Add 'attributes' to 'ai_knowledge_base' to store structured data (price, stock)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge_base' AND column_name='attributes') THEN 
    ALTER TABLE public.ai_knowledge_base ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
