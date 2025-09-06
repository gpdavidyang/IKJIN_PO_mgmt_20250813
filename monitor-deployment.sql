-- Monitor deployment status by checking if new attachments have file_data
-- Run this query periodically to see when the fix is deployed

-- Check the latest attachments
SELECT 
    id,
    order_id,
    original_name,
    CASE 
        WHEN mime_type LIKE '%pdf%' THEN 'PDF'
        WHEN mime_type LIKE '%excel%' OR mime_type LIKE '%spreadsheet%' THEN 'Excel'
        ELSE 'Other'
    END as file_type,
    file_size,
    CASE 
        WHEN file_data IS NOT NULL THEN '✅ Has data'
        ELSE '❌ NULL'
    END as data_status,
    uploaded_at
FROM attachments
WHERE id > 160  -- Check attachments created after the deployment
ORDER BY id DESC
LIMIT 10;

-- Summary showing deployment status
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM attachments 
            WHERE id > 160 AND file_data IS NOT NULL
        ) THEN '🎉 DEPLOYMENT SUCCESSFUL - New attachments have file_data!'
        ELSE '⏳ Waiting for deployment - New attachments still missing file_data'
    END as deployment_status,
    (SELECT MAX(id) FROM attachments) as latest_attachment_id,
    (SELECT COUNT(*) FROM attachments WHERE id > 160) as attachments_after_deployment,
    (SELECT COUNT(*) FROM attachments WHERE id > 160 AND file_data IS NOT NULL) as working_attachments;