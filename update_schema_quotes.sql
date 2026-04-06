-- ==============================================================================
-- 🚀 CHATSELA AGI v3 - DYNAMIC QUOTING & LOGISTICS SCHEMAS
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Create the `quote_settings` table
-- This stores the global logic preferences for a merchant's quoting engine
CREATE TABLE IF NOT EXISTS public.quote_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_mode TEXT DEFAULT 'internal_table', -- Options: 'internal_table', 'external_webhook'
    webhook_url TEXT,
    webhook_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- RLS for quote_settings
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quote settings" ON public.quote_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quote settings" ON public.quote_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quote settings" ON public.quote_settings
    FOR UPDATE USING (auth.uid() = user_id);


-- 2. Create the `shipping_rates` table
-- This stores the individual location rates for 'internal_table' mode
CREATE TABLE IF NOT EXISTS public.shipping_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_zone TEXT NOT NULL,       -- e.g., 'USA', 'New York'
    destination_zone TEXT NOT NULL,  -- e.g., 'UK', 'London'
    base_fee NUMERIC DEFAULT 0,      -- Flat fee applied once
    rate_per_kg NUMERIC NOT NULL,    -- Variable fee per unit weight
    currency TEXT DEFAULT 'USD',
    delivery_time_estimate TEXT,     -- e.g., '3-5 business days'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for shipping_rates
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipping rates" ON public.shipping_rates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipping rates" ON public.shipping_rates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipping rates" ON public.shipping_rates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shipping rates" ON public.shipping_rates
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Add automatic updated_at trigger for quote_settings
CREATE OR REPLACE FUNCTION update_quote_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quote_settings_updated_at ON public.quote_settings;
CREATE TRIGGER trigger_quote_settings_updated_at
    BEFORE UPDATE ON public.quote_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_settings_updated_at();

-- Enable Realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE quote_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE shipping_rates;

SELECT '✅ AGI Quoting schemas instantiated successfully!' as status;
