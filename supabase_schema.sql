-- =============================================
-- ChatSela Database Schema
-- =============================================

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  business_name TEXT,
  billing_tier TEXT DEFAULT 'starter' CHECK (billing_tier IN ('starter', 'professional', 'business')),
  api_key TEXT UNIQUE,
  api_key_created_at TIMESTAMP WITH TIME ZONE,
  paystack_secret_enc TEXT, -- Encrypted merchant secret
  stripe_secret_enc TEXT,   -- Encrypted merchant secret
  payment_currency TEXT DEFAULT 'USD' CHECK (payment_currency IN ('USD', 'NGN', 'GBP', 'EUR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profiles" 
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profiles" 
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create bots table with Sequences support
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT,
  welcome_message TEXT,
  menu_options TEXT[] DEFAULT '{}',
  sequences JSONB DEFAULT '{}'::jsonb, -- NEW: Multi-step automation flows
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bots" 
  ON public.bots FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create chat_memory table for Stateful Sessions
CREATE TABLE public.chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  current_step TEXT, -- NEW: Current flow step (e.g. 'order:address')
  step_data JSONB DEFAULT '{}'::jsonb, -- NEW: Collected data in current session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_memory_session ON public.chat_memory (channel_id, customer_phone, created_at DESC);

-- Create whatsapp_sessions table
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  whatsapp_name TEXT,
  whapi_token TEXT,
  whapi_channel_id TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions" 
  ON public.whatsapp_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Products Catalog Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'NGN', 'GBP', 'EUR')),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own products" 
  ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id);

-- FAQ Table
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own FAQs" 
  ON public.faqs FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Messages History Table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own message history" 
  ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Handoff Status
CREATE TABLE public.handoff_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contact_phone TEXT NOT NULL,
  bot_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, contact_phone)
);

ALTER TABLE public.handoff_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own handoff statuses" 
  ON public.handoff_status FOR ALL TO authenticated USING (auth.uid() = user_id);

-- External Connectors (Shopify, Woo)
CREATE TABLE public.external_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  platform TEXT CHECK (platform IN ('shopify', 'woocommerce', 'custom')),
  store_url TEXT NOT NULL,
  access_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, platform)
);

ALTER TABLE public.external_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connectors" 
  ON public.external_connectors FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (new.id, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
