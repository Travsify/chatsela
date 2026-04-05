-- Safe Schema Update for Developer API Keys
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Create an index to quickly look up users by their API key when they make requests
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON public.profiles(api_key);

NOTIFY pgrst, 'reload schema';
