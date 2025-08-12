-- 거래처 별칭(Alias) 필드 추가
-- PRD 요구사항: 거래처명의 별칭을 등록해 놓을 수 있는 필드가 필요함
-- 예: (주)익진, 주식회사 익진, 익진 등 다양한 표기를 하나의 거래처로 매칭

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]';

-- 인덱스 추가 (JSONB GIN 인덱스로 빠른 검색 지원)
CREATE INDEX IF NOT EXISTS idx_vendors_aliases ON vendors USING GIN (aliases);

-- 코멘트 추가
COMMENT ON COLUMN vendors.aliases IS '거래처 별칭 목록 - 동일 거래처의 다양한 표기명을 저장 (예: ["(주)익진", "주식회사 익진", "익진"])';