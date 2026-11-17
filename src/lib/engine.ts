import { GROUPS, type IngGroup } from "@/data/ingredients";
import { products, byId, categoryLabel, concernLabel, dailyUse, type Category, type Product, type SkinType } from "./model";
import { type Answers, skinTypeOf, skinTypeLabel } from "./quiz";

export type Pick = { product: Product; score: number; reasons: string[]; warnings: string[] };
export type Routine = {
  skin: SkinType;
  sensitive: boolean;
  steps: Category[];
  picks: Pick[];
  total: number;
  overBudget: boolean;
  candidates: number;
  excluded: number;
  notes: string[];
  plan: NonNullable<Answers["steps"]>;
};

// 다른 사용자 평가(서버 연결 시 주입). productId → { avg, n }
export type Ratings = Record<string, { avg: number; n: number }>;
let RATINGS: Ratings = {};
export const setRatings = (r: Ratings) => (RATINGS = r);

const STEP_PLAN: Record<NonNullable<Answers["steps"]>, Category[]> = {
  min: ["cleanser", "allinone", "sun"],
  basic: ["cleanser", "toner", "moisturizer", "sun"],
  full: ["cleanser", "toner", "serum", "moisturizer", "sun"],
};

export function isSensitive(a: Answers) {
  return a.sensitive === "often" || a.concerns.includes("redness");
}

const g = (x: IngGroup) => GROUPS[x].label;

export function scoreProduct(p: Product, a: Answers): { score: number; reasons: string[]; warnings: string[] } | null {
  const skin = skinTypeOf(a);
  const sensitive = isSensitive(a);
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // 1) 피부 타입: 제조사 표기 + 제형
  if (!p.skin.includes(skin)) score -= 25;
  else score += p.allSkin ? 12 : 22;
  if (!p.allSkin && p.skin.includes(skin)) reasons.push(`제조사 표기 ${skinTypeLabel[skin]} 피부용`);
  if ((skin === "oily" || skin === "combo") && p.texture === "rich") {
    score -= 16;
    warnings.push("제형이 무거운 편이라 번들거릴 수 있어요");
  }
  if ((skin === "oily" || skin === "combo") && p.texture === "light") score += 8;
  if (skin === "dry" && p.texture === "rich") score += 10;
  if (skin === "dry" && p.groups.has("clay")) score -= 10;

  // 2) 고민: 성분 근거 우선, 제품명 소구는 보조
  const byGroup = new Map<string, string[]>();
  for (const c of a.concerns) {
    if (p.concerns.includes(c)) {
      score += 24;
      const hit = p.hits.find((h) => GROUPS[h.group].kind === "benefit" && conGroups[c].includes(h.group));
      const k = hit ? g(hit.group) : "";
      byGroup.set(k, [...(byGroup.get(k) ?? []), concernLabel[c]]);
    } else if (p.claimConcerns.includes(c)) {
      score += 8;
    }
  }
  byGroup.forEach((cs, k) => reasons.push(k ? `${k} 함유, ${cs.join("·")} 케어` : `${cs.join("·")} 케어 성분`));

  // 각질 케어 성분이 앞쪽에 있는 바르는 제품: 입문자는 감점, 사용법 안내
  const leaveOnExf = p.category !== "cleanser" && p.activeStrong.some((x) => x === "aha" || x === "bha");
  if (leaveOnExf) {
    warnings.push("각질 케어 성분이 앞쪽에 있어요. 처음엔 이틀에 한 번, 저녁에만 써 보세요");
    if (a.current === "none" || a.current === "aio") score -= 12;
  }

  // 3) 예민도
  if (sensitive) {
    if (p.activeStrong.length) return null;
    score -= p.irritation * 5;
    if (p.forSensitive) {
      score += 10;
      reasons.push("제조사 표기 민감 피부용");
    }
    if (p.fragranceFree) {
      score += 8;
      reasons.push("향료·정유 없음");
    }
    if (["cica", "panthenol", "allantoin", "betaglucan", "ceramide"].some((x) => p.groups.has(x as IngGroup))) score += 6;
  } else {
    score -= p.irritation * (a.sensitive === "sometimes" ? 3 : 1);
  }
  if (p.irritation >= 4) warnings.push("향·자극 가능 성분이 여럿 들어 있어요");

  // 4) 면도
  if (a.shave === "daily" && p.category !== "sun" && p.category !== "cleanser") {
    const soothe = (["panthenol", "cica", "allantoin"] as IngGroup[]).find((x) => p.groups.has(x));
    if (soothe) {
      score += 8;
      reasons.push(`${g(soothe)}로 면도 후 진정`);
    }
    if (p.groups.has("menthol") || p.hits.some((h) => h.group === "alcohol" && h.pos < 6)) score -= 6;
  }

  // 5) 선크림 사용감
  if (p.category === "sun") {
    if (a.sunPain === "sticky") {
      if (p.sunForm === "stick" || p.sunForm === "serum" || p.sunForm === "gel") {
        score += 14;
        reasons.push(p.sunForm === "stick" ? "손에 안 묻는 스틱형" : "가벼운 제형");
      }
      if (p.texture === "rich") score -= 8;
    }
    if (a.sunPain === "white") {
      if (p.sunFilter === "chemical") {
        score += 12;
        reasons.push("유기자차라 백탁이 적은 편");
      }
      if (p.sunFilter === "mineral") score -= 14;
    }
    if (a.sunPain === "eyes") {
      if (p.sunFilter === "mineral") {
        score += 14;
        reasons.push("무기자차라 눈 시림이 덜한 편");
      }
      if (p.sunFilter === "chemical") score -= 8;
    }
  }

  // 6) 다른 사용자 평가
  const rt = RATINGS[p.id];
  if (rt && rt.n >= 3) {
    score += (rt.avg - 3) * 6;
    if (rt.avg >= 4) reasons.push(`정함 사용자 만족도 ${rt.avg.toFixed(1)}점`);
  }

  if (p.forMen && (a.current === "none" || a.current === "aio")) score += 2;

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 3), warnings };
}

const conGroups: Record<string, IngGroup[]> = {
  trouble: ["bha", "teatree", "houttuynia", "zinc"],
  pore: ["bha", "clay", "niacinamide", "zinc", "retinoid"],
  oil: ["zinc", "clay", "bha", "niacinamide"],
  dry: ["hyaluronic", "ceramide", "squalane", "butter", "occlusive"],
  redness: ["cica", "panthenol", "allantoin", "betaglucan"],
  tone: ["vitc", "niacinamide", "tranexamic", "arbutin", "glutathione"],
  aging: ["retinoid", "adenosine", "peptide", "pdrn"],
};

function routineConflicts(list: Product[]) {
  const notes: string[] = [];
  const has = (x: IngGroup) => list.filter((p) => p.activeStrong.includes(x));
  const ret = has("retinoid");
  const exf = [...has("bha"), ...has("aha")];
  if (ret.length && exf.length) notes.push("레티노이드와 각질 케어(AHA·BHA) 제품이 함께 있어요. 같은 날 겹치지 말고 번갈아 쓰세요.");
  if (ret.length) notes.push(`${ret.map((p) => p.name).join(", ")}은(는) 저녁에만 쓰세요.`);
  if (exf.length && !list.some((p) => p.category === "sun")) notes.push("각질 케어 성분은 햇빛에 예민해질 수 있어 선크림이 꼭 필요해요.");
  return notes;
}

export function buildRoutine(a: Answers): Routine {
  const plan = a.steps ?? "basic";
  const r = buildFor(a, plan);
  if (r.overBudget && plan !== "min") {
    const m = buildFor(a, "min");
    if (!m.overBudget) {
      m.notes.unshift("원하는 단계로는 예산을 넘어서, 예산에 맞게 세안·올인원·선크림 3단계로 줄였어요.");
      return m;
    }
  }
  return r;
}

function buildFor(a: Answers, plan: NonNullable<Answers["steps"]>): Routine {
  const skin = skinTypeOf(a);
  const sensitive = isSensitive(a);
  const steps = STEP_PLAN[plan];
  const budget = a.budget ?? 999999;

  let excluded = 0;
  const perStep: Pick[][] = steps.map((cat) => {
    const list: Pick[] = [];
    for (const p of products.filter((x) => x.category === cat)) {
      const r = scoreProduct(p, a);
      if (!r) {
        excluded++;
        continue;
      }
      list.push({ product: p, ...r });
    }
    return list.sort((x, y) => y.score - x.score).slice(0, 6);
  });
  const candidates = products.filter((p) => steps.includes(p.category)).length;

  let best: Pick[] | null = null;
  let bestScore = -Infinity;
  let soft: Pick[] | null = null;
  let softScore = -Infinity;
  const walk = (i: number, acc: Pick[], total: number, score: number, actives: number) => {
    if (i === perStep.length) {
      if (total <= budget && score > bestScore) {
        bestScore = score;
        best = [...acc];
      }
      const s2 = score - (Math.max(0, total - budget) / 1000) * 2;
      if (s2 > softScore) {
        softScore = s2;
        soft = [...acc];
      }
      return;
    }
    for (const pick of perStep[i]) {
      const act = pick.product.activeStrong.length > 0 && pick.product.category !== "cleanser" ? 1 : 0;
      if (actives + act > 1) continue; // 남기는 단계의 강한 활성 성분은 1개까지
      acc.push(pick);
      walk(i + 1, acc, total + pick.product.price, score + pick.score, actives + act);
      acc.pop();
    }
  };
  walk(0, [], 0, 0, 0);

  const picks: Pick[] = (best ?? soft ?? []) as Pick[];
  const total = picks.reduce((s, p) => s + p.product.price, 0);
  const notes: string[] = [];
  if (!best) notes.push("예산 안에 들어오는 조합이 없어요. 예산을 조금 넘더라도 피부에 맞는 쪽을 우선했어요. 올리브영 할인가는 정상가보다 낮은 경우가 많아요.");
  if (sensitive) notes.push("예민한 편이라 각질 케어·레티노이드 성분이 앞쪽에 있는 제품은 뺐어요. 새 제품은 턱선에 먼저 2~3일 테스트해 보세요.");
  notes.push(...routineConflicts(picks.map((p) => p.product)));
  if (a.concerns.includes("trouble") && a.sensitive === "often") notes.push("트러블이 계속되거나 심해지면 화장품보다 피부과 진료가 먼저예요.");

  return { skin, sensitive, steps, picks, total, overBudget: !best, candidates, excluded, notes, plan };
}

export function pickFor(id: string, a: Answers): Pick | null {
  const p = byId.get(id);
  if (!p) return null;
  const r = scoreProduct(p, a);
  return { product: p, score: r?.score ?? 0, reasons: r?.reasons ?? [], warnings: r?.warnings ?? [] };
}

export function daysToEmpty(p: Product) {
  return Math.max(7, Math.round((p.volume * p.units) / dailyUse[p.category]));
}

// ── 지금 쓰는 제품 검사 ────────────────────────
export type CheckResult = { level: "good" | "caution" | "bad"; title: string; detail: string[] };

export function checkProducts(list: Product[], a: Answers | null): CheckResult[] {
  const actives = (x: IngGroup) => list.filter((p) => p.activeStrong.includes(x) && p.category !== "cleanser");
  return list.map((p) => {
    const detail: string[] = [];
    let level: CheckResult["level"] = "good";
    const bump = (l: CheckResult["level"]) => {
      if (l === "bad" || (l === "caution" && level === "good")) level = l;
    };
    if (a) {
      const skin = skinTypeOf(a);
      if (!p.skin.includes(skin)) {
        bump("caution");
        detail.push(`제조사가 표기한 대상 피부(${p.spec})가 ${skinTypeLabel[skin]} 피부와 달라요.`);
      }
      if ((skin === "oily" || skin === "combo") && p.texture === "rich") {
        bump("caution");
        detail.push("버터·밀폐 보습 성분이 앞쪽에 있어 번들거림이 늘 수 있어요.");
      }
      if (isSensitive(a)) {
        if (p.activeStrong.length) {
          bump("bad");
          detail.push(`${p.activeStrong.map(g).join(", ")} 성분이 들어 있어요. 예민하면 매일 쓰기보다 주 2~3회로 줄여 보세요.`);
        }
        if (p.irritation >= 3) {
          bump("caution");
          detail.push("향료·알레르기 유발 향 성분·에탄올 등 자극 가능 성분이 있어요.");
        }
      }
      const hit = a.concerns.filter((c) => p.concerns.includes(c));
      if (hit.length) detail.push(`${hit.map((c) => concernLabel[c]).join(", ")} 고민에 맞는 성분이 있어요.`);
    }
    const ret = actives("retinoid");
    const exf = [...actives("bha"), ...actives("aha")];
    if (p.activeStrong.includes("retinoid") && exf.length) {
      bump("bad");
      detail.push(`레티노이드와 각질 케어 제품(${exf.map((x) => x.name).join(", ")})을 함께 쓰고 있어요. 같은 날 겹치지 말고 번갈아 쓰세요.`);
    }
    if ((p.activeStrong.includes("bha") || p.activeStrong.includes("aha")) && ret.length && !p.activeStrong.includes("retinoid")) {
      bump("bad");
      detail.push("레티노이드 제품과 같은 날 쓰면 자극이 겹칠 수 있어요.");
    }
    if (exf.length > 1 && exf.includes(p)) {
      bump("caution");
      detail.push(`각질 케어 성분 제품이 ${exf.length}개예요. 하나로 줄여도 충분해요.`);
    }
    if (p.activeStrong.includes("vitc") && exf.length && !exf.includes(p)) {
      bump("caution");
      detail.push("순수 비타민C는 AHA·BHA와 같은 시간대에 쓰면 따가울 수 있어요. 아침·저녁으로 나눠 쓰세요.");
    }
    const same = list.filter((x) => x.category === p.category);
    if (same.length > 1 && p.category !== "serum") {
      bump("caution");
      detail.push(`${categoryLabel[p.category]} 제품이 ${same.length}개예요. 하나만 써도 충분해요.`);
    }
    if (!detail.length) detail.push("특별히 걸리는 점은 없어요.");
    const title = level === "good" ? "잘 맞아요" : level === "caution" ? "확인 필요" : "주의";
    return { level, title, detail };
  });
}

// ── 공유 링크 ────────────────────────────────
export function encodeAnswers(a: Answers) {
  const s = JSON.stringify(a);
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeAnswers(code: string): Answers | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const s = decodeURIComponent(escape(atob(b64)));
    const a = JSON.parse(s);
    if (!Array.isArray(a.concerns)) return null;
    return a as Answers;
  } catch {
    return null;
  }
}
