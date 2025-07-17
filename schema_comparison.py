def compare_schema_with_input_sheet():
    """PO Template Input 시트와 현재 purchase_orders 테이블 스키마 비교"""
    
    # Input 시트 헤더 (분석 결과)
    input_headers = [
        "발주번호",      # A열
        "발주일",        # B열  
        "현장명",        # C열
        "대분류",        # D열
        "중분류",        # E열
        "소분류",        # F열
        "품목명",        # G열
        "규격",          # H열
        "수량",          # I열
        "단가",          # J열
        "공급가액",      # K열
        "세액",          # L열
        "총금액",        # M열
        "납기일",        # N열
        "거래처명",      # O열
        "납품처명",      # P열
        "비고"           # Q열
    ]
    
    # 현재 purchase_orders 테이블 필드 (스키마 분석 결과)
    current_po_fields = [
        "id",
        "orderNumber",         # 발주번호 ✓
        "projectId",           # 프로젝트 ID (현장명과 연결)
        "vendorId",            # 거래처 ID (거래처명과 연결)
        "userId",              # 사용자 ID
        "templateId",          # 템플릿 ID
        "orderDate",           # 발주일 ✓
        "deliveryDate",        # 납기일 ✓
        "status",              # 상태
        "totalAmount",         # 총금액 ✓
        "notes",               # 비고 ✓
        "customFields",        # 커스텀 필드 (JSON)
        "isApproved",          # 승인 여부
        "approvedBy",          # 승인자
        "approvedAt",          # 승인일
        "sentAt",              # 발송일
        "currentApproverRole", # 현재 승인자 역할
        "approvalLevel",       # 승인 단계
        "createdAt",           # 생성일
        "updatedAt"            # 수정일
    ]
    
    # purchase_order_items 테이블 필드
    current_poi_fields = [
        "id",
        "orderId",             # 발주서 ID
        "itemId",              # 품목 ID
        "itemName",            # 품목명 ✓
        "specification",       # 규격 ✓
        "quantity",            # 수량 ✓
        "unitPrice",           # 단가 ✓
        "totalAmount",         # 총금액 ✓
        "notes",               # 비고 ✓
        "createdAt"            # 생성일
    ]
    
    print("=== 스키마 비교 분석 ===")
    print("\n1. Input 시트 헤더와 현재 DB 매핑:")
    
    mapping = {
        "발주번호": "purchase_orders.orderNumber ✓",
        "발주일": "purchase_orders.orderDate ✓",
        "현장명": "purchase_orders.projectId (projects.projectName) ✓",
        "대분류": "❌ 없음 - 새로 추가 필요",
        "중분류": "❌ 없음 - 새로 추가 필요",
        "소분류": "❌ 없음 - 새로 추가 필요",
        "품목명": "purchase_order_items.itemName ✓",
        "규격": "purchase_order_items.specification ✓",
        "수량": "purchase_order_items.quantity ✓",
        "단가": "purchase_order_items.unitPrice ✓",
        "공급가액": "❌ 없음 - 새로 추가 필요",
        "세액": "❌ 없음 - 새로 추가 필요",
        "총금액": "purchase_order_items.totalAmount ✓",
        "납기일": "purchase_orders.deliveryDate ✓",
        "거래처명": "purchase_orders.vendorId (vendors.name) ✓",
        "납품처명": "❌ 없음 - 새로 추가 필요",
        "비고": "purchase_order_items.notes ✓"
    }
    
    for header, db_field in mapping.items():
        print(f"  {header:8} → {db_field}")
    
    print("\n2. 누락된 필드:")
    missing_fields = [
        "대분류 (category_lv1)",
        "중분류 (category_lv2)", 
        "소분류 (category_lv3)",
        "공급가액 (supply_amount)",
        "세액 (tax_amount)",
        "납품처명 (delivery_name)"
    ]
    
    for field in missing_fields:
        print(f"  ❌ {field}")
    
    print("\n3. 해결 방안:")
    print("  A. purchase_order_items 테이블에 추가할 필드:")
    print("     - category_lv1 (대분류)")
    print("     - category_lv2 (중분류)")
    print("     - category_lv3 (소분류)")
    print("     - supply_amount (공급가액)")
    print("     - tax_amount (세액)")
    print("     - delivery_name (납품처명)")
    
    print("\n  B. 마이그레이션 스크립트 필요:")
    print("     - ALTER TABLE purchase_order_items ADD COLUMN ...")
    
    print("\n4. 데이터 흐름:")
    print("  Input 시트 → 파싱 → purchase_orders + purchase_order_items")
    print("  - 1개 Input 행 → 1개 purchase_order_items 행")
    print("  - 같은 발주번호 → 같은 purchase_orders 행")
    
    return mapping, missing_fields

if __name__ == "__main__":
    mapping, missing_fields = compare_schema_with_input_sheet()
    
    print(f"\n=== 요약 ===")
    print(f"매핑 가능한 필드: {len([v for v in mapping.values() if '✓' in v])}/17")
    print(f"누락된 필드: {len(missing_fields)}")
    print(f"추가 작업 필요: 스키마 업데이트 + 파싱 로직 구현")