-- Migration: Update transcripts table schema to match application code
-- Version: 004
-- Description: Update transcripts table columns to match TypeScript interfaces

-- Add new columns
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS transcript_count INTEGER,
ADD COLUMN IF NOT EXISTS transcript_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Copy data from old columns to new columns
UPDATE transcripts 
SET 
  date = month,
  transcript_count = count
WHERE date IS NULL OR transcript_count IS NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE transcripts 
ALTER COLUMN date SET NOT NULL,
ALTER COLUMN transcript_count SET NOT NULL;

-- Add check constraint for transcript_count
ALTER TABLE transcripts 
ADD CONSTRAINT check_transcript_count_positive 
CHECK (transcript_count >= 0);

-- Update unique constraint
ALTER TABLE transcripts DROP CONSTRAINT IF EXISTS transcripts_client_id_month_key;
ALTER TABLE transcripts ADD CONSTRAINT transcripts_client_id_date_key UNIQUE(client_id, date);

-- Update indexes
DROP INDEX IF EXISTS idx_transcripts_month;
DROP INDEX IF EXISTS idx_transcripts_client_month;
CREATE INDEX IF NOT EXISTS idx_transcripts_date ON transcripts(date);
CREATE INDEX IF NOT EXISTS idx_transcripts_client_date ON transcripts(client_id, date);
CREATE INDEX IF NOT EXISTS idx_transcripts_type ON transcripts(transcript_type);
CREATE INDEX IF NOT EXISTS idx_transcripts_created_by ON transcripts(created_by);

-- Insert migration record
INSERT INTO migrations (version, description) VALUES 
('004_update_transcripts_schema', 'Update transcripts table schema to match application code')
ON CONFLICT (version) DO NOTHING;