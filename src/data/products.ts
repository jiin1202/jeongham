// 제품 데이터: 올리브영 온라인몰 랭킹(전체·스킨케어·클렌징·선케어·맨즈에딧)에서 2026-11-17 조회.
// 가격 = 올리브영 표시 정상가(할인 전). 기획 구성(1+1, 리필 등)은 pack에 표기.
// 효능 태그는 제품명·공식 소구 문구 기준이며, 의학적 효능을 보증하지 않음.

export type Category = "cleanser" | "toner" | "serum" | "moisturizer" | "allinone" | "sun";
export type SkinType = "dry" | "oily" | "combo" | "normal";
export type Concern = "trouble" | "pore" | "redness" | "dry" | "tone" | "oil" | "aging";

export interface Product {
  id: string;
  goodsNo: string; // 올리브영 상품번호
  brand: string;
  name: string;
  category: Category;
  price: number; // 정상가(원)
  priceFrom?: boolean; // 옵션별 가격 상이(최저가 기준)
  pack?: string; // 기획 구성
  volume: number; // 1개 기준 용량(ml/g)
  units: number; // 구성 개수(본품 기준)
  volumeEstimated?: boolean;
  skin: SkinType[];
  concerns: Concern[];
  gentle?: boolean; // 저자극·약산성·진정 소구
  active?: boolean; // 각질·피지 케어 성분 소구(BHA, 레티놀 등) – 함께 쓸 때 주의
  texture?: "light" | "rich";
  sun?: "mineral" | "stick" | "serum" | "cream";
  forMen?: boolean;
  claim: string; // 제품 소구 한 줄(제품명 기준)
}

export const RESEARCH_DATE = "2026-11-17";
export const oliveyoungUrl = (goodsNo: string) =>
  `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`;

export const products: Product[] = [
  // ── 클렌저 ─────────────────────────────
  { id: "c1", goodsNo: "A000000187479", brand: "비플레인", name: "녹두 약산성 클렌징폼", category: "cleanser", price: 21900, pack: "160ml+40ml", volume: 160, units: 1, skin: ["oily", "combo", "normal"], concerns: ["pore"], gentle: true, claim: "약산성, 모공 노폐물 세정" },
  { id: "c2", goodsNo: "A000000186409", brand: "블랑네이처", name: "아크네 클렌징 폼", category: "cleanser", price: 23800, priceFrom: true, volume: 150, units: 1, volumeEstimated: true, skin: ["oily", "combo"], concerns: ["trouble"], claim: "트러블 피부용 세안" },
  { id: "c3", goodsNo: "A000000232913", brand: "이니스프리", name: "화산송이 바하 모공 클렌징폼", category: "cleanser", price: 15000, priceFrom: true, pack: "130g 더블", volume: 130, units: 1, skin: ["oily", "combo"], concerns: ["pore", "oil"], active: true, claim: "BHA 함유, 모공·피지 세정" },
  { id: "c4", goodsNo: "A000000232067", brand: "셀라딕스", name: "트러블 클리어 약산성 131 젤클렌저", category: "cleanser", price: 19600, volume: 200, units: 1, skin: ["oily", "combo", "normal"], concerns: ["trouble"], gentle: true, claim: "약산성 젤, 트러블 케어" },
  { id: "c5", goodsNo: "A000000148023", brand: "닥터지", name: "약산성 클렌징 젤 폼", category: "cleanser", price: 25000, pack: "200ml+100ml", volume: 200, units: 1, skin: ["dry", "combo", "normal", "oily"], concerns: ["redness"], gentle: true, claim: "저자극 약산성 젤 폼" },
  { id: "c6", goodsNo: "A000000145580", brand: "라곰", name: "셀럽 젤 투 워터 클렌저", category: "cleanser", price: 16000, priceFrom: true, volume: 170, units: 1, skin: ["dry", "normal"], concerns: ["dry", "redness"], gentle: true, claim: "수분·민감 피부 아침 세안" },
  { id: "c7", goodsNo: "A000000189875", brand: "토리든", name: "다이브인 저분자 히알루론산 클렌징폼", category: "cleanser", price: 26000, priceFrom: true, pack: "150ml 1+1", volume: 150, units: 2, skin: ["dry", "normal", "combo"], concerns: ["dry"], gentle: true, claim: "세안 후 당김 완화, 수분" },
  { id: "c8", goodsNo: "A000000152767", brand: "에스트라", name: "테라크네365 클리어 딥 클렌징 폼", category: "cleanser", price: 23000, volume: 200, units: 1, skin: ["oily", "combo"], concerns: ["trouble", "oil"], claim: "트러블·피지 딥 클렌징" },

  // ── 토너 ───────────────────────────────
  { id: "t1", goodsNo: "A000000258293", brand: "토리든", name: "다이브인 저분자 히알루론산 토너", category: "toner", price: 21000, pack: "300ml+100ml", volume: 300, units: 1, skin: ["dry", "normal", "combo", "oily"], concerns: ["dry"], gentle: true, texture: "light", claim: "가벼운 수분 토너" },
  { id: "t2", goodsNo: "A000000248498", brand: "아누아", name: "어성초 77 수분 진정 토너", category: "toner", price: 49000, priceFrom: true, pack: "350ml+350ml 리필", volume: 350, units: 2, skin: ["oily", "combo", "normal"], concerns: ["redness", "trouble"], gentle: true, texture: "light", claim: "어성초 진정 토너" },
  { id: "t3", goodsNo: "A000001002234", brand: "바이오더마", name: "하이드라비오 토너", category: "toner", price: 40000, pack: "500ml+250ml", volume: 500, units: 1, skin: ["dry", "normal"], concerns: ["dry"], gentle: true, texture: "light", claim: "건조 피부 수분 토너" },
  { id: "t4", goodsNo: "A000000260338", brand: "페이보릿", name: "매일 크림 토너", category: "toner", price: 35000, volume: 160, units: 1, skin: ["dry", "normal"], concerns: ["dry"], texture: "rich", claim: "보습감 있는 크림 토너" },

  // ── 세럼 ───────────────────────────────
  { id: "s1", goodsNo: "A000000258291", brand: "토리든", name: "다이브인 저분자 히알루론산 세럼", category: "serum", price: 36000, pack: "50ml+리필 50ml", volume: 50, units: 2, skin: ["dry", "normal", "combo", "oily"], concerns: ["dry"], gentle: true, texture: "light", claim: "속건조 수분 세럼" },
  { id: "s2", goodsNo: "A000000219609", brand: "파티온", name: "노스카나인 트러블 세럼", category: "serum", price: 54000, pack: "50ml+리필 40ml", volume: 50, units: 1, skin: ["oily", "combo", "normal"], concerns: ["trouble"], texture: "light", claim: "트러블 케어 세럼" },
  { id: "s3", goodsNo: "A000001001887", brand: "넘버즈인", name: "3번 보들보들 모공결 세럼", category: "serum", price: 42000, pack: "30ml 더블", volume: 30, units: 2, skin: ["oily", "combo", "normal"], concerns: ["pore"], texture: "light", claim: "모공·피부결 세럼" },
  { id: "s4", goodsNo: "A000001002058", brand: "셀라딕스", name: "트러블 세범 밸런싱 131 앰플", category: "serum", price: 28900, volume: 30, units: 1, volumeEstimated: true, skin: ["oily", "combo"], concerns: ["oil", "trouble"], texture: "light", claim: "피지 밸런스 앰플" },
  { id: "s5", goodsNo: "A000000226201", brand: "아누아", name: "TXA 나이아신 흔적 세럼", category: "serum", price: 64000, pack: "30ml 2입", volume: 30, units: 2, skin: ["dry", "oily", "combo", "normal"], concerns: ["tone"], texture: "light", claim: "트러블 흔적·톤 케어" },
  { id: "s6", goodsNo: "A000000261742", brand: "메디힐", name: "마데카소사이드 더마 세럼", category: "serum", price: 43000, pack: "50ml 1+1", volume: 50, units: 2, skin: ["dry", "oily", "combo", "normal"], concerns: ["redness", "tone"], gentle: true, texture: "light", claim: "진정·흔적 케어 세럼" },
  { id: "s7", goodsNo: "A000000269535", brand: "이니스프리", name: "레티놀 시카 모공 흔적 앰플", category: "serum", price: 48000, pack: "30ml 더블", volume: 30, units: 2, skin: ["oily", "combo", "normal"], concerns: ["pore", "tone", "aging"], active: true, texture: "light", claim: "저자극 레티놀, 모공·흔적" },

  // ── 보습(크림·로션) ────────────────────
  { id: "m1", goodsNo: "A000001002386", brand: "에스트라", name: "아토베리어365 크림", category: "moisturizer", price: 59400, pack: "80ml 더블", volume: 80, units: 2, skin: ["dry", "normal"], concerns: ["dry", "redness"], gentle: true, texture: "rich", claim: "장벽 보습 크림" },
  { id: "m2", goodsNo: "A000001005238", brand: "일리윤", name: "멀티베리어 페이셜 수딩 크림", category: "moisturizer", price: 20000, volume: 80, units: 1, skin: ["dry", "normal", "combo"], concerns: ["redness", "dry"], gentle: true, texture: "rich", claim: "진정 보습 크림" },
  { id: "m3", goodsNo: "A000000255752", brand: "닥터지", name: "레드블레미쉬 클리어 수딩크림 EX", category: "moisturizer", price: 38000, pack: "70ml+30ml", volume: 70, units: 1, skin: ["oily", "combo", "normal"], concerns: ["trouble", "redness"], gentle: true, texture: "light", claim: "가벼운 진정 수분 크림" },
  { id: "m4", goodsNo: "A000000231589", brand: "제로이드", name: "수딩 크림", category: "moisturizer", price: 38000, pack: "80ml+50ml", volume: 80, units: 1, skin: ["dry", "normal"], concerns: ["redness", "dry"], gentle: true, texture: "rich", claim: "민감·건조 진정 크림" },
  { id: "m5", goodsNo: "A000000258834", brand: "에스트라", name: "아토베리어365 하이드로 수딩크림", category: "moisturizer", price: 33000, volume: 80, units: 1, skin: ["oily", "combo", "normal"], concerns: ["redness", "dry"], gentle: true, texture: "light", claim: "수분 젤 진정 크림" },
  { id: "m6", goodsNo: "A000000163494", brand: "라운드랩", name: "포 맨 자작나무 수분 로션", category: "moisturizer", price: 24000, volume: 200, units: 1, skin: ["combo", "normal", "oily", "dry"], concerns: ["dry"], gentle: true, texture: "light", forMen: true, claim: "남성용 산뜻한 수분 로션" },
  { id: "m7", goodsNo: "A000000239660", brand: "피지오겔", name: "DMT 페이셜 크림", category: "moisturizer", price: 47500, pack: "150ml+토너 50ml", volume: 150, units: 1, skin: ["dry"], concerns: ["dry"], gentle: true, texture: "rich", claim: "건성 고보습 크림" },
  { id: "m8", goodsNo: "A000000192782", brand: "에스네이처", name: "아쿠아 스쿠알란 수분크림", category: "moisturizer", price: 43000, pack: "60ml 더블", volume: 60, units: 2, skin: ["dry", "combo", "normal"], concerns: ["dry", "pore"], texture: "light", claim: "수분 크림, 모공 소구" },
  { id: "m9", goodsNo: "A000000263009", brand: "라로슈포제", name: "시카플라스트 밤 B5+", category: "moisturizer", price: 41000, pack: "100ml 기획", volume: 100, units: 1, skin: ["dry", "normal"], concerns: ["redness", "dry"], gentle: true, texture: "rich", claim: "자극 받은 피부 진정 밤" },

  // ── 올인원 ─────────────────────────────
  { id: "a1", goodsNo: "A000000228228", brand: "아이디얼포맨", name: "퍼펙트 올인원", category: "allinone", price: 28000, priceFrom: true, volume: 150, units: 1, skin: ["normal", "combo", "oily"], concerns: [], forMen: true, texture: "light", claim: "맨즈 올인원 판매 1위 소구" },
  { id: "a2", goodsNo: "A000000210719", brand: "아이디얼포맨", name: "퍼펙트 보습 올인원", category: "allinone", price: 28000, priceFrom: true, volume: 150, units: 1, volumeEstimated: true, skin: ["dry", "normal"], concerns: ["dry"], forMen: true, texture: "rich", claim: "보습 강화 올인원" },
  { id: "a3", goodsNo: "A000000230522", brand: "토리든", name: "다이브인 포맨 저분자 히알루론산 올인원", category: "allinone", price: 38000, pack: "200g 더블", volume: 200, units: 2, skin: ["dry", "normal", "combo"], concerns: ["dry"], gentle: true, forMen: true, texture: "light", claim: "수분 충전 올인원" },
  { id: "a4", goodsNo: "A000000223781", brand: "닥터지", name: "레드 블레미쉬 포 맨 진정 올인원", category: "allinone", price: 32000, priceFrom: true, volume: 150, units: 1, skin: ["oily", "combo", "normal"], concerns: ["trouble", "redness"], gentle: true, forMen: true, texture: "light", claim: "트러블·면도 후 진정" },
  { id: "a5", goodsNo: "A000000117541", brand: "우르오스", name: "올인원", category: "allinone", price: 29700, priceFrom: true, volume: 200, units: 1, skin: ["normal", "combo", "oily"], concerns: [], forMen: true, texture: "light", claim: "스킨·로션 한 번에" },
  { id: "a6", goodsNo: "A000000230537", brand: "오브제", name: "포어 제로 프레쉬 올인원", category: "allinone", price: 28000, priceFrom: true, volume: 150, units: 1, skin: ["oily", "combo"], concerns: ["pore", "oil"], forMen: true, texture: "light", claim: "모공 쿨링 올인원" },
  { id: "a7", goodsNo: "A000000149211", brand: "AHC", name: "온리포맨 올인원 에센스", category: "allinone", price: 38000, pack: "120ml 더블", volume: 120, units: 2, skin: ["dry", "normal", "combo"], concerns: ["dry", "aging"], forMen: true, texture: "light", claim: "수분·탄력 올인원" },
  { id: "a8", goodsNo: "A000001004124", brand: "아이오페", name: "포맨 퍼펙트솔루션 올인원", category: "allinone", price: 38000, pack: "120g+30g", volume: 120, units: 1, skin: ["dry", "normal", "combo"], concerns: ["aging"], forMen: true, texture: "rich", claim: "안티에이징 올인원" },
  { id: "a9", goodsNo: "A000000137488", brand: "비오템옴므", name: "아쿠아파워 올인원", category: "allinone", price: 30000, priceFrom: true, volume: 200, units: 1, skin: ["normal", "combo", "oily"], concerns: ["dry"], forMen: true, texture: "light", claim: "가벼운 수분 올인원" },
  { id: "a10", goodsNo: "A000000179227", brand: "피지오겔", name: "DMT 포맨", category: "allinone", price: 65000, priceFrom: true, pack: "기획세트", volume: 100, units: 1, volumeEstimated: true, skin: ["dry"], concerns: ["dry", "redness"], gentle: true, forMen: true, texture: "rich", claim: "건성·민감 남성 보습" },

  // ── 선크림 ─────────────────────────────
  { id: "u1", goodsNo: "A000000149135", brand: "라운드랩", name: "자작나무 수분 선크림", category: "sun", price: 25000, pack: "50ml+크림 20ml", volume: 50, units: 1, skin: ["dry", "normal", "combo"], concerns: ["dry"], sun: "cream", claim: "수분 선크림" },
  { id: "u2", goodsNo: "A000000169499", brand: "스킨1004", name: "센텔라 히알루-시카 워터핏 선세럼", category: "sun", price: 20000, volume: 50, units: 1, skin: ["oily", "combo", "normal", "dry"], concerns: ["redness"], sun: "serum", claim: "가벼운 선세럼" },
  { id: "u3", goodsNo: "A000000224657", brand: "조선미녀", name: "맑은쌀 선크림", category: "sun", price: 20000, pack: "50ml+20ml", volume: 50, units: 1, skin: ["dry", "normal", "combo"], concerns: [], sun: "cream", claim: "촉촉한 데일리 선크림" },
  { id: "u4", goodsNo: "A000000180162", brand: "닥터지", name: "그린 마일드 업 선 플러스", category: "sun", price: 29000, pack: "50ml+20ml", volume: 50, units: 1, skin: ["dry", "normal", "combo", "oily"], concerns: ["redness"], gentle: true, sun: "mineral", claim: "무기자차 저자극" },
  { id: "u5", goodsNo: "A000000219554", brand: "구달", name: "맑은 어성초 진정 무기자차 선크림", category: "sun", price: 22000, pack: "50ml 1+1", volume: 50, units: 2, skin: ["oily", "combo", "normal"], concerns: ["redness"], gentle: true, sun: "mineral", claim: "뽀송한 무기자차" },
  { id: "u6", goodsNo: "A000000238816", brand: "오브제", name: "포어 제로 오일 컨트롤 선스틱", category: "sun", price: 25000, priceFrom: true, volume: 18, units: 1, skin: ["oily", "combo"], concerns: ["oil", "pore"], sun: "stick", forMen: true, claim: "피지 컨트롤 선스틱" },
  { id: "u7", goodsNo: "A000000264982", brand: "히이즈", name: "프로텍트 올인원 프로", category: "sun", price: 32300, volume: 120, units: 1, skin: ["normal", "combo", "oily"], concerns: [], sun: "cream", forMen: true, claim: "남성 전용 선크림 겸 올인원" },
  { id: "u8", goodsNo: "A000000206826", brand: "에스트라", name: "더마UV365 장벽수분 무기자차 선크림", category: "sun", price: 31000, priceFrom: true, pack: "40ml+20ml", volume: 40, units: 1, skin: ["dry", "normal"], concerns: ["dry", "redness"], gentle: true, sun: "mineral", claim: "건조·민감 무기자차" },
  { id: "u9", goodsNo: "A000000219383", brand: "토리든", name: "다이브인 모이스처 선크림", category: "sun", price: 25000, priceFrom: true, pack: "60ml 1+1", volume: 60, units: 2, skin: ["dry", "normal", "combo"], concerns: ["dry"], sun: "cream", claim: "수분막 선크림" },
];

export const categoryLabel: Record<Category, string> = {
  cleanser: "세안",
  toner: "토너",
  serum: "세럼",
  moisturizer: "보습",
  allinone: "올인원",
  sun: "선크림",
};

// 1일 사용량 추정(ml 또는 g) – 재구매 시점 계산용
export const dailyUse: Record<Category, number> = {
  cleanser: 2,
  toner: 3,
  serum: 0.6,
  moisturizer: 1,
  allinone: 2,
  sun: 1,
};
