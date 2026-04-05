-- ChatSela Deep Training & Magic Auto-fill Ecosystem 👑🛡️💰
-- This script adds a structured Service Ledger for absolute pricing accuracy.

-- 1. Services & Pricing Ledger
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(20, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    unit TEXT DEFAULT 'per order', -- e.g. per kg, per hour
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast retrieval 🧭
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);

-- 2. Enhanced Knowledge Base (Categorization & Verification)
ALTER TABLE IF EXISTS ai_knowledge_base
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- manual, scrape, pdf, voice, ai-magic

-- 3. Comment for clarity 🏷️
COMMENT ON TABLE services IS 'Structured ledger for business services and their verified rates.';
