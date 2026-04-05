-- =============================================
-- Migration: External Connectors (Shopify, Woo)
-- =============================================

CREATE TABLE IF NOT EXISTS public.external_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  platform TEXT CHECK (platform IN ('shopify', 'woocommerce', 'custom')),
  store_url TEXT NOT NULL,
  access_token TEXT, -- Encrypted in production ideally
  client_id TEXT,    -- Used for OAuth or specialized keys
  client_secret TEXT, -- Used for Woo secret
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, platform)
);

ALTER TABLE public.external_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connectors" 
  ON public.external_connectors FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- Update bot table with industry/scraper cache if needed
-- ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS external_synced BOOLEAN DEFAULT false;
