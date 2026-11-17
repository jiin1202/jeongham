import raw from "@/data/products.json";
import { GROUPS, analyze, splitIngredients, type Hit, type IngGroup } from "@/data/ingredients";

export type Category = "cleanser" | "toner" | "serum" | "moisturizer" | "allinone" | "sun";
export type SkinType = "dry" | "oily" | "combo" | "normal";
export type Concern = "trouble" | "pore" | "redness" | "dry" | "tone" | "oil" | "aging";

export interface RawProduct {
  id: string;
  goodsNo: string;
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
  if (/젤|워터|플루이드|에센스|토너|세럼|앰플|가벼운|산뜻|아쿠아/.test(n)) texture = "light";
  if (/밤|리치|인텐시브|버터|고보습/.test(n) || ["butter", "occlusive"].some((g) => hits.some((h) => h.group === g && h.pos < 8))) texture = "rich";
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
};

export const dailyUse: Record<Category, number> = { cleanser: 2, toner: 3, serum: 0.6, moisturizer: 1, allinone: 2, sun: 1 };

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
