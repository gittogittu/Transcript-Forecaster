-- Migration: Add Projects Feature
-- Date: 2025-01-19
-- Description: Add projects table and link clients to projects

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT '📊',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add project_id column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_project_id ON clients(project_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Insert default project for existing data
INSERT INTO projects (name, description, project_type, icon, color)
VALUES ('Default Project', 'Auto-created for existing data sources', 'custom', '📁', '#6B7280')
ON CONFLICT DO NOTHING;

-- Get the default project ID and update existing clients
DO $$
DECLARE
  default_proj_id UUID;
BEGIN
  SELECT id INTO default_proj_id FROM projects WHERE name = 'Default Project' LIMIT 1;
  IF default_proj_id IS NOT NULL THEN
    UPDATE clients SET project_id = default_proj_id WHERE project_id IS NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE projects IS 'Projects to organize data sources by purpose (Sales, Finance, Transcripts, etc.)';
COMMENT ON COLUMN projects.project_type IS 'Type: sales, finance, transcripts, support, operations, custom';
COMMENT ON COLUMN projects.color IS 'Hex color code for UI theming';
COMMENT ON COLUMN projects.icon IS 'Emoji or icon identifier for visual distinction';
