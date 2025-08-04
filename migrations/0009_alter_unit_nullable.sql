-- unit 컬럼을 NULL 허용으로 변경
ALTER TABLE purchase_order_items ALTER COLUMN unit DROP NOT NULL;