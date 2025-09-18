-- Migration: Add AHT and Client Data Support
-- Created: 2025-01-03T12:03:00.000Z
-- Description: Add support for AHT metrics and client-specific monthly transcript data

-- Add AHT metrics to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS overall_aht DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS review_aht DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS validation_aht DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'prod', -- 'prod', 'uat'
ADD COLUMN IF NOT EXISTS client_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for client metrics
CREATE INDEX IF NOT EXISTS idx_clients_environment ON clients(environment);
CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

-- Create monthly transcript data table
CREATE TABLE IF NOT EXISTS monthly_transcript_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_code VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  month_key VARCHAR(10) NOT NULL, -- 'Jun-2024', 'Jul-2024', etc.
  transcript_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id, year, month)
);

-- Create indexes for monthly data
CREATE INDEX idx_monthly_transcript_client ON monthly_transcript_data(client_id, year, month);
CREATE INDEX idx_monthly_transcript_date ON monthly_transcript_data(year, month);
CREATE INDEX idx_monthly_transcript_code ON monthly_transcript_data(client_code);
CREATE INDEX idx_monthly_transcript_count ON monthly_transcript_data(transcript_count);

-- Create client analytics summary table
CREATE TABLE IF NOT EXISTS client_analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_code VARCHAR(50) NOT NULL,
  
  -- AHT metrics
  overall_aht DECIMAL(8,2),
  review_aht DECIMAL(8,2),
  validation_aht DECIMAL(8,2),
  
  -- Total metrics across all months
  total_transcripts INTEGER DEFAULT 0,
  months_active INTEGER DEFAULT 0,
  first_active_month DATE,
  last_active_month DATE,
  
  -- Statistical metrics
  avg_monthly_transcripts DECIMAL(10,4),
  median_monthly_transcripts DECIMAL(10,4),
  std_monthly_transcripts DECIMAL(10,4),
  min_monthly_transcripts INTEGER,
  max_monthly_transcripts INTEGER,
  
  -- Growth metrics
  peak_month DATE,
  peak_month_count INTEGER,
  growth_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable', 'volatile'
  
  -- Seasonality indicators
  has_seasonality BOOLEAN DEFAULT false,
  seasonal_pattern JSONB, -- Store seasonal analysis results
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id)
);

-- Create indexes for analytics summary
CREATE INDEX idx_client_analytics_code ON client_analytics_summary(client_code);
CREATE INDEX idx_client_analytics_total ON client_analytics_summary(total_transcripts DESC);
CREATE INDEX idx_client_analytics_avg ON client_analytics_summary(avg_monthly_transcripts DESC);

-- Create function to calculate client analytics
CREATE OR REPLACE FUNCTION calculate_client_analytics(p_client_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_growth_trend VARCHAR(20);
  v_seasonal_pattern JSONB;
BEGIN
  -- Calculate basic statistics
  SELECT 
    COUNT(*) as months_active,
    SUM(transcript_count) as total_transcripts,
    AVG(transcript_count) as avg_monthly,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY transcript_count) as median_monthly,
    STDDEV(transcript_count) as std_monthly,
    MIN(transcript_count) as min_monthly,
    MAX(transcript_count) as max_monthly,
    MIN(MAKE_DATE(year, month, 1)) as first_month,
    MAX(MAKE_DATE(year, month, 1)) as last_month
  INTO v_stats
  FROM monthly_transcript_data
  WHERE client_id = p_client_id AND transcript_count > 0;
  
  -- Determine growth trend (simplified)
  WITH monthly_data AS (
    SELECT year, month, transcript_count,
           LAG(transcript_count) OVER (ORDER BY year, month) as prev_count
    FROM monthly_transcript_data
    WHERE client_id = p_client_id AND transcript_count > 0
    ORDER BY year, month
  ),
  growth_changes AS (
    SELECT 
      CASE 
        WHEN prev_count IS NULL THEN 0
        WHEN transcript_count > prev_count THEN 1
        WHEN transcript_count < prev_count THEN -1
        ELSE 0
      END as change_direction
    FROM monthly_data
    WHERE prev_count IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN AVG(change_direction) > 0.3 THEN 'increasing'
      WHEN AVG(change_direction) < -0.3 THEN 'decreasing'
      WHEN STDDEV(change_direction) > 0.8 THEN 'volatile'
      ELSE 'stable'
    END
  INTO v_growth_trend
  FROM growth_changes;
  
  -- Simple seasonality detection (check if certain months consistently higher/lower)
  WITH seasonal_analysis AS (
    SELECT 
      month,
      AVG(transcript_count) as avg_for_month,
      COUNT(*) as month_occurrences
    FROM monthly_transcript_data
    WHERE client_id = p_client_id AND transcript_count > 0
    GROUP BY month
    HAVING COUNT(*) >= 2 -- Need at least 2 occurrences
  )
  SELECT json_object_agg(month, avg_for_month)
  INTO v_seasonal_pattern
  FROM seasonal_analysis;
  
  -- Insert or update analytics summary
  INSERT INTO client_analytics_summary (
    client_id, client_code, total_transcripts, months_active,
    first_active_month, last_active_month,
    avg_monthly_transcripts, median_monthly_transcripts, std_monthly_transcripts,
    min_monthly_transcripts, max_monthly_transcripts,
    growth_trend, seasonal_pattern,
    peak_month, peak_month_count,
    has_seasonality
  )
  SELECT 
    p_client_id,
    c.client_code,
    v_stats.total_transcripts,
    v_stats.months_active,
    v_stats.first_month,
    v_stats.last_month,
    v_stats.avg_monthly,
    v_stats.median_monthly,
    v_stats.std_monthly,
    v_stats.min_monthly,
    v_stats.max_monthly,
    v_growth_trend,
    v_seasonal_pattern,
    (SELECT MAKE_DATE(year, month, 1) FROM monthly_transcript_data 
     WHERE client_id = p_client_id ORDER BY transcript_count DESC LIMIT 1),
    v_stats.max_monthly,
    (v_seasonal_pattern IS NOT NULL AND jsonb_array_length(jsonb_object_keys(v_seasonal_pattern)) > 3)
  FROM clients c WHERE c.id = p_client_id
  ON CONFLICT (client_id) 
  DO UPDATE SET
    total_transcripts = EXCLUDED.total_transcripts,
    months_active = EXCLUDED.months_active,
    first_active_month = EXCLUDED.first_active_month,
    last_active_month = EXCLUDED.last_active_month,
    avg_monthly_transcripts = EXCLUDED.avg_monthly_transcripts,
    median_monthly_transcripts = EXCLUDED.median_monthly_transcripts,
    std_monthly_transcripts = EXCLUDED.std_monthly_transcripts,
    min_monthly_transcripts = EXCLUDED.min_monthly_transcripts,
    max_monthly_transcripts = EXCLUDED.max_monthly_transcripts,
    growth_trend = EXCLUDED.growth_trend,
    seasonal_pattern = EXCLUDED.seasonal_pattern,
    peak_month = EXCLUDED.peak_month,
    peak_month_count = EXCLUDED.peak_month_count,
    has_seasonality = EXCLUDED.has_seasonality,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create view for client dashboard
CREATE OR REPLACE VIEW client_dashboard_view AS
SELECT 
  c.id,
  c.name,
  c.client_code,
  c.environment,
  c.overall_aht,
  c.review_aht,
  c.validation_aht,
  cas.total_transcripts,
  cas.months_active,
  cas.avg_monthly_transcripts,
  cas.growth_trend,
  cas.has_seasonality,
  cas.peak_month,
  cas.peak_month_count,
  
  -- Recent activity (last 3 months)
  (SELECT SUM(transcript_count) 
   FROM monthly_transcript_data mtd 
   WHERE mtd.client_id = c.id 
   AND MAKE_DATE(mtd.year, mtd.month, 1) >= CURRENT_DATE - INTERVAL '3 months'
  ) as last_3_months_total,
  
  -- Latest month data
  (SELECT transcript_count 
   FROM monthly_transcript_data mtd 
   WHERE mtd.client_id = c.id 
   ORDER BY mtd.year DESC, mtd.month DESC 
   LIMIT 1
  ) as latest_month_count,
  
  (SELECT month_key 
   FROM monthly_transcript_data mtd 
   WHERE mtd.client_id = c.id 
   ORDER BY mtd.year DESC, mtd.month DESC 
   LIMIT 1
  ) as latest_month_key

FROM clients c
LEFT JOIN client_analytics_summary cas ON c.id = cas.client_id
WHERE c.is_active = true
ORDER BY cas.total_transcripts DESC NULLS LAST;

-- Create trigger to update analytics when monthly data changes
CREATE OR REPLACE FUNCTION trigger_update_client_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate analytics for the affected client
  PERFORM calculate_client_analytics(NEW.client_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_monthly_data_analytics
  AFTER INSERT OR UPDATE ON monthly_transcript_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_client_analytics();

-- Add updated_at triggers
CREATE TRIGGER update_monthly_transcript_data_updated_at 
  BEFORE UPDATE ON monthly_transcript_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_analytics_summary_updated_at 
  BEFORE UPDATE ON client_analytics_summary 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();