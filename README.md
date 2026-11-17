# 정함 – 비교는 끝, 루틴은 정함

2030 남성을 위한 스킨케어 루틴 추천 서비스 (마케팅조사 기말 프로젝트).

## 실행
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # out/ 폴더에 정적 사이트 생성
```

## 구조
- `src/data/products.ts` – 제품 47개 (올리브영 랭킹, 2026-11-17 조회)
- `src/lib/quiz.ts` – 진단 질문 8개
- `src/lib/engine.ts` – 추천 점수·조합 로직, 제품 검사, 소진일 계산
- `src/lib/store.ts` – 브라우저 저장(localStorage)
- `src/app/` – 페이지: `/`, `/check`, `/result`, `/me`, `/mine`, `/standard`

## 배포
Vercel에서 이 저장소를 Import하면 됩니다(Framework: Next.js, 설정 변경 불필요).
