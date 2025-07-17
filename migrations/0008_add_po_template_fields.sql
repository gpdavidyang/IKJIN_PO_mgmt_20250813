-- 마이그레이션: PO Template Input 시트를 위한 필드 추가
-- 파일: 0008_add_po_template_fields.sql
-- 생성일: 2025-07-16

-- purchase_order_items 테이블에 누락된 필드들 추가
ALTER TABLE purchase_order_items 
ADD COLUMN category_lv1 VARCHAR(100), -- 대분류
ADD COLUMN category_lv2 VARCHAR(100), -- 중분류  
ADD COLUMN category_lv3 VARCHAR(100), -- 소분류
ADD COLUMN supply_amount DECIMAL(15,2) DEFAULT 0 NOT NULL, -- 공급가액
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0 NOT NULL, -- 세액
ADD COLUMN delivery_name VARCHAR(255); -- 납품처명

-- 인덱스 추가 (분류별 통계 분석을 위해)
CREATE INDEX idx_purchase_order_items_category_lv1 ON purchase_order_items(category_lv1);
CREATE INDEX idx_purchase_order_items_category_lv2 ON purchase_order_items(category_lv2);
CREATE INDEX idx_purchase_order_items_category_lv3 ON purchase_order_items(category_lv3);

-- 기존 데이터 보정 (필요시)
-- UPDATE purchase_order_items SET supply_amount = total_amount WHERE supply_amount = 0;
-- UPDATE purchase_order_items SET tax_amount = total_amount * 0.1 WHERE tax_amount = 0;

-- 제약 조건 추가 (데이터 무결성 보장)
ALTER TABLE purchase_order_items 
ADD CONSTRAINT check_supply_amount_positive CHECK (supply_amount >= 0),
ADD CONSTRAINT check_tax_amount_positive CHECK (tax_amount >= 0);

-- 주석 추가
COMMENT ON COLUMN purchase_order_items.category_lv1 IS '대분류 (예: 전기/전자, 건축자재)';
COMMENT ON COLUMN purchase_order_items.category_lv2 IS '중분류 (예: 조명, 철강)';
COMMENT ON COLUMN purchase_order_items.category_lv3 IS '소분류 (예: LED, 철근)';
COMMENT ON COLUMN purchase_order_items.supply_amount IS '공급가액 (부가세 제외)';
COMMENT ON COLUMN purchase_order_items.tax_amount IS '세액 (부가세)';
COMMENT ON COLUMN purchase_order_items.delivery_name IS '납품처명';