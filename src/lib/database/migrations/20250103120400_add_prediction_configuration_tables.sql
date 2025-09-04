-- Migration: Add prediction configuration tables
-- Description: Create tables for customizable prediction parameters, templates, and model comparison

-- Prediction configurations table
CREATE TABLE IF NOT EXISTS prediction_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  parameters JSONB NOT NULL,
  scenario_variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  is_template BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  
  -- Indexes
  INDEX(created_by, is_template),
  INDEX(created_at),
  INDEX USING GIN(tags),
  INDEX USING GIN(filters),
  INDEX USING GIN(parameters)
);

-- Prediction usage tracking (for template popularity)
CREATE TABLE IF NOT EXISTS prediction_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES prediction_configurations(id) ON DELETE CASCADE,
  used_by VARCHAR(255) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  configuration_snapshot JSONB,
  
  -- Indexes
  INDEX(template_id, used_at),
  INDEX(used_by, used_at)
);

-- Model comparisons table
CREATE TABLE IF NOT EXISTS model_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  models JSONB NOT NULL,
  dataset VARCHAR(255) NOT NULL,
  metrics JSONB NOT NULL,
  cross_validation_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  
  -- Indexes
  INDEX(created_by, created_at),
  INDEX(dataset)
);

-- Model comparison results table
CREATE TABLE IF NOT EXISTS model_comparison_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comparison_id UUID REFERENCES model_comparisons(id) ON DELETE CASCADE,
  model_id VARCHAR(255) NOT NULL,
  metrics JSONB NOT NULL,
  cross_validation_scores JSONB NOT NULL,
  training_time INTEGER NOT NULL, -- in seconds
  prediction_latency INTEGER NOT NULL, -- in milliseconds
  rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX(comparison_id, rank),
  INDEX(model_id)
);

-- Scenario analysis results table
CREATE TABLE IF NOT EXISTS scenario_analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baseline_config_id UUID REFERENCES prediction_configurations(id) ON DELETE CASCADE,
  scenario_name VARCHAR(255) NOT NULL,
  scenario_variables JSONB NOT NULL,
  baseline_prediction JSONB NOT NULL,
  adjusted_prediction JSONB NOT NULL,
  impact_analysis JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  
  -- Indexes
  INDEX(baseline_config_id, created_at),
  INDEX(created_by, created_at),
  INDEX(scenario_name)
);

-- What-if analysis sessions table
CREATE TABLE IF NOT EXISTS whatif_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  baseline_config_id UUID REFERENCES prediction_configurations(id) ON DELETE CASCADE,
  scenarios JSONB NOT NULL,
  comparison_metrics JSONB NOT NULL,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  
  -- Indexes
  INDEX(created_by, created_at),
  INDEX(baseline_config_id)
);

-- External factors table (for scenario modeling)
CREATE TABLE IF NOT EXISTS external_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factor_name VARCHAR(100) NOT NULL,
  factor_type VARCHAR(50) NOT NULL, -- 'holiday', 'weather', 'economic', 'seasonal', 'custom'
  date DATE NOT NULL,
  value DECIMAL(10,4),
  description TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  
  UNIQUE(factor_name, date),
  INDEX(factor_name, date),
  INDEX(factor_type, date)
);

-- Prediction configuration validation rules table
CREATE TABLE IF NOT EXISTS prediction_validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_type VARCHAR(50) NOT NULL, -- 'parameter', 'filter', 'scenario'
  validation_logic JSONB NOT NULL,
  error_message TEXT NOT NULL,
  warning_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX(rule_type, is_active)
);

-- Insert default validation rules
INSERT INTO prediction_validation_rules (rule_name, rule_type, validation_logic, error_message, warning_message) VALUES
('confidence_level_range', 'parameter', '{"field": "confidenceLevel", "min": 0.5, "max": 0.99}', 'Confidence level must be between 0.5 and 0.99', 'Consider using confidence levels between 0.8 and 0.95 for most use cases'),
('forecast_horizon_range', 'parameter', '{"field": "forecastHorizon", "min": 1, "max": 365}', 'Forecast horizon must be between 1 and 365 periods', 'Forecast accuracy typically decreases for horizons longer than 90 days'),
('date_range_minimum', 'filter', '{"field": "dateRange", "minDays": 30}', 'Date range must span at least 30 days', 'Consider using at least 90 days of historical data for better accuracy'),
('growth_rate_extreme', 'scenario', '{"field": "growthRate", "min": -100, "max": 1000}', 'Growth rate must be between -100% and 1000%', 'Growth rates outside -50% to 200% may indicate unrealistic scenarios');

-- Insert default external factors (holidays and common events)
INSERT INTO external_factors (factor_name, factor_type, date, value, description, source) VALUES
('New Year Day', 'holiday', '2024-01-01', 0.5, 'New Year Day holiday impact', 'system'),
('Independence Day', 'holiday', '2024-07-04', 0.6, 'Independence Day holiday impact', 'system'),
('Thanksgiving', 'holiday', '2024-11-28', 0.4, 'Thanksgiving holiday impact', 'system'),
('Christmas', 'holiday', '2024-12-25', 0.3, 'Christmas holiday impact', 'system'),
('Black Friday', 'seasonal', '2024-11-29', 1.5, 'Black Friday increased activity', 'system'),
('Cyber Monday', 'seasonal', '2024-12-02', 1.3, 'Cyber Monday increased activity', 'system');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_prediction_configurations_updated_at 
    BEFORE UPDATE ON prediction_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatif_analysis_sessions_updated_at 
    BEFORE UPDATE ON whatif_analysis_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prediction_validation_rules_updated_at 
    BEFORE UPDATE ON prediction_validation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_configs_search 
    ON prediction_configurations USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_factors_lookup 
    ON external_factors (factor_type, date, factor_name);

-- Add comments for documentation
COMMENT ON TABLE prediction_configurations IS 'Stores user-defined prediction configurations with filters, parameters, and scenario variables';
COMMENT ON TABLE prediction_usage IS 'Tracks usage of prediction templates for popularity ranking';
COMMENT ON TABLE model_comparisons IS 'Stores model comparison experiments and configurations';
COMMENT ON TABLE model_comparison_results IS 'Stores results from model comparison experiments';
COMMENT ON TABLE scenario_analysis_results IS 'Stores results from what-if scenario analysis';
COMMENT ON TABLE whatif_analysis_sessions IS 'Stores complete what-if analysis sessions with multiple scenarios';
COMMENT ON TABLE external_factors IS 'Stores external factors that can influence predictions (holidays, events, etc.)';
COMMENT ON TABLE prediction_validation_rules IS 'Stores validation rules for prediction configurations';