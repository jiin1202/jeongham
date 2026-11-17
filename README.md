# 정함 — 비교는 끝, 루틴은 정함

20대 남성을 위한 스킨케어 루틴 추천 서비스. 올리브영 랭킹 제품 124개의 **전성분**을 분석해, 질문 8개로 피부 타입·고민·예산에 맞는 루틴을 하나로 정해줍니다.

## 주요 기능
| 화면 | 기능 |
| --- | --- |
| `/check` → `/result` | 8문항 진단 → 단계별 1개씩 추천, 대체 후보 교체, 공유 링크 |
| `/products`, `/p/[id]` | 124개 제품 필터·정렬, 제품별 핵심/주의 성분·전성분·고시정보 |
| `/mine` | 지금 쓰는 제품 조합 검사(자극 중복, 레티노이드×각질 성분 등) |
| `/me` | 아침·저녁 체크, 연속 기록, 소진 예정일·캘린더 알림, 만족도 |
| `/log` | 피부 컨디션·사진 기록, 처음 vs 지금 비교 |
| `/guide` | AAD·식약처 근거 스킨케어 가이드 5편 |
| `/login` | 구글/이메일 로그인, 기기 간 동기화 |
| `/admin` | 운영자 대시보드(퍼널, 피부 타입 분포, 추천·구매 클릭 상위) |
| 푸시 | PWA 설치 후 아침·저녁 미체크 알림, 소진 3일 전 재구매 알림 |

Supabase 환경변수가 없으면 로그인 없이 브라우저 저장(로컬 모드)으로 모든 기능이 동작합니다.

## 실행
```bash
npm install
npm run dev        # http://localhost:3000
```

## 배포 (Vercel + Supabase)
1. Supabase 새 프로젝트(리전 Seoul) → SQL Editor에 `supabase/schema.sql` 붙여넣고 실행
2. `insert into admins values ('운영자이메일');` 실행
3. Authentication → Providers에서 Google 사용 설정, Redirect URL에 `https://<도메인>/me/` 추가
4. `npx web-push generate-vapid-keys`로 키 생성
5. Vercel에서 GitHub 저장소 Import → `.env.example`의 값들을 Environment Variables에 입력
6. GitHub 저장소 Settings → Secrets에 `CRON_SECRET`, `SITE_URL` 추가(푸시 알림 매시간 실행)

## 데이터
- 출처: 올리브영 온라인몰 랭킹(스킨케어·클렌징·선케어·맨즈) 및 상품정보 고시, 2026-11-17 조회
- 갱신: 수집 결과(`scripts/raw_min.json`) → `python3 scripts/build_products.py scripts/raw_min.json`
- 기획세트 중 고시정보에 전성분이 없는 29개 제품은 분석할 수 없어 제외
