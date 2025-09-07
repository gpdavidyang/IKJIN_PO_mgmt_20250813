# 한글 폰트 지원 시스템 (Korean Font Support System)

이 문서는 Vercel 서버리스 환경에서 한글 폰트를 지원하는 PDF 생성 시스템에 대한 종합 가이드입니다.

## 🎯 Overview

구매발주서 관리 시스템에서 한글 텍스트가 포함된 PDF를 Vercel 서버리스 환경에서도 완벽하게 렌더링할 수 있도록 최적화된 폰트 관리 시스템입니다.

## 🏗️ Architecture

### 핵심 구성요소

1. **한글 폰트 관리자** (`server/utils/korean-font-manager.ts`)
   - 시스템 및 프로젝트 폰트 자동 탐지
   - Base64 인코딩 및 캐싱 시스템
   - Vercel 환경 최적화

2. **PDF 생성 서비스** (`server/services/professional-pdf-generation-service.ts`)
   - PDFKit 한글 폰트 통합
   - 환경별 최적화된 폰트 로딩
   - Fallback 텍스트 변환

3. **API 엔드포인트** (`server/routes/korean-font-status.ts`)
   - 폰트 상태 진단
   - PDF 생성 테스트
   - Base64 폰트 인코딩

## 📁 폰트 파일 구조

```
fonts/
├── README.md                  # 폰트 설치 가이드
├── NotoSansKR-Regular.ttf     # Noto Sans KR (Google Fonts)
└── NanumGothic-Regular.ttf    # Nanum Gothic (Naver)
```

## 🔧 지원되는 폰트 (우선순위 순)

### 1. 프로젝트 포함 폰트 (Vercel 호환)
- **NotoSansKR**: Google의 오픈소스 한글 폰트 (~15MB)
- **NanumGothic**: Naver의 오픈소스 한글 폰트 (~284KB)

### 2. 시스템 폰트 (로컬 개발용)
- **AppleGothic**: macOS 시스템 폰트 (~15MB)
- **AppleSDGothicNeo**: macOS 시스템 폰트 (~27MB)
- **MalgunGothic**: Windows 시스템 폰트
- **NanumGothicLinux**: Linux 시스템 폰트

## 🚀 사용법

### 1. 폰트 상태 확인

```bash
curl http://localhost:3000/api/korean-font/status
```

**응답 예시:**
```json
{
  "success": true,
  "fontSupport": {
    "isOptimized": true,
    "totalFonts": 6,
    "availableFonts": 4,
    "recommendedFont": "NotoSansKR",
    "hasKoreanSupport": true
  },
  "fonts": [
    {
      "name": "NotoSansKR",
      "available": true,
      "sizeKB": 14898,
      "path": "PROJECT"
    }
  ],
  "textConversion": {
    "withFont": "구매발주서 테스트",
    "withoutFont": "Purchase Order [Korean Text]"
  }
}
```

### 2. 한글 PDF 생성 테스트

```bash
curl -X POST http://localhost:3000/api/korean-font/test-pdf
```

**응답 예시:**
```json
{
  "success": true,
  "fontUsed": "NotoSansKR",
  "pdfSizeKB": 39,
  "base64PDF": "JVBERi0xLjMKJcfs..."
}
```

### 3. 프로그래밍 방식 사용

```typescript
import { fontManager } from '../utils/korean-font-manager';
import { ProfessionalPDFGenerationService } from '../services/professional-pdf-generation-service';

// 폰트 상태 확인
const fontReport = fontManager.getFontReport();
console.log(`사용 가능한 폰트: ${fontReport.availableFonts}개`);

// 최적 폰트 선택
const bestFont = fontManager.getBestKoreanFont();
console.log(`추천 폰트: ${bestFont?.name}`);

// 한글 텍스트 안전 변환
const safeText = fontManager.safeKoreanText('구매발주서', true);
console.log(`변환된 텍스트: ${safeText}`);

// PDF 생성
const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDFWithPDFKit(orderData);
```

## 🔄 작동 원리

### 환경별 폰트 로딩 전략

#### Vercel 서버리스 환경
1. **프로젝트 폰트 우선 사용**
2. **Buffer 방식 로딩**: `fs.readFileSync()` → `doc.registerFont()`
3. **메모리 캐싱**: 폰트 재사용으로 성능 최적화

#### 로컬 개발 환경
1. **프로젝트 + 시스템 폰트 모두 사용**
2. **파일 경로 방식 로딩**: `doc.registerFont('Korean', fontPath)`
3. **개발 편의성**: 다양한 폰트 옵션

### Fallback 시스템

한글 폰트가 없는 경우 자동으로 영문 대체:

```typescript
const koreanToEnglish = {
  '구매발주서': 'Purchase Order',
  '발주번호': 'Order No',
  '거래처': 'Vendor',
  '품목명': 'Item Name',
  '수량': 'Quantity',
  '단가': 'Unit Price',
  '총 금액': 'Total Amount'
  // ... 더 많은 매핑
};
```

## 📊 성능 최적화

### 1. 폰트 캐싱
- **Base64 캐싱**: 한 번 인코딩된 폰트는 메모리에 캐시
- **폰트 정보 캐싱**: 파일 시스템 접근 최소화

### 2. 선택적 로딩
- **환경별 최적화**: Vercel에서는 프로젝트 폰트만 로딩
- **우선순위 기반**: 가장 적합한 폰트 자동 선택

### 3. 메모리 효율성
- **싱글톤 패턴**: 폰트 관리자 인스턴스 재사용
- **지연 로딩**: 필요할 때만 Base64 인코딩

## 🔧 설정 및 배포

### Vercel 환경 설정

**vercel.json**에 폰트 파일 포함:
```json
{
  "routes": [
    {
      "src": "/(.*\\.(ttf|otf))",
      "dest": "$1"
    }
  ]
}
```

### 환경 변수
```bash
VERCEL=1                    # Vercel 환경 감지
NODE_ENV=production         # 운영 환경
```

### 빌드 최적화
- 폰트 파일이 빌드에 자동 포함됨
- gzip 압축으로 전송 크기 최소화
- CDN 캐싱으로 로딩 속도 향상

## 🐛 문제 해결

### 1. 폰트가 인식되지 않는 경우
```bash
# 폰트 상태 확인
curl http://localhost:3000/api/korean-font/status

# 파일 존재 여부 확인
ls -la fonts/
file fonts/NotoSansKR-Regular.ttf
```

### 2. PDF 생성 실패
- PDFKit 호환 폰트 형식 확인 (TTF/OTF)
- 폰트 파일 권한 확인
- 메모리 제한 확인 (Vercel: 1024MB)

### 3. 한글 텍스트가 영문으로 표시
- 폰트 등록 상태 확인
- Fallback 시스템 정상 작동
- 브라우저 폰트 캐시 초기화

## 📈 모니터링

### API 엔드포인트
- `GET /api/korean-font/status` - 폰트 지원 상태
- `POST /api/korean-font/test-pdf` - PDF 생성 테스트
- `GET /api/korean-font/base64-font` - Base64 폰트 확인

### 로그 모니터링
```bash
# 폰트 초기화 로그
🔍 [FontManager] 한글 폰트 초기화 시작...
✅ [FontManager] 폰트 발견: NotoSansKR (14898KB)
📊 [FontManager] 총 4개 한글 폰트 사용 가능

# PDF 생성 로그
🎯 [ProfessionalPDF] 선택된 한글 폰트: NotoSansKR
✅ [ProfessionalPDF] Vercel 환경에서 한글 폰트 등록 성공
```

## 🎨 Custom 폰트 추가

새로운 한글 폰트를 추가하려면:

1. **폰트 파일 추가**
```bash
# fonts/ 디렉토리에 TTF/OTF 파일 추가
cp MyKoreanFont.ttf fonts/
```

2. **폰트 관리자 설정 업데이트**
```typescript
// server/utils/korean-font-manager.ts
private static readonly FONT_PRIORITIES: FontInfo[] = [
  {
    name: 'MyKoreanFont',
    path: path.join(process.cwd(), 'fonts', 'MyKoreanFont.ttf'),
    available: false
  },
  // ... 기존 폰트들
];
```

3. **서버 재시작**
```bash
npm run dev
```

## 📝 라이선스

- **Noto Sans KR**: SIL Open Font License 1.1
- **Nanum Gothic**: SIL Open Font License 1.1

## 🤝 기여

한글 폰트 시스템 개선을 위한 기여를 환영합니다:

1. 새로운 오픈소스 한글 폰트 추가
2. 성능 최적화
3. 버그 수정 및 테스트 케이스 추가
4. 문서 개선

## 🔗 관련 링크

- [Google Fonts - Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR)
- [Naver - Nanum Font](https://hangeul.naver.com/font)
- [PDFKit Documentation](https://pdfkit.org/)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

**마지막 업데이트**: 2025-09-07  
**버전**: v2.1.0-korean-font-optimized