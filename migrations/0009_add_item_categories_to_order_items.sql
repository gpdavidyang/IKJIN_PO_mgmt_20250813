-- 품목 계층 구조 필드 추가 - purchaseOrderItems 테이블
-- 2025-08-05: 품목 계층별 통계 및 검색 기능 지원

-- purchaseOrderItems 테이블에 품목 계층 필드 추가
ALTER TABLE purchase_order_items
ADD COLUMN major_category VARCHAR(100),
ADD COLUMN middle_category VARCHAR(100),
ADD COLUMN minor_category VARCHAR(100);

-- 품목 계층별 검색 성능 향상을 위한 인덱스 생성
CREATE INDEX idx_poi_major_category ON purchase_order_items(major_category);
CREATE INDEX idx_poi_middle_category ON purchase_order_items(middle_category);
CREATE INDEX idx_poi_minor_category ON purchase_order_items(minor_category);

-- 복합 인덱스 (계층별 드릴다운 검색용)
CREATE INDEX idx_poi_category_hierarchy ON purchase_order_items(major_category, middle_category, minor_category);

-- 기존 items 테이블의 품목 계층 정보를 purchaseOrderItems에 복사 (선택사항)
-- 이 부분은 필요시 수동으로 실행
/*
UPDATE purchase_order_items poi
SET 
  major_category = i.major_category,
  middle_category = i.middle_category,
  minor_category = i.minor_category
FROM items i
WHERE poi.item_name = i.name
  AND poi.major_category IS NULL;
*/