// 꿀조합: "같이 쓰면 더 좋은" 성분 궁합. 피부과학회·임상 연구로 확인된 조합만 규칙으로 둠.
// 유튜브·후기의 인기 조합은 협찬 여부를 가릴 수 없어 근거로 쓰지 않음.
import type { IngGroup } from "@/data/ingredients";
import { products, type Category, type Product } from "./model";

export type Source = { title: string; url: string };
export type Pair = { partner: Product; title: string; why: string; source: Source };

type Rule = {
  id: string;
  title: string;
  why: string;
  source: Source;
  when: (p: Product) => boolean;
  partnerCats: Category[];
  partner: (x: Product) => boolean;
};

const early = (p: Product, gs: IngGroup[], pos = 15) => p.hits.some((h) => gs.includes(h.group) && h.pos < pos);
const exfoliantOrRetinoid = (p: Product) => p.activeStrong.some((x) => x === "aha" || x === "bha" || x === "retinoid");
const BARRIER: IngGroup[] = ["ceramide", "panthenol", "cica", "niacinamide", "squalane"];

const AAD_MOIST: Source = { title: "AAD, 여드름이 있어도 보습제가 필요한 이유", url: "https://www.aad.org/public/diseases/acne/skin-care/moisturizer" };
const JDD_CERAMIDE: Source = { title: "J Drugs Dermatol 2023, 여드름 치료 중 세라마이드 보습 루틴 연구", url: "https://pubmed.ncbi.nlm.nih.gov/37276158/" };
const JDD_RETINOID: Source = { title: "J Drugs Dermatol 2012, 트레티노인+세라마이드 보습제 반면 비교 연구", url: "https://jddonline.com/articles/dermatology/S1545961612P1104X" };
const USP_NIA: Source = { title: "U.S. Pharmacist, 나이아신아마이드와 레티놀 병용", url: "https://uspharmacist.com/article/exploring-combination-niacinamide-and-retinol-for-bolstering-dermatologic-health" };
const AAD_SUN: Source = { title: "AAD, Sunscreen FAQs", url: "https://www.aad.org/media/stats-sunscreen" };
const AAD_WASH: Source = { title: "AAD, Face washing 101", url: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101" };
const MNT_HUMECT: Source = { title: "Medical News Today, 피부과 전문의 Berson 인터뷰(세라마이드+보습 성분)", url: "https://www.medicalnewstoday.com/articles/215755.php" };
const AAD_ACNE: Source = { title: "AAD, 여드름 진단과 치료(자외선 차단 안내)", url: "https://www.aad.org/public/diseases/acne/derm-treat/treat" };

const RULES: Rule[] = [
  {
    id: "active-barrier",
    title: "각질·트러블 성분 + 장벽 보습",
    why: "살리실산·레티노이드 같은 성분은 피부를 건조하게 할 수 있어요. 세라마이드·판테놀 같은 장벽 보습제를 매일 같이 쓰면 자극을 덜 느끼고 꾸준히 쓰기 쉬워요.",
    source: JDD_CERAMIDE,
    when: (p) => exfoliantOrRetinoid(p) || (p.category === "cleanser" && early(p, ["bha"], 15)),
    partnerCats: ["moisturizer", "allinone"],
    partner: (x) => early(x, BARRIER, 12) && x.activeStrong.length === 0 && x.irritation <= 1,
  },
  {
    id: "retinoid-niacinamide",
    title: "레티노이드 + 나이아신아마이드",
    why: "나이아신아마이드는 레티노이드를 쓸 때 생기는 건조함·자극을 줄이는 데 도움이 될 수 있어서 함께 많이 쓰여요. 나이아신아마이드를 먼저, 레티노이드는 저녁에 발라요.",
    source: USP_NIA,
    when: (p) => p.activeStrong.includes("retinoid"),
    partnerCats: ["serum", "moisturizer", "toner"],
    partner: (x) => early(x, ["niacinamide"], 10) && x.activeStrong.length === 0,
  },
  {
    id: "retinoid-ceramide",
    title: "레티노이드 + 세라마이드 보습제",
    why: "레티노이드에 세라마이드가 든 보습제를 더한 쪽이 자극을 더 적게 느꼈다는 반면 비교 연구가 있어요.",
    source: JDD_RETINOID,
    when: (p) => p.activeStrong.includes("retinoid"),
    partnerCats: ["moisturizer"],
    partner: (x) => early(x, ["ceramide"], 15) && x.activeStrong.length === 0,
  },
  {
    id: "active-sun",
    title: "각질·트러블 성분 + 선크림",
    why: "각질 케어·레티노이드 성분을 쓰면 피부가 햇빛에 예민해질 수 있어요. 다음 날 아침 SPF 30 이상 선크림을 꼭 같이 쓰세요.",
    source: AAD_ACNE,
    when: (p) => exfoliantOrRetinoid(p) || p.activeStrong.includes("vitc"),
    partnerCats: ["sun"],
    partner: (x) => x.irritation <= 1,
  },
  {
    id: "trouble-light-moist",
    title: "트러블 케어 + 가벼운 보습제",
    why: "여드름이 있어도 보습제는 필요해요. 기름지지 않은 가벼운 보습제를 고르면 트러블 걱정을 덜 수 있어요.",
    source: AAD_MOIST,
    when: (p) => p.concerns[0] === "trouble" || (p.concerns.includes("trouble") && p.category !== "moisturizer" && p.category !== "allinone"),
    partnerCats: ["moisturizer", "allinone"],
    partner: (x) => x.texture === "light" && x.fragranceFree && x.activeStrong.length === 0,
  },
  {
    id: "humectant-barrier",
    title: "수분 끌어당기기 + 장벽 채우기",
    why: "히알루론산처럼 수분을 끌어당기는 성분과 세라마이드처럼 장벽을 채우는 성분을 함께 쓰면 보습이 오래가요. 보습제에 두 성분을 같이 넣는 경우가 많은 이유예요.",
    source: MNT_HUMECT,
    when: (p) => early(p, ["hyaluronic"], 12) && !early(p, ["ceramide", "occlusive", "butter"], 15) && p.category !== "cleanser" && p.category !== "sun",
    partnerCats: ["moisturizer", "allinone"],
    partner: (x) => early(x, ["ceramide", "squalane"], 15) && x.activeStrong.length === 0,
  },
  {
    id: "barrier-humectant",
    title: "장벽 크림 + 수분 레이어",
    why: "세라마이드 크림 전에 히알루론산 같은 수분 성분을 한 겹 깔아주면 속당김이 덜해요.",
    source: MNT_HUMECT,
    when: (p) => (p.category === "moisturizer" || p.category === "allinone") && early(p, ["ceramide"], 15) && !early(p, ["hyaluronic"], 12),
    partnerCats: ["toner", "serum"],
    partner: (x) => early(x, ["hyaluronic"], 10) && x.activeStrong.length === 0 && x.irritation <= 1,
  },
  {
    id: "wash-moist",
    title: "세안 직후 바로 보습",
    why: "세안 후 물기가 조금 남아 있을 때 보습제를 바르면 수분을 붙잡아 두기 좋아요.",
    source: AAD_MOIST,
    when: (p) => p.category === "cleanser",
    partnerCats: ["moisturizer", "allinone"],
    partner: (x) => x.activeStrong.length === 0 && x.irritation <= 1,
  },
  {
    id: "day-sun",
    title: "아침 마지막 단계는 선크림",
    why: "피부과학회는 날씨와 상관없이 매일 SPF 30 이상, 자외선A·B를 모두 막는 선크림을 권해요. 이 제품 위에 덧바르면 아침 루틴이 끝나요.",
    source: AAD_SUN,
    when: (p) => p.category === "moisturizer" || p.category === "allinone" || p.category === "toner" || p.category === "serum",
    partnerCats: ["sun"],
    partner: (x) => x.irritation <= 1,
  },
  {
    id: "sun-wash",
    title: "선크림 + 저녁 순한 세안",
    why: "하루 동안 바른 선크림과 피지는 저녁 세안으로 씻어내요. 문지르지 않고 손끝으로 씻는 순한 세안제가 좋아요.",
    source: AAD_WASH,
    when: (p) => p.category === "sun",
    partnerCats: ["cleanser"],
    partner: (x) => x.irritation <= 1 && x.activeStrong.length === 0,
  },
];

const priceOf = (p: Product) => p.price; // 정가 기준

/** 짝 후보가 원래 제품과 같은 피부·고민을 겨냥할수록 높은 점수 */
function fitScore(p: Product, x: Product) {
  let s = 0;
  if (x.skin.some((k) => p.skin.includes(k))) s += 2;
  s += x.concerns.filter((c) => p.concerns.includes(c)).length;
  if (p.texture === "light" && x.texture === "light") s += 1;
  if (p.texture === "rich" && x.texture !== "light") s += 1;
  if (x.fragranceFree) s += 1;
  return s;
}

/** 이 제품과 같이 쓰면 좋은 짝 (규칙당 1개, 최대 3개) */
export function pairsFor(p: Product, max = 3): Pair[] {
  const out: Pair[] = [];
  const used = new Set<string>([p.id]);
  for (const r of RULES) {
    if (out.length >= max) break;
    if (!r.when(p)) continue;
    const cand = products
      .filter((x) => !used.has(x.id) && r.partnerCats.includes(x.category) && x.category !== p.category && r.partner(x))
      // 서로 각질·레티노이드가 겹치지 않게
      .filter((x) => !(exfoliantOrRetinoid(p) && exfoliantOrRetinoid(x)))
      .sort((a, b) => fitScore(p, b) - fitScore(p, a) || a.irritation - b.irritation || a.rank - b.rank || priceOf(a) - priceOf(b));
    const partner = cand[0];
    if (!partner) continue;
    used.add(partner.id);
    out.push({ partner, title: r.title, why: r.why, source: r.source });
  }
  return out;
}

export const PAIR_SOURCES = [JDD_CERAMIDE, JDD_RETINOID, USP_NIA, AAD_ACNE, AAD_MOIST, AAD_SUN, AAD_WASH, MNT_HUMECT];
