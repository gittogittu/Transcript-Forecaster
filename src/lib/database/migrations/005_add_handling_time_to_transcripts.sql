-- Migration: Add handling time to transcripts table
-- Description: Add handling_time_minutes column for AHT calculations

ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS handling_time_minutes DECIMAL(5,2);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transcripts_handling_time ON transcripts(handling_time_minutes) 
WHERE handling_time_minutes IS NOT NULL;