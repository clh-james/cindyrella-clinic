-- ==============================================================================
-- Migration 0056: Paper Waiver Photo Upload & Dual-Option Consent System
-- Allows both paperless iPad signing and physical paper waiver photo upload
-- ==============================================================================

-- 1. Extend customer_waivers table with waiver_mode, paper_document_url, and notes
ALTER TABLE customer_waivers 
ADD COLUMN IF NOT EXISTS waiver_mode TEXT NOT NULL DEFAULT 'digital',
ADD COLUMN IF NOT EXISTS paper_document_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Ensure signature_data_url is nullable for pure paper uploads
ALTER TABLE customer_waivers ALTER COLUMN signature_data_url DROP NOT NULL;

-- 3. Add index on waiver_mode
CREATE INDEX IF NOT EXISTS idx_customer_waivers_waiver_mode ON customer_waivers(waiver_mode);

