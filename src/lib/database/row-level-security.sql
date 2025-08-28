-- Row Level Security (RLS) Policies for Transcript Analytics Platform
-- These policies ensure data isolation based on user roles and ownership

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
-- Admins can see all users, others can only see themselves
CREATE POLICY users_admin_all ON users
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin');

CREATE POLICY users_self_select ON users
  FOR SELECT
  TO authenticated
  USING (id = get_current_user_id());

CREATE POLICY users_self_update ON users
  FOR UPDATE
  TO authenticated
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- Clients table policies
-- Admins and analysts can manage clients, viewers can only read
CREATE POLICY clients_admin_analyst_all ON clients
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'analyst'));

CREATE POLICY clients_viewer_select ON clients
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'viewer');

-- Transcripts table policies
-- Admins can do everything
CREATE POLICY transcripts_admin_all ON transcripts
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- Analysts can create, read, and update transcripts
CREATE POLICY transcripts_analyst_select ON transcripts
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'analyst');

CREATE POLICY transcripts_analyst_insert ON transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() = 'analyst' AND
    created_by = get_current_user_id()
  );

CREATE POLICY transcripts_analyst_update ON transcripts
  FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() = 'analyst' AND
    (created_by = get_current_user_id() OR created_by IS NULL)
  )
  WITH CHECK (
    get_current_user_role() = 'analyst'
  );

-- Viewers can only read transcripts
CREATE POLICY transcripts_viewer_select ON transcripts
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'viewer');

-- Predictions table policies
-- Admins can do everything
CREATE POLICY predictions_admin_all ON predictions
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- Analysts can create and read predictions
CREATE POLICY predictions_analyst_select ON predictions
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'analyst');

CREATE POLICY predictions_analyst_insert ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() = 'analyst' AND
    created_by = get_current_user_id()
  );

-- Viewers can only read predictions
CREATE POLICY predictions_viewer_select ON predictions
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'viewer');

-- Performance metrics policies
-- Only admins can access performance metrics
CREATE POLICY performance_metrics_admin_only ON performance_metrics
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- Create audit log table for tracking data modifications
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(20),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR(255)
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY audit_log_admin_only ON audit_log
  FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  user_role_val TEXT;
  ip_address_val INET;
  user_agent_val TEXT;
  session_id_val TEXT;
BEGIN
  -- Get current user context
  BEGIN
    user_id_val := get_current_user_id();
    user_role_val := get_current_user_role();
    ip_address_val := current_setting('app.client_ip', true)::INET;
    user_agent_val := current_setting('app.user_agent', true);
    session_id_val := current_setting('app.session_id', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- Use defaults if settings not available
      user_id_val := NULL;
      user_role_val := 'unknown';
      ip_address_val := NULL;
      user_agent_val := NULL;
      session_id_val := NULL;
  END;

  -- Insert audit record
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      table_name, record_id, action, old_values, new_values,
      user_id, user_role, ip_address, user_agent, session_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), NULL,
      user_id_val, user_role_val, ip_address_val, user_agent_val, session_id_val
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      table_name, record_id, action, old_values, new_values,
      user_id, user_role, ip_address, user_agent, session_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW),
      user_id_val, user_role_val, ip_address_val, user_agent_val, session_id_val
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      table_name, record_id, action, old_values, new_values,
      user_id, user_role, ip_address, user_agent, session_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, NULL, row_to_json(NEW),
      user_id_val, user_role_val, ip_address_val, user_agent_val, session_id_val
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_clients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transcripts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_predictions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON predictions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create indexes for audit log performance
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Create function to set user context for RLS
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id UUID,
  p_user_role TEXT,
  p_client_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
  PERFORM set_config('app.current_user_role', p_user_role, true);
  
  IF p_client_ip IS NOT NULL THEN
    PERFORM set_config('app.client_ip', p_client_ip, true);
  END IF;
  
  IF p_user_agent IS NOT NULL THEN
    PERFORM set_config('app.user_agent', p_user_agent, true);
  END IF;
  
  IF p_session_id IS NOT NULL THEN
    PERFORM set_config('app.session_id', p_session_id, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;