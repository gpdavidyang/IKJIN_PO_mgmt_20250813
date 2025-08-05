-- Performance Optimization SQL for Order Management System
-- Execute these commands to improve database query performance

-- 1. Add indexes for common query patterns on purchase_orders table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_status_date 
ON purchase_orders(status, order_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_vendor_date 
ON purchase_orders(vendor_id, order_date DESC) 
WHERE vendor_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_project_date 
ON purchase_orders(project_id, order_date DESC) 
WHERE project_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_user_date 
ON purchase_orders(user_id, order_date DESC);

-- 2. Composite index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_composite 
ON purchase_orders(status, vendor_id, project_id, order_date DESC) 
WHERE status IS NOT NULL;

-- 3. Index for full-text search on order_number
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_order_number 
ON purchase_orders USING gin(to_tsvector('english', order_number));

-- 4. Index for amount range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_amount 
ON purchase_orders(total_amount);

-- 5. Indexes for related tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_name 
ON vendors(name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_name 
ON projects(project_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name 
ON users(name);

-- 6. Index for purchase_order_items to avoid N+1 queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_items_order_id 
ON purchase_order_items(order_id);

-- 7. Statistics update for better query planning
ANALYZE purchase_orders;
ANALYZE vendors;
ANALYZE projects;
ANALYZE users;
ANALYZE purchase_order_items;

-- 8. Create optimized view for order list queries
CREATE OR REPLACE VIEW order_list_view AS
SELECT 
    po.id,
    po.order_number,
    po.status,
    po.total_amount,
    po.order_date,
    po.delivery_date,
    po.user_id,
    po.vendor_id,
    po.project_id,
    po.created_at,
    v.name as vendor_name,
    p.project_name,
    u.name as user_name,
    po.approval_level,
    po.current_approver_role
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN projects p ON po.project_id = p.id
LEFT JOIN users u ON po.user_id = u.id;

-- 9. Create materialized view for dashboard statistics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS order_stats_mv AS
SELECT 
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as avg_amount,
    DATE_TRUNC('month', order_date) as month
FROM purchase_orders
GROUP BY status, DATE_TRUNC('month', order_date);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_order_stats_mv_status_month 
ON order_stats_mv(status, month);

-- 10. Function to refresh materialized view (call periodically)
CREATE OR REPLACE FUNCTION refresh_order_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY order_stats_mv;
END;
$$ LANGUAGE plpgsql;