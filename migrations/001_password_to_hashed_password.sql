-- Migration: Rename password column to hashed_password
-- This migration updates the users table to use bcrypt hashed passwords

-- Step 1: Rename the column
ALTER TABLE users 
RENAME COLUMN password TO hashed_password;

-- Note: After this migration, you need to:
-- 1. Update all existing passwords to use bcrypt hashing
-- 2. Users with existing passwords will need to reset their passwords
-- 3. The application will handle legacy password migration during login