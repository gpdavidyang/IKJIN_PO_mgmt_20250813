# Supabase 설정 가이드

이 문서는 익진종합건설 구매발주관리시스템에서 Supabase 데이터베이스를 설정하는 방법을 안내합니다.

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성
1. [Supabase 웹사이트](https://supabase.com)에 방문
2. "Start your project" 클릭하여 계정 생성
3. GitHub 또는 Google 계정으로 로그인

### 1.2 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Project Name**: `ikjin-po-management`
   - **Database Password**: 강력한 비밀번호 설정 (기록 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택
3. "Create new project" 클릭하여 생성 (약 2분 소요)

## 2. 데이터베이스 설정

### 2.1 API 키 확인
프로젝트 생성 후 Settings > API에서 다음 정보 확인:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon public**: `eyJ...` (공개 API 키)
- **Service role**: `eyJ...` (서비스 역할 키)

### 2.2 데이터베이스 스키마 생성
1. SQL Editor로 이동
2. 다음 명령으로 스키마 생성:

```bash
# 로컬에서 Drizzle 스키마를 Supabase에 푸시
npx drizzle-kit push
```

또는 Supabase SQL Editor에서 직접 실행:

```sql
-- 기본 테이블들이 자동으로 생성됩니다
-- (shared/schema.ts의 Drizzle 스키마에 따라)
```

## 3. 환경 변수 설정

### 3.1 .env 파일 업데이트
프로젝트 루트의 `.env` 파일에 다음 내용 추가:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_PASSWORD=your-database-password

# 기존 PostgreSQL 설정은 주석 처리 (fallback으로 유지)
# DATABASE_URL=postgresql://user:password@host:port/database
```

### 3.2 필수 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: 공개 API 키 (클라이언트용)
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 역할 키 (서버용)
- `SUPABASE_DB_PASSWORD`: 데이터베이스 접속 비밀번호

## 4. 보안 설정

### 4.1 Row Level Security (RLS) 설정
Supabase Dashboard > Authentication > Settings에서:

1. **Enable Row Level Security**: 모든 테이블에 대해 활성화
2. **Policies 생성**: 각 테이블별 접근 권한 정책 설정

예시 정책:
```sql
-- users 테이블: 자신의 정보만 조회/수정 가능
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

-- 관리자는 모든 데이터 접근 가능
CREATE POLICY "Admins can access all data" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role = 'admin'
    )
  );
```

### 4.2 이메일 인증 설정
Authentication > Settings에서:
- **Enable email confirmations**: 활성화
- **Email templates**: 한국어로 커스터마이징
- **Redirect URLs**: 프론트엔드 URL 추가

## 5. 연결 테스트

### 5.1 서버 시작
```bash
npm run dev
```

### 5.2 연결 상태 확인
서버 로그에서 다음 메시지 확인:
```
✅ Supabase database connected successfully
📊 Using Supabase database connection
```

### 5.3 대시보드에서 확인
Supabase Dashboard > Database에서 테이블이 생성되었는지 확인

## 6. 마이그레이션 가이드

### 6.1 기존 PostgreSQL에서 Supabase로 이전

1. **데이터 백업**:
```bash
pg_dump $DATABASE_URL > backup.sql
```

2. **Supabase로 복원**:
```bash
psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.your-project-id.supabase.co:5432/postgres" < backup.sql
```

3. **환경 변수 변경** 후 서버 재시작

### 6.2 롤백 방법
Supabase에 문제가 있을 경우:
1. `.env`에서 Supabase 설정 주석 처리
2. 기존 `DATABASE_URL` 주석 해제
3. 서버 재시작

## 7. 모니터링 및 관리

### 7.1 사용량 모니터링
- Supabase Dashboard > Settings > Usage
- 무료 플랜 한도: 
  - 데이터베이스: 500MB
  - 대역폭: 5GB/월
  - API 요청: 50,000/월

### 7.2 백업 설정
- Settings > Database > Backups
- 자동 백업 활성화 (Pro 플랜 이상)

### 7.3 성능 최적화
- Database > Indexes: 필요한 인덱스 추가
- Logs: 느린 쿼리 모니터링

## 8. 문제 해결

### 8.1 일반적인 오류
1. **연결 실패**: 환경 변수 확인
2. **권한 오류**: RLS 정책 확인
3. **스키마 오류**: `npx drizzle-kit push` 재실행

### 8.2 로그 확인
- 서버 콘솔: 연결 상태 메시지
- Supabase Dashboard > Logs: 데이터베이스 로그

### 8.3 지원 요청
- [Supabase 커뮤니티](https://github.com/supabase/supabase/discussions)
- [공식 문서](https://supabase.com/docs)

## 9. 비용 정보

### 9.1 무료 플랜
- 2개 프로젝트
- 500MB 데이터베이스
- 5GB 대역폭/월
- 50,000 API 요청/월

### 9.2 Pro 플랜 ($25/월)
- 무제한 프로젝트
- 8GB 데이터베이스 포함
- 250GB 대역폭/월
- 자동 백업
- 이메일 지원

### 9.3 예상 비용
중소기업 기준 월 사용량:
- **기본**: 무료 플랜으로 충분
- **성장**: Pro 플랜 권장 ($25/월)
- **확장**: Team 플랜 ($125/월)

---

## 결론

Supabase는 기존 PostgreSQL 인프라를 대체할 수 있는 강력한 Backend-as-a-Service 플랫폼입니다. 
설정이 완료되면 다음과 같은 이점을 얻을 수 있습니다:

✅ **관리 부담 감소**: 데이터베이스 서버 관리 불필요  
✅ **자동 확장**: 트래픽 증가에 따른 자동 스케일링  
✅ **보안 강화**: 내장된 인증 및 보안 기능  
✅ **백업 자동화**: 데이터 손실 위험 최소화  
✅ **모니터링**: 실시간 성능 및 사용량 대시보드  

문의사항이 있으시면 시스템 관리자에게 연락해주세요.