-- Alter validation_sessions table to use VARCHAR for user_id
ALTER TABLE validation_sessions 
ALTER COLUMN user_id TYPE VARCHAR(50) USING user_id::VARCHAR;