-- 🚀 Update Profiles for Website Widget (v2)
-- Enables the floating WhatsApp icon and provides snippet verification fields.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='widget_icon_enabled') THEN 
    ALTER TABLE public.profiles ADD COLUMN widget_icon_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='website_url') THEN 
    ALTER TABLE public.profiles ADD COLUMN website_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='snippet_verified_at') THEN 
    ALTER TABLE public.profiles ADD COLUMN snippet_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 🧠 Prevent Duplicate Intelligence
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ai_knowledge_base') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type='UNIQUE' AND table_name='ai_knowledge_base' AND constraint_name='ai_knowledge_base_user_id_content_key') THEN
      ALTER TABLE public.ai_knowledge_base ADD CONSTRAINT ai_knowledge_base_user_id_content_key UNIQUE (user_id, content);
    END IF;
  END IF;
END $$;
