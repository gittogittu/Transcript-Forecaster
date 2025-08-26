-- Migration: 001_initial_schema
-- Description: Initial database schema with clients, transcripts, and predictions tables
-- Date: 2025-01-08

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, month)
);

-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  predicted_month DATE NOT NULL,
  predicted_count INTEGER NOT NULL,
  confidence_lower INTEGER NOT NULL,
  confidence_upper INTEGER NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  accuracy DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, predicted_month, model_type)
);

-- Migration tracking table
CREATE TABLE migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transcripts_client_id ON transcripts(client_id);
CREATE INDEX idx_transcripts_month ON transcripts(month);
CREATE INDEX idx_transcripts_client_month ON transcripts(client_id, month);
CREATE INDEX idx_predictions_client_id ON predictions(client_id);
CREATE INDEX idx_predictions_month ON predictions(predicted_month);
CREATE INDEX idx_clients_name ON clients(name);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial migration record
INSERT INTO migrations (version, description) VALUES 
('001_initial_schema', 'Initial database schema with clients, transcripts, and predictions tables');