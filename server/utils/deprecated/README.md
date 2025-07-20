# Deprecated Excel Processing Files

이 폴더에는 현재 사용되지 않는 Excel 처리 파일들이 보관되어 있습니다.

## 파일 목록

### excel-direct-copy.ts
- **상태**: DEPRECATED
- **이유**: 복잡한 10단계 폴백 시스템이지만 실제로는 사용되지 않음
- **대체**: excel-input-sheet-remover.ts의 removeAllInputSheets()

### excel-zip-perfect.ts 
- **상태**: DEPRECATED
- **이유**: 불완전한 ZIP 처리 (Content_Types.xml 누락)
- **대체**: excel-input-sheet-remover.ts

### excel-zip-complete.ts
- **상태**: DEPRECATED  
- **이유**: 개선된 버전이지만 실제 연결되지 않음
- **대체**: excel-input-sheet-remover.ts

### excel-binary-perfect.ts
- **상태**: DEPRECATED
- **이유**: 바이너리 처리 방식이지만 실제 사용되지 않음
- **대체**: excel-input-sheet-remover.ts

## 현재 활성 파일

### ✅ excel-input-sheet-remover.ts
- **용도**: Input으로 시작하는 모든 시트 제거
- **사용처**: po-template-processor-mock.ts
- **특징**: 완전한 ZIP 구조 처리로 100% 서식 보존

## 주의사항

- 이 파일들은 삭제하지 마세요 (참고용으로 보관)
- 새로운 Excel 처리 기능 개발 시 참고 자료로 활용 가능
- 실제 사용하려면 import 경로를 수정하고 충분한 테스트 필요