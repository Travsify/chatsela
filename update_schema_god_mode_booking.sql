-- 📅 ChatSela God-Mode Booking Schema Extension
-- 1. Add booking_url to profiles for custom provider links (Cal.com, Calendly, etc.)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- 2. Create bookings table for native ChatSela lead capture
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  proposed_time TEXT NOT NULL, -- Flexible string (e.g., "Monday at 4pm")
  details TEXT, -- Any additional info from the conversation
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS Policies for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookings" 
  ON public.bookings FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings(customer_phone);
