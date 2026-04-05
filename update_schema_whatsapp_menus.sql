-- Add interactive WhatsApp menu structures to the Bots table
ALTER TABLE public.bots ADD COLUMN welcome_message TEXT;
ALTER TABLE public.bots ADD COLUMN menu_options JSONB;

-- Create chat_memory table
CREATE TABLE IF NOT EXISTS public.chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for quickly fetching history by customer and channel
CREATE INDEX IF NOT EXISTS idx_chat_memory_customer ON public.chat_memory(customer_phone, channel_id);

-- Apply RLS
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;

-- Note: We rely on server actions/webhooks to manage chat memory safely using Service Role, 
-- but if users need read access we can do:
CREATE POLICY "Users can read own chat memory" 
  ON public.chat_memory FOR SELECT 
  TO authenticated
  USING (
    channel_id IN (
      SELECT whapi_channel_id FROM public.whatsapp_sessions WHERE user_id = auth.uid()
    )
  );

-- Reload PostgREST Cache so the API recognizes the columns instantly
NOTIFY pgrst, 'reload schema';

-- Also update the main schema definition for future reference
