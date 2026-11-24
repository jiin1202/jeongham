// PX(군마트)에서 판매가 보도·후기로 확인된 브랜드.
// PX는 공식 판매 목록·가격이 공개되어 있지 않아 제품 단위가 아닌 '브랜드 단위'로만 표시한다.
// 같은 브랜드라도 모든 제품이 PX에 있는 건 아니며, 지점·시기마다 다르다.
// 조사일: 2026-11-24
export const PX_SOURCES = [
  { title: "일간스포츠, 'K군마트 수준… CJ올리브영 뺨칩니다' (2025.09)", url: "https://isplus.com/article/view/isp202509140110" },
  { title: "'피부도 지켜야지 말입니다'… PX 화장품, 남성 뷰티시장 주도 (다음 뉴스)", url: "https://v.daum.net/v/9hLv9FQ0ja" },
  { title: "얼루어 코리아, 젠지 남성까지 사로잡은 뷰티의 매력은? (2024.11)", url: "https://www.allurekorea.com/2024/11/12/%EC%A0%A0%EC%A7%80-%EB%82%A8%EC%84%B1%EA%B9%8C%EC%A7%80-%EC%82%AC%EB%A1%9C%EC%9E%A1%EC%9D%80-%EB%B7%B0%ED%8B%B0%EC%9D%98-%EB%A7%A4%EB%A0%A5%EC%9D%80/" },
  { title: "언니의파우치, 2026 PX 신상품 리스트 총정리", url: "https://unpa.me/community/beautytip/132192207" },
  { title: "언니의파우치, PX 세럼 추천 TOP5 (2026)", url: "https://unpa.me/community/essence/126474291" },
  { title: "언니의파우치, PX 마스크팩 2026 추천템", url: "https://unpa.me/community/beautytip/126918824" },
];

// 브랜드명은 제품 DB의 brand 값과 정확히 같아야 한다
export const PX_BRANDS = new Set([
  "이니스프리", "닥터지", "아누아", "조선미녀", "토니모리", "셀퓨전씨", "비알티씨", "아이소이", "라운드랩", "다슈",
  "아비브", "파티온", "정샘물", "비플레인", "VT", "메디힐", "피지오겔", "성분에디터", "니베아",
]);

export const pxNote = "이 브랜드 제품 일부는 PX(군마트)에서도 팔아요. 보통 시중 정가보다 저렴하지만, 제품·가격은 지점과 시기마다 달라요.";
