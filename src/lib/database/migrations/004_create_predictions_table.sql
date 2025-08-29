-- Update existing predictions table structure
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS forecast_value INTEGER,
ADD COLUMN IF NOT EXISTS confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
ADD COLUMN IF NOT EXISTS forecast_period VARCHAR(100),
ADD COLUMN IF NOT EXISTS accuracy_score INTEGER CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for predictions table
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    report_name VARCHAR(500) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    download_url VARCHAR(1000),
    file_size VARCHAR(50),
    report_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

-- Add handling_time_minutes column to transcripts if it doesn't exist
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS handling_time_minutes DECIMAL(10,2);

-- Add updated_at trigger for predictions
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_predictions_updated_at();

-- Add updated_at trigger for reports
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();