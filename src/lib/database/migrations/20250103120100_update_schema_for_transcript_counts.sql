-- Migration: Update Schema for Transcript Count Analytics
-- Created: 2025-01-03T12:01:00.000Z
-- Description: Optimize schema for transcript count forecasting rather than text analysis

-- Drop transcript_embeddings table since we're working with counts, not text content
DROP TABLE IF EXISTS transcript_embeddings CASCADE;

-- Update transcripts table to focus on count analytics
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'import', 'api'
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- Create index for time-series queries
CREATE INDEX IF NOT EXISTS idx_transcripts_date_client ON transcripts(date, client_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_count_date ON transcripts(transcript_count, date);

-- Create time-series features table for ML feature engineering
CREATE TABLE time_series_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  feature_date DATE NOT NULL,
  
  -- Raw values
  transcript_count INTEGER NOT NULL,
  
  -- Time-based features
  day_of_week INTEGER, -- 1-7 (Monday=1)
  day_of_month INTEGER, -- 1-31
  day_of_year INTEGER, -- 1-366
  week_of_year INTEGER, -- 1-53
  month INTEGER, -- 1-12
  quarter INTEGER, -- 1-4
  year INTEGER,
  is_weekend BOOLEAN,
  is_month_start BOOLEAN,
  is_month_end BOOLEAN,
  is_quarter_start BOOLEAN,
  is_quarter_end BOOLEAN,
  is_year_start BOOLEAN,
  is_year_end BOOLEAN,
  
  -- Lag features (previous values)
  lag_1_day INTEGER, -- transcript count 1 day ago
  lag_7_days INTEGER, -- transcript count 7 days ago
  lag_30_days INTEGER, -- transcript count 30 days ago
  lag_365_days INTEGER, -- transcript count 365 days ago
  
  -- Rolling window features
  rolling_7_mean DECIMAL(10,4), -- 7-day moving average
  rolling_7_std DECIMAL(10,4), -- 7-day standard deviation
  rolling_30_mean DECIMAL(10,4), -- 30-day moving average
  rolling_30_std DECIMAL(10,4), -- 30-day standard deviation
  rolling_90_mean DECIMAL(10,4), -- 90-day moving average
  rolling_90_std DECIMAL(10,4), -- 90-day standard deviation
  
  -- Growth features
  day_over_day_change INTEGER, -- change from previous day
  day_over_day_pct_change DECIMAL(8,4), -- percentage change from previous day
  week_over_week_change INTEGER, -- change from same day last week
  week_over_week_pct_change DECIMAL(8,4), -- percentage change from same day last week
  month_over_month_change INTEGER, -- change from same day last month
  month_over_month_pct_change DECIMAL(8,4), -- percentage change from same day last month
  year_over_year_change INTEGER, -- change from same day last year
  year_over_year_pct_change DECIMAL(8,4), -- percentage change from same day last year
  
  -- Statistical features
  z_score_7_day DECIMAL(8,4), -- z-score within 7-day window
  z_score_30_day DECIMAL(8,4), -- z-score within 30-day window
  percentile_7_day DECIMAL(5,2), -- percentile within 7-day window
  percentile_30_day DECIMAL(5,2), -- percentile within 30-day window
  
  -- Seasonal features
  seasonal_component DECIMAL(10,4), -- extracted seasonal component
  trend_component DECIMAL(10,4), -- extracted trend component
  residual_component DECIMAL(10,4), -- residual after trend/seasonal removal
  
  -- External factor indicators
  is_holiday BOOLEAN DEFAULT false,
  holiday_name VARCHAR(100),
  business_days_in_month INTEGER,
  working_day_of_month INTEGER, -- which working day of the month (1st, 2nd, etc.)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id, feature_date)
);

-- Create indexes for time_series_features
CREATE INDEX idx_time_series_features_client_date ON time_series_features(client_id, feature_date);
CREATE INDEX idx_time_series_features_date ON time_series_features(feature_date);
CREATE INDEX idx_time_series_features_count ON time_series_features(transcript_count);

-- Create pattern embeddings table for numerical pattern similarity
-- This stores vector representations of time-series patterns, not text
CREATE TABLE pattern_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'seasonal', 'trend'
  time_window_start DATE NOT NULL,
  time_window_end DATE NOT NULL,
  pattern_embedding vector(128), -- Smaller dimension for numerical patterns
  pattern_metadata JSONB, -- Pattern characteristics (amplitude, frequency, etc.)
  embedding_model VARCHAR(100) NOT NULL, -- Model used to generate pattern embedding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector index for pattern embeddings
CREATE INDEX idx_pattern_embeddings_vector 
ON pattern_embeddings USING ivfflat (pattern_embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX idx_pattern_embeddings_client ON pattern_embeddings(client_id, pattern_type);
CREATE INDEX idx_pattern_embeddings_window ON pattern_embeddings(time_window_start, time_window_end);

-- Update vertex_ai_predictions to use smaller embedding dimensions for numerical patterns
ALTER TABLE vertex_ai_predictions 
ALTER COLUMN prediction_embedding TYPE vector(128); -- Reduce from 384 to 128 for numerical patterns

-- Update pattern_similarities to use smaller embedding dimensions
ALTER TABLE pattern_similarities 
ALTER COLUMN similarity_embedding TYPE vector(128); -- Reduce from 256 to 128

-- Create aggregated statistics table for quick analytics
CREATE TABLE client_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  
  -- Basic statistics
  total_transcripts INTEGER NOT NULL,
  avg_daily_transcripts DECIMAL(10,4),
  median_daily_transcripts DECIMAL(10,4),
  std_daily_transcripts DECIMAL(10,4),
  min_daily_transcripts INTEGER,
  max_daily_transcripts INTEGER,
  
  -- Time period statistics
  transcripts_last_7_days INTEGER,
  transcripts_last_30_days INTEGER,
  transcripts_last_90_days INTEGER,
  transcripts_last_365_days INTEGER,
  
  -- Growth statistics
  growth_rate_7_day DECIMAL(8,4),
  growth_rate_30_day DECIMAL(8,4),
  growth_rate_90_day DECIMAL(8,4),
  growth_rate_365_day DECIMAL(8,4),
  
  -- Volatility measures
  volatility_7_day DECIMAL(8,4), -- coefficient of variation
  volatility_30_day DECIMAL(8,4),
  volatility_90_day DECIMAL(8,4),
  
  -- Seasonality indicators
  has_weekly_seasonality BOOLEAN DEFAULT false,
  has_monthly_seasonality BOOLEAN DEFAULT false,
  has_yearly_seasonality BOOLEAN DEFAULT false,
  seasonality_strength DECIMAL(5,4), -- 0.0 to 1.0
  
  -- Trend indicators
  trend_direction VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  trend_strength DECIMAL(5,4), -- 0.0 to 1.0
  trend_significance DECIMAL(5,4), -- p-value of trend test
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(client_id, calculation_date)
);

-- Create indexes for client_statistics
CREATE INDEX idx_client_statistics_client ON client_statistics(client_id, calculation_date);
CREATE INDEX idx_client_statistics_date ON client_statistics(calculation_date);

-- Create function to calculate time series features
CREATE OR REPLACE FUNCTION calculate_time_series_features(
  p_client_id UUID,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_transcript_count INTEGER;
  v_lag_1 INTEGER;
  v_lag_7 INTEGER;
  v_lag_30 INTEGER;
  v_lag_365 INTEGER;
  v_rolling_7_mean DECIMAL(10,4);
  v_rolling_7_std DECIMAL(10,4);
  v_rolling_30_mean DECIMAL(10,4);
  v_rolling_30_std DECIMAL(10,4);
BEGIN
  -- Get current transcript count
  SELECT transcript_count INTO v_transcript_count
  FROM transcripts 
  WHERE client_id = p_client_id AND date = p_date;
  
  IF v_transcript_count IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate lag features
  SELECT transcript_count INTO v_lag_1
  FROM transcripts 
  WHERE client_id = p_client_id AND date = p_date - INTERVAL '1 day';
  
  SELECT transcript_count INTO v_lag_7
  FROM transcripts 
  WHERE client_id = p_client_id AND date = p_date - INTERVAL '7 days';
  
  SELECT transcript_count INTO v_lag_30
  FROM transcripts 
  WHERE client_id = p_client_id AND date = p_date - INTERVAL '30 days';
  
  SELECT transcript_count INTO v_lag_365
  FROM transcripts 
  WHERE client_id = p_client_id AND date = p_date - INTERVAL '365 days';
  
  -- Calculate rolling statistics
  SELECT 
    AVG(transcript_count)::DECIMAL(10,4),
    STDDEV(transcript_count)::DECIMAL(10,4)
  INTO v_rolling_7_mean, v_rolling_7_std
  FROM transcripts 
  WHERE client_id = p_client_id 
    AND date BETWEEN p_date - INTERVAL '6 days' AND p_date;
  
  SELECT 
    AVG(transcript_count)::DECIMAL(10,4),
    STDDEV(transcript_count)::DECIMAL(10,4)
  INTO v_rolling_30_mean, v_rolling_30_std
  FROM transcripts 
  WHERE client_id = p_client_id 
    AND date BETWEEN p_date - INTERVAL '29 days' AND p_date;
  
  -- Insert or update features
  INSERT INTO time_series_features (
    client_id, feature_date, transcript_count,
    day_of_week, day_of_month, day_of_year, week_of_year, month, quarter, year,
    is_weekend, is_month_start, is_month_end, is_quarter_start, is_quarter_end,
    is_year_start, is_year_end,
    lag_1_day, lag_7_days, lag_30_days, lag_365_days,
    rolling_7_mean, rolling_7_std, rolling_30_mean, rolling_30_std,
    day_over_day_change, week_over_week_change,
    is_holiday
  ) VALUES (
    p_client_id, p_date, v_transcript_count,
    EXTRACT(DOW FROM p_date)::INTEGER,
    EXTRACT(DAY FROM p_date)::INTEGER,
    EXTRACT(DOY FROM p_date)::INTEGER,
    EXTRACT(WEEK FROM p_date)::INTEGER,
    EXTRACT(MONTH FROM p_date)::INTEGER,
    EXTRACT(QUARTER FROM p_date)::INTEGER,
    EXTRACT(YEAR FROM p_date)::INTEGER,
    EXTRACT(DOW FROM p_date) IN (0, 6), -- Sunday=0, Saturday=6
    EXTRACT(DAY FROM p_date) = 1,
    p_date = (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE,
    p_date = DATE_TRUNC('quarter', p_date)::DATE,
    p_date = (DATE_TRUNC('quarter', p_date) + INTERVAL '3 months - 1 day')::DATE,
    p_date = DATE_TRUNC('year', p_date)::DATE,
    p_date = (DATE_TRUNC('year', p_date) + INTERVAL '1 year - 1 day')::DATE,
    v_lag_1, v_lag_7, v_lag_30, v_lag_365,
    v_rolling_7_mean, v_rolling_7_std, v_rolling_30_mean, v_rolling_30_std,
    COALESCE(v_transcript_count - v_lag_1, 0),
    COALESCE(v_transcript_count - v_lag_7, 0),
    EXISTS(SELECT 1 FROM external_factors WHERE date = p_date AND factor_type = 'holiday')
  )
  ON CONFLICT (client_id, feature_date) 
  DO UPDATE SET
    transcript_count = EXCLUDED.transcript_count,
    lag_1_day = EXCLUDED.lag_1_day,
    lag_7_days = EXCLUDED.lag_7_days,
    lag_30_days = EXCLUDED.lag_30_days,
    lag_365_days = EXCLUDED.lag_365_days,
    rolling_7_mean = EXCLUDED.rolling_7_mean,
    rolling_7_std = EXCLUDED.rolling_7_std,
    rolling_30_mean = EXCLUDED.rolling_30_mean,
    rolling_30_std = EXCLUDED.rolling_30_std,
    day_over_day_change = EXCLUDED.day_over_day_change,
    week_over_week_change = EXCLUDED.week_over_week_change,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate features when transcript data is inserted/updated
CREATE OR REPLACE FUNCTION trigger_calculate_features()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate features for the affected date
  PERFORM calculate_time_series_features(NEW.client_id, NEW.date);
  
  -- Also recalculate features for dates that might be affected by this change
  -- (dates that use this date as a lag feature)
  PERFORM calculate_time_series_features(NEW.client_id, NEW.date + INTERVAL '1 day');
  PERFORM calculate_time_series_features(NEW.client_id, NEW.date + INTERVAL '7 days');
  PERFORM calculate_time_series_features(NEW.client_id, NEW.date + INTERVAL '30 days');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transcripts_features
  AFTER INSERT OR UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_features();

-- Create view for easy access to recent transcript analytics
CREATE OR REPLACE VIEW recent_transcript_analytics AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  t.date,
  t.transcript_count,
  tsf.rolling_7_mean,
  tsf.rolling_30_mean,
  tsf.day_over_day_change,
  tsf.day_over_day_pct_change,
  tsf.week_over_week_change,
  tsf.week_over_week_pct_change,
  tsf.is_weekend,
  tsf.is_holiday,
  tsf.z_score_30_day,
  CASE 
    WHEN ABS(tsf.z_score_30_day) > 2 THEN 'anomaly'
    WHEN tsf.day_over_day_pct_change > 0.2 THEN 'high_growth'
    WHEN tsf.day_over_day_pct_change < -0.2 THEN 'decline'
    ELSE 'normal'
  END as status_flag
FROM clients c
JOIN transcripts t ON c.id = t.client_id
LEFT JOIN time_series_features tsf ON c.id = tsf.client_id AND t.date = tsf.feature_date
WHERE t.date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY c.name, t.date DESC;

-- Update the existing cosine similarity function to work with smaller vectors
DROP FUNCTION IF EXISTS calculate_cosine_similarity(vector, vector);
CREATE OR REPLACE FUNCTION calculate_cosine_similarity(vec1 vector, vec2 vector)
RETURNS DECIMAL(5,4) AS $$
BEGIN
  -- Handle different vector dimensions
  IF vector_dims(vec1) != vector_dims(vec2) THEN
    RAISE EXCEPTION 'Vector dimensions must match: % vs %', vector_dims(vec1), vector_dims(vec2);
  END IF;
  
  RETURN (vec1 <#> vec2) / (sqrt(vec1 <#> vec1) * sqrt(vec2 <#> vec2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add some sample time series data for testing (optional)
-- This will be populated by the application when real data is imported