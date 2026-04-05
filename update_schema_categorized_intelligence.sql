-- Add category support for Knowledge Vault organization
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS category text;

-- Update existing facts to 'general' if null
UPDATE ai_knowledge_base SET category = 'general' WHERE category IS NULL;
