-- Add vendor_code column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(50);

-- Create index on vendor_code for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code);