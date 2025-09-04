#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3000/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZXZfYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU2OTY4NzIzLCJleHAiOjE3NTc1NzM1MjN9.-bjrXdoW2HwuCaH5gTXa-XG06VdsVZGYLXcRJGeCP0U"

echo -e "${BLUE}🚀 Excel 업로드 및 중복 감지 통합 테스트${NC}"
echo "================================================"

# 1. Excel 파일 업로드
echo -e "\n${YELLOW}1. Excel 파일 업로드 테스트${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST \
  "$API_BASE/excel/upload/smart" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-data/test-purchase-order-with-duplicates.xlsx")

echo "$UPLOAD_RESPONSE" | python3 -m json.tool

# 세션 ID 추출
SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('sessionId', ''))")

if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}❌ 업로드 실패 - 세션 ID를 받지 못했습니다${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 업로드 성공 - 세션 ID: $SESSION_ID${NC}"

# 2. 처리 대기
echo -e "\n${YELLOW}2. 처리 대기 중... (5초)${NC}"
sleep 5

# 3. 검증 상태 확인
echo -e "\n${YELLOW}3. 검증 상태 확인${NC}"
VALIDATION_RESPONSE=$(curl -s -X GET \
  "$API_BASE/excel/validation/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$VALIDATION_RESPONSE" | python3 -m json.tool

# 결과 파싱
STATUS=$(echo "$VALIDATION_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('status', 'unknown'))")

if [ "$STATUS" == "completed" ] || [ "$STATUS" == "processing" ]; then
  echo -e "${GREEN}✅ 검증 처리 중 또는 완료: $STATUS${NC}"
  
  # 결과 요약
  echo -e "\n${YELLOW}4. 검증 결과 요약${NC}"
  python3 <<EOF
import json
data = json.loads('''$VALIDATION_RESPONSE''')
results = data.get('results', [])

if results:
    duplicates = [r for r in results if 'duplicate' in str(r.get('errors', [])).lower() or 'duplicate' in str(r.get('warnings', [])).lower()]
    errors = [r for r in results if r.get('status') == 'error']
    warnings = [r for r in results if r.get('status') == 'warning']
    
    print(f"📊 총 {len(results)}개 항목 검증")
    print(f"❌ 오류: {len(errors)}개")
    print(f"⚠️  경고: {len(warnings)}개")
    print(f"🔄 중복 감지: {len(duplicates)}개")
    
    if duplicates:
        print("\n중복 항목 상세:")
        for d in duplicates[:5]:
            print(f"  - 행 {d.get('rowIndex')}: {d.get('errors', d.get('warnings', []))}")
else:
    print("검증 결과가 아직 없습니다")
EOF

elif [ "$STATUS" == "failed" ]; then
  echo -e "${RED}❌ 검증 실패${NC}"
else
  echo -e "${YELLOW}⏳ 상태: $STATUS${NC}"
fi

# 5. AI 제안 테스트 (옵션)
echo -e "\n${YELLOW}5. AI 제안 생성 테스트${NC}"
AI_RESPONSE=$(curl -s -X POST \
  "$API_BASE/excel/ai/suggest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"includeCategories\": true,
    \"includeVendors\": true,
    \"includeEmails\": true,
    \"confidenceThreshold\": 80
  }")

echo "$AI_RESPONSE" | python3 -m json.tool

echo -e "\n${GREEN}✨ 테스트 완료!${NC}"
echo "================================================"