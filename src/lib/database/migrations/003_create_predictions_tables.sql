-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  prediction_type VARCHAR(20) NOT NULL CHECK (prediction_type IN ('daily', 'weekly', 'monthly')),
  model_type VARCHAR(50) NOT NULL,
  confidence DECIMAL(5,4),
  accuracy DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create prediction details table for individual time predictions
CREATE TABLE IF NOT EXISTS prediction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  predicted_date DATE NOT NULL,
  predicted_count INTEGER NOT NULL,
  confidence_lower INTEGER NOT NULL,
  confidence_upper INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_client_date ON predictions(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_prediction_details_prediction_id ON prediction_details(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_details_date ON prediction_details(predicted_date);