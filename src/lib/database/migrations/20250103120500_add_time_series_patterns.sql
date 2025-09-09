-- Time Series Patterns table for vector-based pattern matching
-- Supports: pattern embedding generation, similarity search, classification, historical matching

CREATE TABLE IF NOT EXISTS time_series_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pattern_type VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  embedding vector(768) NOT NULL,
  characteristics JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Speed up lookups by client, type, and date range
CREATE INDEX IF NOT EXISTS idx_tsp_client_type_date
  ON time_series_patterns(client_id, pattern_type, start_date, end_date);

-- Vector index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_tsp_embedding
  ON time_series_patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Partial index for recent patterns (last 180 days)
CREATE INDEX IF NOT EXISTS idx_tsp_recent_by_type
  ON time_series_patterns(pattern_type, end_date)
  WHERE end_date >= NOW() - INTERVAL '180 days';

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_tsp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tsp_set_updated_at ON time_series_patterns;
CREATE TRIGGER trg_tsp_set_updated_at
  BEFORE UPDATE ON time_series_patterns
  FOR EACH ROW
  EXECUTE PROCEDURE set_tsp_updated_at();


