-- Add indexes for optimized order list performance
-- These indexes will significantly improve query speed for the orders page

-- Index for order number search
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number 
ON purchase_orders(order_number);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
ON purchase_orders(status);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date 
ON purchase_orders(order_date DESC);

-- Index for vendor filtering and searching
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id 
ON purchase_orders(vendor_id);

-- Index for project filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id 
ON purchase_orders(project_id);

-- Index for user filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id 
ON purchase_orders(user_id);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date 
ON purchase_orders(status, order_date DESC);

-- Index for amount range queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_total_amount 
ON purchase_orders(total_amount);

-- Index for created_at (default sorting)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at 
ON purchase_orders(created_at DESC);

-- Text search index for order number (for LIKE queries)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number_text 
ON purchase_orders USING gin(to_tsvector('simple', order_number));

-- Vendor name index for search
CREATE INDEX IF NOT EXISTS idx_vendors_name 
ON vendors(name);

-- Project name index for search  
CREATE INDEX IF NOT EXISTS idx_projects_project_name
ON projects(project_name);

-- User name index for search
CREATE INDEX IF NOT EXISTS idx_users_name
ON users(name);

-- Analyze tables to update statistics for query planner
ANALYZE purchase_orders;
ANALYZE vendors;
ANALYZE projects;
ANALYZE users;