-- Schema cleanup: Remove unused status tables and standardize to ENUM approach
-- Migration 0007: Status table cleanup and standardization

-- 1. Create project status ENUM to standardize project status management
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- 2. Update projects table to use ENUM instead of varchar
-- First, ensure all existing status values are valid
UPDATE projects SET status = 'active' WHERE status NOT IN ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- Convert projects.status to ENUM
ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;

-- 3. Create views for UI display purposes (replacing status tables)
CREATE OR REPLACE VIEW purchase_order_status_display AS
SELECT 
  unnest(enum_range(NULL::purchase_order_status)) as status_code,
  CASE unnest(enum_range(NULL::purchase_order_status))::text
    WHEN 'draft' THEN '임시저장'
    WHEN 'pending' THEN '승인대기'
    WHEN 'approved' THEN '승인완료'
    WHEN 'sent' THEN '발송완료'
    WHEN 'completed' THEN '완료'
  END as status_name,
  CASE unnest(enum_range(NULL::purchase_order_status))::text
    WHEN 'draft' THEN 'gray'
    WHEN 'pending' THEN 'yellow'
    WHEN 'approved' THEN 'blue'
    WHEN 'sent' THEN 'green'
    WHEN 'completed' THEN 'purple'
  END as status_color,
  CASE unnest(enum_range(NULL::purchase_order_status))::text
    WHEN 'draft' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'approved' THEN 3
    WHEN 'sent' THEN 4
    WHEN 'completed' THEN 5
  END as sort_order;

CREATE OR REPLACE VIEW project_status_display AS
SELECT 
  unnest(enum_range(NULL::project_status)) as status_code,
  CASE unnest(enum_range(NULL::project_status))::text
    WHEN 'planning' THEN '계획중'
    WHEN 'active' THEN '진행중'
    WHEN 'on_hold' THEN '보류'
    WHEN 'completed' THEN '완료'
    WHEN 'cancelled' THEN '취소'
  END as status_name,
  CASE unnest(enum_range(NULL::project_status))::text
    WHEN 'planning' THEN 'blue'
    WHEN 'active' THEN 'green'
    WHEN 'on_hold' THEN 'yellow'
    WHEN 'completed' THEN 'purple'
    WHEN 'cancelled' THEN 'red'
  END as status_color,
  CASE unnest(enum_range(NULL::project_status))::text
    WHEN 'planning' THEN 1
    WHEN 'active' THEN 2
    WHEN 'on_hold' THEN 3
    WHEN 'completed' THEN 4
    WHEN 'cancelled' THEN 5
  END as sort_order;

-- 4. Remove unused status tables
-- Note: We keep the data temporarily by backing up to avoid data loss
CREATE TABLE order_statuses_backup AS SELECT * FROM order_statuses;
CREATE TABLE project_statuses_backup AS SELECT * FROM project_statuses;

-- Drop the unused tables
DROP TABLE IF EXISTS order_statuses CASCADE;
DROP TABLE IF EXISTS project_statuses CASCADE;

-- 5. Add comments for documentation
COMMENT ON TYPE purchase_order_status IS 'Status enumeration for purchase orders - managed via ENUM for performance and type safety';
COMMENT ON TYPE project_status IS 'Status enumeration for projects - managed via ENUM for performance and type safety';
COMMENT ON VIEW purchase_order_status_display IS 'Display metadata for purchase order statuses - replaces order_statuses table';
COMMENT ON VIEW project_status_display IS 'Display metadata for project statuses - replaces project_statuses table';