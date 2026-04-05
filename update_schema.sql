-- Safe Schema Update for Multi-Tenant WhatsApp Sessions
-- This will only add the missing columns if they don't already exist.

ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
ADD COLUMN IF NOT EXISTS whapi_token TEXT,
ADD COLUMN IF NOT EXISTS whapi_channel_id TEXT;

-- Force Supabase PostgREST to recognize the new columns immediately
NOTIFY pgrst, 'reload schema';
