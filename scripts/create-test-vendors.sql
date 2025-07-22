-- =============================================
-- 테스트 거래처(Vendors) 생성 SQL Script  
-- Purchase Order Management System
-- =============================================
-- 
-- 이 스크립트는 건설업 특성을 반영한 거래처를 생성합니다.
-- Data Integrity를 위해 SQL Editor를 통해 직접 실행하세요.
--
-- 주요 거래처 업종:
-- 1. 압출 (Extrusion): 알루미늄 압출, 플라스틱 압출 등
-- 2. 단열 (Insulation): 단열재, 방수재, 차음재 등  
-- 3. 도장 (Painting): 도료, 페인트, 코팅재 등
-- 4. 창호 (Windows/Doors): 창문, 문, 유리, 철물 등
-- 5. 기타: 철근, 콘크리트, 건설자재 등
-- =============================================

-- 기존 테스트 거래처 삭제 (충돌 방지)  
DELETE FROM vendors WHERE business_number LIKE 'TEST-%' OR name LIKE '%테스트%';

-- =============================================
-- 1. 압출 (Extrusion) 전문업체
-- =============================================

-- 1-1. 알루미늄 압출 전문
INSERT INTO vendors (
    name,
    business_number, 
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '(주)대한알루미늄압출',
    'TEST-123-45-67890',
    '김압출',
    'sales@daehan-al.co.kr',
    '031-123-4567',
    '경기도 안산시 단원구 성곡동 공단로 123',
    '압출 - 알루미늄 압출재',
    true,
    NOW(),
    NOW()
);

-- 1-2. PVC 압출 전문  
INSERT INTO vendors (
    name,
    business_number,
    contact_person, 
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '동양플라스틱공업(주)',
    'TEST-234-56-78901',
    '박PVC',
    'info@dongyang-pvc.com',
    '032-234-5678', 
    '인천광역시 남동구 논현동 산업단지로 456',
    '압출 - PVC 압출재',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 2. 단열 (Insulation) 전문업체
-- =============================================

-- 2-1. 단열재 종합 공급업체
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email, 
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '한국단열시스템(주)',
    'TEST-345-67-89012',
    '이단열',
    'sales@korea-insul.co.kr',
    '041-345-6789',
    '충청남도 천안시 서북구 성환읍 산업로 789',
    '단열 - 단열재/방수재',
    true,
    NOW(),
    NOW()
);

-- 2-2. 친환경 단열재 전문
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone, 
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '그린텍단열재(주)',
    'TEST-456-78-90123',
    '최친환경',
    'green@greentech-insul.com',
    '031-456-7890',
    '경기도 평택시 포승읍 녹색산업로 321',
    '단열 - 친환경 단열재',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 3. 도장 (Painting) 전문업체  
-- =============================================

-- 3-1. 건축용 도료 전문
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address, 
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '삼화페인트공업(주)',
    'TEST-567-89-01234',
    '정도장',
    'arch@samhwa-paint.co.kr', 
    '02-567-8901',
    '서울특별시 금천구 가산디지털1로 654',
    '도장 - 건축용 도료',
    true,
    NOW(),
    NOW()
);

-- 3-2. 산업용 코팅 전문
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '코리아코팅시스템(주)',
    'TEST-678-90-12345', 
    '강코팅',
    'industrial@korea-coating.com',
    '055-678-9012',
    '경상남도 창원시 성산구 공단로 987',
    '도장 - 산업용 코팅재',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 4. 창호 (Windows/Doors) 전문업체
-- =============================================

-- 4-1. 시스템 창호 전문  
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '대우건설창호(주)',
    'TEST-789-01-23456',
    '윤창호',
    'system@daewoo-window.co.kr',
    '031-789-0123',
    '경기도 화성시 향남읍 산업단지로 147',
    '창호 - 시스템창호/커튼월',
    true,
    NOW(),
    NOW()
);

-- 4-2. 유리 전문업체
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '한국판유리공업(주)',
    'TEST-890-12-34567',
    '서유리',
    'glass@korea-glass.co.kr', 
    '041-890-1234',
    '충청남도 아산시 배방읍 공단로 258',
    '창호 - 건축용 유리',
    true,
    NOW(),
    NOW()
);

-- 4-3. 문 전문업체
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '프리미엄도어시스템(주)', 
    'TEST-901-23-45678',
    '문전문',
    'door@premium-door.com',
    '051-901-2345',
    '부산광역시 강서구 명지국제신도시 산업로 369',
    '창호 - 문/도어시스템',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 5. 기타 건설자재 업체
-- =============================================

-- 5-1. 철근 전문  
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '동국제강(주)',
    'TEST-012-34-56789',
    '철강재',
    'rebar@dongkuk-steel.co.kr',
    '032-012-3456',
    '인천광역시 동구 송현동 제철로 741',
    '기타 - 철근/철강재',
    true,
    NOW(),
    NOW()
);

-- 5-2. 레미콘 전문
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '한라시멘트(주)',
    'TEST-123-45-67891',
    '한레미콘', 
    'concrete@halla-cement.co.kr',
    '033-123-4567',
    '강원도 삼척시 도계읍 시멘트로 852',
    '기타 - 레미콘/시멘트',
    true,
    NOW(),
    NOW()
);

-- 5-3. 건설자재 종합상사
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '대한건설자재(주)',
    'TEST-234-56-78902', 
    '종합자재',
    'materials@daehan-materials.co.kr',
    '02-234-5678',
    '서울특별시 강남구 테헤란로 963',
    '기타 - 건설자재 종합',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 6. 특수 자재 업체 (고급/첨단)
-- =============================================

-- 6-1. 스마트 빌딩 자재  
INSERT INTO vendors (
    name,
    business_number,
    contact_person,
    email,
    phone,
    address,
    business_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    '스마트빌딩테크(주)',
    'TEST-345-67-89013',
    '김스마트',
    'smart@smartbuilding-tech.com',
    '031-345-6789',
    '경기도 성남시 분당구 판교역로 123',
    '특수 - 스마트빌딩 시스템',
    true,
    NOW(),
    NOW()
);

-- =============================================
-- 테스트 데이터 확인 쿼리
-- =============================================

-- 생성된 거래처 확인
SELECT 
    id,
    name,
    business_number,
    contact_person,
    email,
    phone,
    business_type,
    is_active
FROM vendors 
WHERE business_number LIKE 'TEST-%'
ORDER BY business_type, name;

-- 업종별 거래처 현황
SELECT 
    SPLIT_PART(business_type, ' - ', 1) as main_category,
    COUNT(*) as vendor_count,
    STRING_AGG(name, ', ') as vendor_names
FROM vendors 
WHERE business_number LIKE 'TEST-%'
GROUP BY SPLIT_PART(business_type, ' - ', 1)
ORDER BY vendor_count DESC;

-- 지역별 거래처 분포
SELECT 
    CASE 
        WHEN address LIKE '%서울%' THEN '서울'
        WHEN address LIKE '%경기%' THEN '경기'  
        WHEN address LIKE '%인천%' THEN '인천'
        WHEN address LIKE '%충청%' THEN '충청'
        WHEN address LIKE '%경상%' THEN '경상'
        WHEN address LIKE '%강원%' THEN '강원'
        WHEN address LIKE '%부산%' THEN '부산'
        ELSE '기타'
    END as region,
    COUNT(*) as vendor_count
FROM vendors 
WHERE business_number LIKE 'TEST-%'
GROUP BY 
    CASE 
        WHEN address LIKE '%서울%' THEN '서울'
        WHEN address LIKE '%경기%' THEN '경기'
        WHEN address LIKE '%인천%' THEN '인천'  
        WHEN address LIKE '%충청%' THEN '충청'
        WHEN address LIKE '%경상%' THEN '경상'
        WHEN address LIKE '%강원%' THEN '강원'
        WHEN address LIKE '%부산%' THEN '부산'
        ELSE '기타'
    END
ORDER BY vendor_count DESC;

-- =============================================
-- 테스트 거래처 정보 요약
-- =============================================
/*
생성된 테스트 거래처 (총 13개):

🔧 압출 (Extrusion) - 2개:
   - (주)대한알루미늄압출: 알루미늄 압출재 전문
   - 동양플라스틱공업(주): PVC 압출재 전문

🏠 단열 (Insulation) - 2개:  
   - 한국단열시스템(주): 단열재/방수재 종합
   - 그린텍단열재(주): 친환경 단열재 전문

🎨 도장 (Painting) - 2개:
   - 삼화페인트공업(주): 건축용 도료 전문
   - 코리아코팅시스템(주): 산업용 코팅재 전문

🪟 창호 (Windows/Doors) - 3개:
   - 대우건설창호(주): 시스템창호/커튼월
   - 한국판유리공업(주): 건축용 유리 전문  
   - 프리미엄도어시스템(주): 문/도어시스템

🏗️ 기타 건설자재 - 3개:
   - 동국제강(주): 철근/철강재 전문
   - 한라시멘트(주): 레미콘/시멘트 전문
   - 대한건설자재(주): 건설자재 종합상사

💡 특수자재 - 1개:
   - 스마트빌딩테크(주): 스마트빌딩 시스템

지역분포: 수도권 중심, 전국 산업단지 고려
연락처: 실제 업계 특성 반영된 담당자명/이메일
*/