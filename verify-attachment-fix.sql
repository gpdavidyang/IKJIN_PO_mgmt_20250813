-- Check attachments created after the fix deployment
-- The fix was in commit 029b6c8

-- Check recent attachments and their file_data status
SELECT 
    a.id,
    a.order_id,
    po.order_number,
    a.original_name,
    a.mime_type,
    a.file_size,
    CASE 
        WHEN a.file_data IS NOT NULL THEN 'Has data (' || LENGTH(a.file_data) || ' bytes)'
        ELSE 'NULL - NEEDS FIX'
    END as data_status,
    a.uploaded_at,
    CASE 
        WHEN a.id > 148 THEN 'After fix'
        WHEN a.id <= 114 THEN 'Before bug (working)'
        ELSE 'During bug period'
    END as period
FROM attachments a
LEFT JOIN purchase_orders po ON a.order_id = po.id
WHERE a.id >= 140 OR a.id IN (SELECT MAX(id) FROM attachments)
ORDER BY a.id DESC
LIMIT 20;

-- Summary of attachment status
SELECT 
    CASE 
        WHEN id > 148 THEN 'After fix (new)'
        WHEN id <= 114 THEN 'Before bug'
        ELSE 'During bug (114-148)'
    END as period,
    COUNT(*) as total,
    SUM(CASE WHEN file_data IS NOT NULL THEN 1 ELSE 0 END) as with_data,
    SUM(CASE WHEN file_data IS NULL THEN 1 ELSE 0 END) as without_data
FROM attachments
GROUP BY 
    CASE 
        WHEN id > 148 THEN 'After fix (new)'
        WHEN id <= 114 THEN 'Before bug'
        ELSE 'During bug (114-148)'
    END
ORDER BY period;