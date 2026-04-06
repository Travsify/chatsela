-- 🚀 God-Mode Intelligence Migration (Phase 2)
-- Adds 'website_url' and ensures 'is_autonomous' is present.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='website_url') THEN 
    ALTER TABLE public.profiles ADD COLUMN website_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_autonomous') THEN 
    ALTER TABLE public.profiles ADD COLUMN is_autonomous BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='autonomous_instruction') THEN 
    ALTER TABLE public.profiles ADD COLUMN autonomous_instruction TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='exchange_rate') THEN 
    ALTER TABLE public.profiles ADD COLUMN exchange_rate DECIMAL(12, 4) DEFAULT 1600.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='target_currency') THEN 
    ALTER TABLE public.profiles ADD COLUMN target_currency TEXT DEFAULT 'NGN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='base_currency') THEN 
    ALTER TABLE public.profiles ADD COLUMN base_currency TEXT DEFAULT 'USD';
  END IF;
END $$;

-- 📊 Ensure 'attributes' exists in 'ai_knowledge_base'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge_base' AND column_name='attributes') THEN 
    ALTER TABLE public.ai_knowledge_base ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
