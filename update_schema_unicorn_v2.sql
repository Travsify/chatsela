-- ChatSela Unicorn V2: Global Commerce & Payment Intelligence
-- This script adds support for custom exchange rates and real-time payment verification.

-- 1. Currency & Rate Settings for Profiles
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS target_currency TEXT DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 4) DEFAULT 1600.00,
ADD COLUMN IF NOT EXISTS manual_rate_active BOOLEAN DEFAULT TRUE;

-- 2. Payments Verification Table
-- This tracks transactions from Stripe/Paystack for the AI to verify.
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    provider TEXT, -- stripe, paystack
    reference TEXT UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast lookups by AI
CREATE INDEX IF NOT EXISTS idx_payments_customer_phone ON payments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- 3. Comment for clarity
COMMENT ON TABLE payments IS 'Tracks real-time transactions for AI payment confirmation logic.';
