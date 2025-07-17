-- Schema improvements migration
-- Created: 2025-06-12
-- Description: Apply enum types, foreign key constraints, NOT NULL constraints, and unique constraints

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'order_manager');
CREATE TYPE purchase_order_status AS ENUM ('pending', 'approved', 'sent', 'completed');
CREATE TYPE invoice_status AS ENUM ('pending', 'verified', 'paid');
CREATE TYPE item_receipt_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE verification_action AS ENUM ('invoice_uploaded', 'item_verified', 'quality_checked');

-- Add NOT NULL constraints to users table
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;

-- Add NOT NULL constraints to vendors table
ALTER TABLE vendors ALTER COLUMN contact SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN contact_person SET NOT NULL;

-- Add unique constraint to vendors email
ALTER TABLE vendors ADD CONSTRAINT vendors_email_unique UNIQUE (email);

-- Add updated_at columns where missing
ALTER TABLE attachments ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE order_history ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE verification_logs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Add sort_order column to handsontable_configs
ALTER TABLE handsontable_configs ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Add unique constraint for project_members (project_id + user_id)
ALTER TABLE project_members ADD CONSTRAINT project_members_project_user_unique UNIQUE (project_id, user_id);

-- Update role column in users table to use enum
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;

-- Update status column in purchase_orders table to use enum
ALTER TABLE purchase_orders ALTER COLUMN status TYPE purchase_order_status USING status::purchase_order_status;

-- Update status column in invoices table to use enum
ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::invoice_status;

-- Update status column in item_receipts table to use enum
ALTER TABLE item_receipts ALTER COLUMN status TYPE item_receipt_status USING status::item_receipt_status;

-- Update action column in verification_logs table to use enum
ALTER TABLE verification_logs ALTER COLUMN action TYPE verification_action USING action::verification_action;

-- Add foreign key constraints for user references
ALTER TABLE invoices ADD CONSTRAINT invoices_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_tax_invoice_issued_by_fkey FOREIGN KEY (tax_invoice_issued_by) REFERENCES users(id);

ALTER TABLE item_receipts ADD CONSTRAINT item_receipts_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id);

ALTER TABLE verification_logs ADD CONSTRAINT verification_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id);

-- Update default values for timestamp columns
ALTER TABLE attachments ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE order_history ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE verification_logs ALTER COLUMN created_at SET DEFAULT NOW();