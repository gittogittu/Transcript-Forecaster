-- Migration: Add data_imports table for file upload tracking
-- Description: Create table to track file upload imports and their processing status

-- Data imports table for tracking file uploads
CREATE TABLE IF NOT EXISTS data_imports (
  import_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  options JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_imports_status_created 
  ON data_imports(status, created_at);

CREATE INDEX IF NOT EXISTS idx_data_imports_file_type_created 
  ON data_imports(file_type, created_at);

CREATE INDEX IF NOT EXISTS idx_data_imports_created_desc 
  ON data_imports(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_data_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_imports_updated_at 
    BEFORE UPDATE ON data_imports 
    FOR EACH ROW EXECUTE FUNCTION update_data_imports_updated_at();

-- Add comments for documentation
COMMENT ON TABLE data_imports IS 'Tracks file upload imports and their processing status';
COMMENT ON COLUMN data_imports.status IS 'Import status: pending, processing, completed, failed';
COMMENT ON COLUMN data_imports.options IS 'JSON object containing processing options (cleanData, generateEmbeddings, etc.)';