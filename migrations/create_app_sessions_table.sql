-- Create app_sessions table if it doesn't exist
-- This table is required for express-session with connect-pg-simple

CREATE TABLE IF NOT EXISTS app_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Create index for session expiry
CREATE INDEX IF NOT EXISTS idx_app_session_expire 
ON app_sessions (expire);

-- Grant necessary permissions
GRANT ALL ON app_sessions TO postgres;