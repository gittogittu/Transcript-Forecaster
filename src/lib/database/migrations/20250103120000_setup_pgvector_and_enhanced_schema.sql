-- Migration: Setup pgvector and Enhanced Schema for Advanced Predictive Analytics
-- Created: 2025-01-03T12:00:00.000Z
-- Description: Initialize pgvector extension and create enhanced schema for ML features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify pgvector is working
SELECT vector_dims('[1,2,3]'::vector) as test_vector_dims;

-- Create base tables if they don't exist (for compatibility)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  transcript_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

-- Vertex AI Models metadata
CREATE TABLE vertex_ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertex_model_id VARCHAR(255) NOT NULL UNIQUE,
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- 'automl_forecasting', 'custom_training'
  endpoint_id VARCHAR(255),
  project_id VARCHAR(100) NOT NULL,
  location VARCHAR(50) NOT NULL,
  training_config JSONB NOT NULL,
  evaluation_metrics JSONB,
  feature_importance JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  deployment_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'deployed', 'failed', 'retired'
);

-- Create indexes for vertex_ai_models
CREATE INDEX idx_vertex_ai_models_type ON vertex_ai_models(model_type);
CREATE INDEX idx_vertex_ai_models_status ON vertex_ai_models(deployment_status, is_active);
CREATE INDEX idx_vertex_ai_models_project ON vertex_ai_models(project_id, location);

-- Vector embeddings for similarity search and pattern matching
CREATE TABLE transcript_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  embedding vector(768), -- 768-dimensional embedding vector
  embedding_model VARCHAR(100) NOT NULL, -- Model used to generate embedding
  metadata JSONB, -- Additional context for the embedding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector index for transcript embeddings (using ivfflat for cosine similarity)
CREATE INDEX idx_transcript_embeddings_vector 
ON transcript_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_transcript_embeddings_transcript ON transcript_embeddings(transcript_id);
CREATE INDEX idx_transcript_embeddings_model ON transcript_embeddings(embedding_model);

-- Feature store for ML features
CREATE TABLE feature_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_group VARCHAR(100) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL, -- client_id or other entity identifier
  feature_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  feature_value JSONB NOT NULL,
  feature_vector vector(512), -- Optional vector representation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_group, feature_name, entity_id, feature_timestamp)
);

-- Create indexes for feature store
CREATE INDEX idx_feature_store_group_entity ON feature_store(feature_group, entity_id, feature_timestamp);
CREATE INDEX idx_feature_store_name ON feature_store(feature_name, feature_timestamp);
CREATE INDEX idx_feature_store_vector 
ON feature_store USING ivfflat (feature_vector vector_cosine_ops) WITH (lists = 50);

-- Enhanced predictions table with Vertex AI integration
CREATE TABLE vertex_ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  vertex_model_id UUID REFERENCES vertex_ai_models(id),
  prediction_job_id VARCHAR(255), -- Vertex AI batch prediction job ID
  prediction_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  forecast_horizon INTEGER NOT NULL,
  predicted_values JSONB NOT NULL, -- Array of {date, value, confidence_lower, confidence_upper}
  seasonality_detected JSONB, -- Seasonal patterns found
  model_confidence DECIMAL(5,4),
  prediction_embedding vector(384), -- Embedding of prediction pattern for similarity search
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for vertex_ai_predictions
CREATE INDEX idx_vertex_ai_predictions_client ON vertex_ai_predictions(client_id, prediction_type, created_at);
CREATE INDEX idx_vertex_ai_predictions_model ON vertex_ai_predictions(vertex_model_id);
CREATE INDEX idx_vertex_ai_predictions_job ON vertex_ai_predictions(prediction_job_id);
CREATE INDEX idx_vertex_ai_predictions_vector 
ON vertex_ai_predictions USING ivfflat (prediction_embedding vector_cosine_ops) WITH (lists = 50);

-- Anomaly detection results
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  anomaly_type VARCHAR(20) NOT NULL, -- 'point', 'contextual', 'collective'
  severity VARCHAR(10) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  actual_value DECIMAL(10,2) NOT NULL,
  expected_value DECIMAL(10,2) NOT NULL,
  deviation_score DECIMAL(8,4) NOT NULL,
  detection_method VARCHAR(50) NOT NULL,
  explanation TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for anomalies
CREATE INDEX idx_anomalies_client_date ON anomalies(client_id, detected_at, severity);
CREATE INDEX idx_anomalies_severity ON anomalies(severity, is_resolved);
CREATE INDEX idx_anomalies_method ON anomalies(detection_method, detected_at);

-- Feature importance tracking
CREATE TABLE feature_importance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES vertex_ai_models(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  importance_score DECIMAL(8,6) NOT NULL,
  feature_type VARCHAR(50) NOT NULL, -- 'time', 'statistical', 'domain'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for feature_importance
CREATE INDEX idx_feature_importance_model ON feature_importance(model_id, importance_score DESC);
CREATE INDEX idx_feature_importance_type ON feature_importance(feature_type, importance_score DESC);

-- Business insights
CREATE TABLE business_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  insight_type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  impact VARCHAR(10) NOT NULL, -- 'low', 'medium', 'high'
  time_range JSONB NOT NULL, -- {start_date, end_date}
  supporting_data JSONB,
  visualizations JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for business_insights
CREATE INDEX idx_business_insights_client ON business_insights(client_id, insight_type, created_at);
CREATE INDEX idx_business_insights_impact ON business_insights(impact, confidence DESC);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID REFERENCES business_insights(id) ON DELETE CASCADE,
  priority VARCHAR(10) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  category VARCHAR(20) NOT NULL, -- 'operational', 'strategic', 'tactical'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  expected_impact TEXT,
  implementation_effort VARCHAR(10) NOT NULL, -- 'low', 'medium', 'high'
  timeframe VARCHAR(100),
  metrics JSONB, -- Array of metric names
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for recommendations
CREATE INDEX idx_recommendations_priority ON recommendations(priority, status, created_at);
CREATE INDEX idx_recommendations_category ON recommendations(category, status);

-- Vertex AI model performance tracking
CREATE TABLE vertex_ai_model_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertex_model_id UUID REFERENCES vertex_ai_models(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  mae DECIMAL(10,4), -- Mean Absolute Error
  rmse DECIMAL(10,4), -- Root Mean Square Error
  mape DECIMAL(5,2), -- Mean Absolute Percentage Error
  accuracy_score DECIMAL(5,4),
  prediction_count INTEGER NOT NULL,
  endpoint_latency_ms INTEGER, -- Vertex AI endpoint response time
  feature_drift_score DECIMAL(5,4), -- Feature drift detection score
  model_drift_score DECIMAL(5,4), -- Model performance drift score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vertex_ai_model_performance
CREATE INDEX idx_vertex_ai_performance_model ON vertex_ai_model_performance(vertex_model_id, evaluation_date);
CREATE INDEX idx_vertex_ai_performance_client ON vertex_ai_model_performance(client_id, evaluation_date);

-- Vector similarity search for pattern matching
CREATE TABLE pattern_similarities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  target_client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL, -- 'seasonal', 'trend', 'anomaly', 'forecast'
  time_period JSONB NOT NULL, -- {start_date, end_date}
  similarity_embedding vector(256), -- Embedding representing the similarity pattern
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pattern_similarities
CREATE INDEX idx_pattern_similarities_source ON pattern_similarities(source_client_id, similarity_score DESC);
CREATE INDEX idx_pattern_similarities_target ON pattern_similarities(target_client_id, similarity_score DESC);
CREATE INDEX idx_pattern_similarities_type ON pattern_similarities(pattern_type, similarity_score DESC);
CREATE INDEX idx_pattern_similarities_vector 
ON pattern_similarities USING ivfflat (similarity_embedding vector_cosine_ops) WITH (lists = 25);

-- External factors (for correlation analysis)
CREATE TABLE external_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factor_name VARCHAR(100) NOT NULL,
  factor_type VARCHAR(50) NOT NULL, -- 'holiday', 'weather', 'economic', 'seasonal'
  date DATE NOT NULL,
  value DECIMAL(10,4),
  description TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(factor_name, date)
);

-- Create indexes for external_factors
CREATE INDEX idx_external_factors_name_date ON external_factors(factor_name, date);
CREATE INDEX idx_external_factors_type ON external_factors(factor_type, date);

-- Prediction accuracy feedback
CREATE TABLE prediction_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES vertex_ai_predictions(id) ON DELETE CASCADE,
  actual_date DATE NOT NULL,
  actual_value DECIMAL(10,2) NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  absolute_error DECIMAL(10,2) NOT NULL,
  percentage_error DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for prediction_feedback
CREATE INDEX idx_prediction_feedback_prediction ON prediction_feedback(prediction_id, actual_date);
CREATE INDEX idx_prediction_feedback_error ON prediction_feedback(absolute_error DESC, percentage_error DESC);

-- Create a view for easy access to prediction accuracy metrics
CREATE OR REPLACE VIEW prediction_accuracy_summary AS
SELECT 
  p.id as prediction_id,
  p.client_id,
  p.vertex_model_id,
  p.prediction_type,
  COUNT(pf.id) as feedback_count,
  AVG(pf.absolute_error) as avg_absolute_error,
  AVG(pf.percentage_error) as avg_percentage_error,
  STDDEV(pf.percentage_error) as std_percentage_error,
  MIN(pf.percentage_error) as min_percentage_error,
  MAX(pf.percentage_error) as max_percentage_error
FROM vertex_ai_predictions p
LEFT JOIN prediction_feedback pf ON p.id = pf.prediction_id
GROUP BY p.id, p.client_id, p.vertex_model_id, p.prediction_type;

-- Create a function to calculate vector similarity
CREATE OR REPLACE FUNCTION calculate_cosine_similarity(vec1 vector, vec2 vector)
RETURNS DECIMAL(5,4) AS $$
BEGIN
  RETURN (vec1 <#> vec2) * -1 + 1; -- Convert cosine distance to similarity
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to find similar patterns
CREATE OR REPLACE FUNCTION find_similar_patterns(
  input_embedding vector,
  pattern_type_filter VARCHAR DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  client_id UUID,
  similarity_score DECIMAL,
  pattern_type VARCHAR,
  time_period JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.source_client_id,
    calculate_cosine_similarity(input_embedding, ps.similarity_embedding),
    ps.pattern_type,
    ps.time_period
  FROM pattern_similarities ps
  WHERE 
    (pattern_type_filter IS NULL OR ps.pattern_type = pattern_type_filter)
    AND calculate_cosine_similarity(input_embedding, ps.similarity_embedding) >= similarity_threshold
  ORDER BY ps.similarity_embedding <=> input_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial external factors (holidays and common business factors)
INSERT INTO external_factors (factor_name, factor_type, date, value, description, source) VALUES
('New Year''s Day', 'holiday', '2024-01-01', 1.0, 'Federal Holiday', 'system'),
('Martin Luther King Jr. Day', 'holiday', '2024-01-15', 1.0, 'Federal Holiday', 'system'),
('Presidents'' Day', 'holiday', '2024-02-19', 1.0, 'Federal Holiday', 'system'),
('Memorial Day', 'holiday', '2024-05-27', 1.0, 'Federal Holiday', 'system'),
('Independence Day', 'holiday', '2024-07-04', 1.0, 'Federal Holiday', 'system'),
('Labor Day', 'holiday', '2024-09-02', 1.0, 'Federal Holiday', 'system'),
('Columbus Day', 'holiday', '2024-10-14', 1.0, 'Federal Holiday', 'system'),
('Veterans Day', 'holiday', '2024-11-11', 1.0, 'Federal Holiday', 'system'),
('Thanksgiving', 'holiday', '2024-11-28', 1.0, 'Federal Holiday', 'system'),
('Christmas Day', 'holiday', '2024-12-25', 1.0, 'Federal Holiday', 'system')
ON CONFLICT (factor_name, date) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_vertex_ai_models_updated_at 
  BEFORE UPDATE ON vertex_ai_models 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify pgvector installation and functionality
DO $$
BEGIN
  -- Test vector operations
  PERFORM '[1,2,3]'::vector <-> '[1,2,4]'::vector;
  PERFORM '[1,2,3]'::vector <#> '[1,2,4]'::vector;
  PERFORM '[1,2,3]'::vector <=> '[1,2,4]'::vector;
  
  RAISE NOTICE 'pgvector extension is working correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'pgvector extension test failed: %', SQLERRM;
END $$;