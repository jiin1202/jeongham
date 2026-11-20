import raw from "@/data/products.json";
import { GROUPS, analyze, splitIngredients, type Hit, type IngGroup } from "@/data/ingredients";

export type Category = "cleanser" | "toner" | "serum" | "moisturizer" | "allinone" | "sun" | "pad" | "sheet" | "pack" | "patch";
/** 매일 루틴이 아니라 주 1~3회 더하는 스페셜 케어 */
export const SPECIAL: Category[] = ["pad", "sheet", "pack", "patch"];
export type SkinType = "dry" | "oily" | "combo" | "normal";
export type Concern = "trouble" | "pore" | "redness" | "dry" | "tone" | "oil" | "aging";

export interface RawProduct {
  id: string;
  goodsNo: string;
  image: string;
  brand: string;
  name: string;
  fullName: string;
  category: Category;
  price: number;
  salePrice: number | null;
  priceFrom: boolean;
  units: number;
  volume: number;
  volumeText: string;
  volumeEstimated: boolean;
  spec: string;
  functional: string;
  maker: string;
  ingredients: string;
  forMen: boolean;
  rank: number;
  rankSource: string;
  /** 스페셜 케어: 제조사 사용방법(요약) */
  usage?: string;
  /** 시트·패드·패치처럼 장·개 단위로 세는 제품 */
  countUnit?: "장" | "개";
}

export interface Product extends RawProduct {
  ings: string[];
  hits: Hit[];
  groups: Set<IngGroup>;
  strong: Set<IngGroup>; // 전성분 앞 10번째 안
  skin: SkinType[];
  allSkin: boolean;
  forSensitive: boolean;
  concerns: Concern[]; // 성분 근거
  claimConcerns: Concern[]; // 제품명 소구
  irritation: number; // 자극 가능 지수
  fragranceFree: boolean;
  activeStrong: IngGroup[]; // 각질·레티노이드·순수 비타민C
  texture: "light" | "rich" | "mid";
  sunFilter?: "mineral" | "chemical" | "hybrid";
  sunForm?: "stick" | "serum" | "cream" | "gel" | "milk";
}

const CONCERN_GROUPS: Record<Concern, IngGroup[]> = {
  trouble: ["bha", "teatree", "houttuynia", "zinc"],
  pore: ["bha", "clay", "niacinamide", "zinc", "retinoid"],
  oil: ["zinc", "clay", "bha", "niacinamide"],
  dry: ["hyaluronic", "ceramide", "squalane", "butter", "occlusive"],
  redness: ["cica", "panthenol", "allantoin", "betaglucan"],
  tone: ["vitc", "niacinamide", "tranexamic", "arbutin", "glutathione"],
  aging: ["retinoid", "adenosine", "peptide", "pdrn"],
};

const CLAIMS: [Concern, RegExp][] = [
  ["trouble", /트러블|아크네|여드름|블레미쉬|노스카/],
  ["pore", /모공|블랙헤드|피지/],
  ["oil", /피지|세범|오일 ?컨트롤|노세범|산뜻|보송|뽀송/],
  ["dry", /수분|보습|속건조|히알루|세라|장벽/],
  ["redness", /진정|시카|수딩|민감|저자극|어성초|센텔라|판테놀|마데카/],
  ["tone", /미백|흔적|잡티|톤|비타|글루타치온|브라이트닝/],
  ["aging", /탄력|주름|레티|안티에이징|펩타이드|피디알엔|PDRN|리프팅/],
];

function build(r: RawProduct): Product {
  const ings = splitIngredients(r.ingredients || "");
  const hits = analyze(ings);
  const groups = new Set(hits.map((h) => h.group));
  const strong = new Set(hits.filter((h) => h.pos < 10).map((h) => h.group));
  const spec = r.spec || "";
  const allSkin = /모든|전 ?피부|모든 피부/.test(spec) || spec.trim() === "";
  const skin: SkinType[] = [];
  if (allSkin) skin.push("dry", "oily", "combo", "normal");
  else {
    if (/건성/.test(spec)) skin.push("dry");
    if (/지성/.test(spec)) skin.push("oily");
    if (/복합/.test(spec)) skin.push("combo");
    if (/중성|정상/.test(spec)) skin.push("normal");
    if (skin.length === 0) skin.push("dry", "oily", "combo", "normal");
  }
  const forSensitive = /민감/.test(spec);

  // BHA·AHA는 국내 일반 화장품에서 보존제 등 소량으로도 쓰여 앞쪽(15번째 안)에 있을 때만 효능 근거로 봄
  // 끝부분(25번째 이후) 미량 성분은 고민 케어 근거로 보지 않음
  const meaningful = new Set(hits.filter((h) => (["bha", "aha"].includes(h.group) ? h.pos < 15 : h.pos < 25)).map((h) => h.group));
  const concerns = (Object.keys(CONCERN_GROUPS) as Concern[]).filter((c) => {
    const gs = CONCERN_GROUPS[c];
    if (c === "dry") return gs.some((g) => strong.has(g)) || (groups.has("hyaluronic") && groups.has("ceramide"));
    return gs.some((g) => meaningful.has(g));
  });
  const claimConcerns = CLAIMS.filter(([, re]) => re.test(r.fullName)).map(([c]) => c);

  let irritation = 0;
  if (groups.has("fragrance")) irritation += 2;
  irritation += Math.min(3, hits.filter((h) => h.group === "allergen").length);
  if (hits.some((h) => h.group === "alcohol" && h.pos < 6)) irritation += 3;
  if (groups.has("essentialoil")) irritation += 2;
  if (groups.has("menthol")) irritation += 1;

  const activeStrong: IngGroup[] = [];
  if (groups.has("bha") && hits.some((h) => h.group === "bha" && h.pos < 15)) activeStrong.push("bha");
  if (groups.has("aha") && hits.some((h) => h.group === "aha" && h.pos < 15)) activeStrong.push("aha");
  if (groups.has("retinoid")) activeStrong.push("retinoid");
  if (ings.some((i) => /^아스코빅애씨드$/.test(i.replace(/\s/g, "")))) activeStrong.push("vitc");

  const n = r.fullName;
  let texture: Product["texture"] = "mid";
  if (/젤|워터|플루이드|에센스|토너|세럼|앰플|가벼운|산뜻|아쿠아|에멀전|로션|선세럼|보송|뽀송|피지/.test(n)) texture = "light";
  if (/밤|리치|인텐시브|버터|고보습|장벽|진정크림|리페어 크림/.test(n) || ["butter", "occlusive"].some((g) => hits.some((h) => h.group === g && h.pos < 8))) texture = "rich";
  else if (/크림/.test(n) && texture === "mid" && hits.some((h) => (h.group === "ceramide" || h.group === "squalane") && h.pos < 12)) texture = "rich";
  if (r.category === "cleanser" || r.category === "toner") texture = texture === "rich" ? "mid" : "light";

  let sunFilter: Product["sunFilter"];
  let sunForm: Product["sunForm"];
  if (r.category === "sun") {
    const m = groups.has("uv_mineral");
    const c = groups.has("uv_chemical");
    sunFilter = m && c ? "hybrid" : m ? "mineral" : c ? "chemical" : undefined;
    sunForm = /스틱/.test(n) ? "stick" : /세럼|앰플|에센스|플루이드/.test(n) ? "serum" : /젤/.test(n) ? "gel" : /밀크/.test(n) ? "milk" : "cream";
  }

  return {
    ...r,
    ings,
    hits,
    groups,
    strong,
    skin,
    allSkin,
    forSensitive,
    concerns,
    claimConcerns,
    irritation,
    fragranceFree: !groups.has("fragrance") && !groups.has("essentialoil"),
    activeStrong,
    texture,
    sunFilter,
    sunForm,
  };
}

export const products: Product[] = (raw as RawProduct[]).map(build);
export const byId = new Map(products.map((p) => [p.id, p]));
export const RESEARCH_DATE = "2026-11-17";

export const categoryLabel: Record<Category, string> = {
  cleanser: "세안",
  toner: "토너",
  serum: "세럼",
  moisturizer: "보습",
  allinone: "올인원",
  sun: "선크림",
  pad: "패드",
  sheet: "시트 마스크",
  pack: "팩",
  patch: "패치·코팩",
};

export const textureLabel: Record<Product["texture"], string> = { light: "가벼운 제형", mid: "보통 제형", rich: "촉촉한 제형" };

// 하루 평균 사용량(ml·g, 스페셜 케어는 장·개 단위 주 사용 횟수 / 7)
export const dailyUse: Record<Category, number> = { cleanser: 2, toner: 3, serum: 0.6, moisturizer: 1, allinone: 2, sun: 1, pad: 3 / 7, sheet: 2 / 7, pack: 1.2, patch: 2 / 7 };

export const oliveyoungUrl = (goodsNo: string) => `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`;
// 제휴 링크 승인 후 NEXT_PUBLIC_AFFILIATE_PREFIX를 설정하면 구매 링크를 감싸서 내보냄(추천 점수와 무관)
const AFF = process.env.NEXT_PUBLIC_AFFILIATE_PREFIX ?? "";
export const buyUrl = (goodsNo: string) => (AFF ? AFF + encodeURIComponent(oliveyoungUrl(goodsNo)) : oliveyoungUrl(goodsNo));

export const concernLabel: Record<Concern, string> = {
  trouble: "트러블",
  pore: "모공",
  oil: "번들거림",
  dry: "건조",
  redness: "예민·붉은기",
  tone: "흔적·톤",
  aging: "탄력",
};

export function keyBenefits(p: Product) {
  const seen = new Set<IngGroup>();
  return p.hits
    .filter((h) => GROUPS[h.group].kind === "benefit")
    .sort((a, b) => a.pos - b.pos)
    .filter((h) => (seen.has(h.group) ? false : (seen.add(h.group), true)));
}
export function cautions(p: Product) {
  const seen = new Set<IngGroup>();
  return p.hits
    .filter((h) => GROUPS[h.group].kind === "caution")
    .filter((h) => h.group !== "alcohol" || h.pos < 6)
    .filter((h) => (seen.has(h.group) ? false : (seen.add(h.group), true)));
}

// ───────────── 한 줄 특성("이런 피부에") · 추천 대상 · 사용법 ─────────────
// 제조사 표기(사용 대상 피부)와 성분 위치로만 판단. 근거 없는 효능 문구는 만들지 않음.

/** 성분표에서 가장 앞쪽에 있는 효능 성분이 겨냥하는 고민 = 이 제품의 대표 고민 */
export function primaryConcern(p: Product): Concern | undefined {
  const order = keyBenefits(p);
  for (const h of order) {
    const c = p.concerns.find((c) => CONCERN_GROUPS[c].includes(h.group) && (c !== "dry" || h.pos < 10));
    if (c) return c;
  }
  return p.concerns[0];
}

const SOOTHE: IngGroup[] = ["cica", "panthenol", "allantoin", "betaglucan", "ceramide"];

/** 피부 상태 형용사: 예민한 / 건조한 / 번들거리는 / "" */
function skinState(p: Product): "예민한" | "건조한" | "번들거리는" | "" {
  const soothingEarly = p.hits.some((h) => SOOTHE.includes(h.group) && h.pos < 10);
  if (p.forSensitive || (soothingEarly && p.irritation === 0 && p.activeStrong.length === 0)) return "예민한";
  if (!p.allSkin) {
    const oilyOnly = p.skin.every((s) => s === "oily" || s === "combo");
    const dryOnly = p.skin.every((s) => s === "dry" || s === "normal");
    if (oilyOnly) return "번들거리는";
    if (dryOnly) return "건조한";
  }
  if (p.texture === "rich") return "건조한";
  if (p.texture === "light" && (p.concerns.includes("oil") || p.concerns.includes("pore"))) return "번들거리는";
  return "";
}

const CONNECT: Record<string, string> = { 예민한: "예민하고", 건조한: "건조하고", 번들거리는: "번들거리고" };
const PHRASE: Record<Concern, string> = {
  trouble: "여드름성",
  pore: "모공 넓은",
  oil: "피지 많은",
  dry: "속당김 있는",
  redness: "붉은기 있는",
  tone: "톤이 칙칙한",
  aging: "탄력이 떨어진",
};

/** 예: "건조한 여드름성 피부", "번들거리고 모공 넓은 피부", "예민한 피부" */
export function fitLine(p: Product): string {
  const s = skinState(p);
  const c = primaryConcern(p);
  if (p.category === "sun") {
    const pref = p.sunFilter === "mineral" ? "눈가 시림이 싫은" : p.sunFilter === "chemical" ? "백탁이 싫은" : p.sunForm === "stick" ? "손에 묻히기 싫은" : "";
    const base = s ? `${s} 피부` : "모든 피부";
    return pref ? `${pref} ${base}` : base;
  }
  if (!c) return s ? `${s} 피부` : "모든 피부";
  if (c === "trouble") return `${s ? s + " " : ""}여드름성 피부`;
  if (p.category === "cleanser" && c === "dry") return s === "예민한" ? "세안 후 당기는 예민한 피부" : "세안 후 당기는 피부";
  if (!s) return `${PHRASE[c]} 피부`;
  // 같은 뜻 반복 방지
  if (s === "번들거리는" && c === "oil") return "피지 많은 지성 피부";
  if (s === "건조한" && c === "dry") return "건조하고 당기는 피부";
  if (s === "예민한" && c === "redness") return "붉고 예민한 피부";
  return `${CONNECT[s]} ${PHRASE[c]} 피부`;
}

export type Advice = { good: string[]; careful: string[]; howto: string[] };

/** 상세 페이지 '이런 분께 추천 / 이런 분은 주의 / 사용법' */
export function advice(p: Product): Advice {
  const good: string[] = [];
  const careful: string[] = [];
  const howto: string[] = [];
  const skinNames: Record<SkinType, string> = { dry: "건성", oily: "지성", combo: "복합성", normal: "중성" };

  good.push(p.allSkin ? "제조사 표기: 모든 피부 타입" : `제조사 표기: ${p.skin.map((s) => skinNames[s]).join("·")} 피부`);
  const cs = [primaryConcern(p), ...p.concerns].filter((x, i, a): x is Concern => !!x && a.indexOf(x) === i).slice(0, 3);
  if (cs.length) good.push(`${cs.map((c) => concernLabel[c]).join(", ")} 고민`);
  if (p.forSensitive) good.push("제조사가 민감 피부용으로 표기");
  else if (p.fragranceFree && p.irritation === 0) good.push("향료·정유가 없어 향에 예민해도 무난");

  if (p.activeStrong.some((x) => x === "aha" || x === "bha") && p.category !== "cleanser") careful.push("각질 케어 성분이 앞쪽에 있어요. 처음 쓰거나 예민하면 이틀에 한 번 저녁부터");
  if (p.activeStrong.includes("retinoid")) careful.push("레티노이드가 있어요. 저녁에만, 각질 케어 제품과 같은 날 겹치지 않게");
  if (p.groups.has("fragrance") || p.groups.has("essentialoil")) careful.push("향료·정유가 있어 향에 예민하면 피하는 게 좋아요");
  if (p.hits.some((h) => h.group === "alcohol" && h.pos < 6)) careful.push("에탄올이 앞쪽에 있어 건조·예민 피부는 따가울 수 있어요");
  if (p.texture === "rich" && p.category !== "cleanser") careful.push("제형이 무거운 편이라 지성은 답답할 수 있어요");
  if (p.groups.has("clay") && p.hits.some((h) => h.group === "clay" && h.pos < 10)) careful.push("클레이가 앞쪽에 있어 건성은 당길 수 있어요");
  if (p.category === "sun" && p.sunFilter === "chemical") careful.push("유기자차라 눈가에 닿으면 시릴 수 있어요");
  if (p.category === "sun" && p.sunFilter === "mineral") careful.push("무기자차라 백탁이 생길 수 있어요");

  const use: Record<Category, string> = {
    cleanser: "아침·저녁 하루 두 번, 미지근한 물로 손끝으로 문질러 씻어요",
    toner: "세안 직후 손바닥에 덜어 두드려 흡수시켜요",
    serum: "토너 다음, 보습제 전에 얇게 펴 발라요",
    moisturizer: "세럼 다음 마지막 단계에, 아침엔 선크림 전에 발라요",
    allinone: "세안 후 이것 하나로 끝. 아침엔 선크림을 위에 덧발라요",
    sun: "아침 스킨케어 마지막에, 얼굴엔 손가락 두 마디 길이만큼 넉넉히. 밖에 오래 있으면 2시간마다 덧발라요",
    pad: "세안 후 토너 대신 결을 따라 가볍게 닦아내요",
    sheet: "세안·토너 후 붙이고, 제품에 적힌 시간이 지나면 떼어 남은 에센스를 두드려 흡수시켜요",
    pack: /슬리핑/.test(p.fullName) ? "저녁 스킨케어 마지막에 얇게 바르고 자요" : "세안 후 얇게 펴 바르고, 제품에 적힌 시간이 지나면 미지근한 물로 씻어내요",
    patch: /코팩|코 팩|블랙헤드/.test(p.fullName) ? "세안 후 코에 물기를 살짝 남기고 붙였다가 마르면 떼요. 자주 쓰면 자극이 될 수 있어요" : "세안 후 물기를 말린 트러블 부위에 붙이고, 짜지 말고 그대로 두세요",
  };
  if (p.usage) howto.push(p.usage);
  else howto.push(use[p.category]);
  if (p.category === "pad" && p.activeStrong.length) howto.push("각질 케어 패드는 매일보다 주 2~3회부터 시작하세요");
  if (p.activeStrong.includes("retinoid")) howto.push("얼굴 전체에 완두콩 한 알 크기면 충분해요");
  if (p.category !== "sun" && !SPECIAL.includes(p.category) && (cs.includes("trouble") || cs.includes("tone"))) howto.push("효과는 최소 4주는 써보고 판단하세요");
  return { good, careful, howto };
}
