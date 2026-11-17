import { products, type Category, type Product, type SkinType, dailyUse, categoryLabel } from "@/data/products";
import { type Answers, skinTypeOf, concernLabel, skinTypeLabel } from "./quiz";

export type Pick = { product: Product; score: number; reasons: string[] };
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
};

const STEP_PLAN: Record<NonNullable<Answers["steps"]>, Category[]> = {
  min: ["cleanser", "allinone", "sun"],
  basic: ["cleanser", "toner", "moisturizer", "sun"],
  full: ["cleanser", "toner", "serum", "moisturizer", "sun"],
};

function isSensitive(a: Answers) {
  return a.sensitive === "often" || a.concerns.includes("redness");
}

export function scoreProduct(p: Product, a: Answers): { score: number; reasons: string[] } | null {
  const skin = skinTypeOf(a);
  const sensitive = isSensitive(a);
  const reasons: string[] = [];
  let score = 0;

  // 피부 타입 적합성
  if (p.skin.includes(skin)) {
    score += 30;
    reasons.push(`${skinTypeLabel[skin]} 피부에 맞는 제형`);
  } else {
    score -= 25;
  }

  // 고민 매칭
  for (const c of a.concerns) {
    if (p.concerns.includes(c)) {
      score += 22;
      reasons.push(`${concernLabel[c]} 고민 케어`);
    }
  }

  // 민감도
  if (sensitive) {
    if (p.active) return null; // 민감하면 각질·레티놀류 제외
    if (p.gentle) {
      score += 18;
      reasons.push("저자극·진정 소구");
    }
  } else if (a.sensitive === "sometimes" && p.gentle) {
    score += 6;
  }

  // 면도 잦으면 진정
  if (a.shave === "daily" && (p.concerns.includes("redness") || p.gentle) && p.category !== "sun") {
    score += 8;
    reasons.push("면도 후 자극 완화");
  }

  // 제형: 지성은 가벼운 제형, 건성은 리치
  if (p.texture) {
    if ((skin === "oily" || skin === "combo") && p.texture === "rich") score -= 15;
    if (skin === "dry" && p.texture === "rich") score += 8;
    if ((skin === "oily" || skin === "combo") && p.texture === "light") {
      score += 6;
      if (!reasons.some((r) => r.includes("제형"))) reasons.push("가벼운 제형");
    }
  }

  // 선크림 불만
  if (p.category === "sun") {
    if (a.sunPain === "sticky" && (p.sun === "stick" || p.sun === "serum")) {
      score += 16;
      reasons.push(p.sun === "stick" ? "끈적임 없는 스틱형" : "가벼운 세럼 제형");
    }
    if (a.sunPain === "white" && p.sun === "mineral") score -= 12;
    if (a.sunPain === "eyes" && p.sun === "mineral") {
      score += 14;
      reasons.push("무기자차(눈 시림이 덜하다고 알려진 타입)");
    }
    if (a.sunPain === "never" && p.sun !== "stick") score += 4;
  }

  // 입문자는 남성 전용 올인원을 선호하는 경향 반영(약하게)
  if (p.forMen && (a.current === "none" || a.current === "aio")) score += 3;

  return { score, reasons: dedupe(reasons).slice(0, 3) };
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
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
    return list.sort((x, y) => y.score - x.score).slice(0, 5);
  });
  const candidates = perStep.reduce((s, l) => s + l.length, 0);

  // 예산 안에서 점수 합 최대 조합(단계별 상위 5개 완전 탐색)
  let best: Pick[] | null = null;
  let bestScore = -Infinity;
  let soft: Pick[] | null = null;
  let softScore = -Infinity;
  const walk = (i: number, acc: Pick[], total: number, score: number) => {
    if (i === perStep.length) {
      if (total <= budget && score > bestScore) {
        bestScore = score;
        best = [...acc];
      }
      // 예산을 넘는 경우: 초과 1천 원당 2점 감점한 점수로 비교
      const s2 = score - (Math.max(0, total - budget) / 1000) * 2;
      if (s2 > softScore) {
        softScore = s2;
        soft = [...acc];
      }
      return;
    }
    for (const pick of perStep[i]) {
      // 각질·레티놀류는 루틴에 1개까지만
      if (pick.product.active && acc.some((x) => x.product.active)) continue;
      acc.push(pick);
      walk(i + 1, acc, total + pick.product.price, score + pick.score);
      acc.pop();
    }
  };
  walk(0, [], 0, 0);

  const picks: Pick[] = (best ?? soft ?? []) as Pick[];
  const total = picks.reduce((s, p) => s + p.product.price, 0);
  const notes: string[] = [];
  if (!best) notes.push("예산 안에 들어오는 조합이 없어요. 예산을 조금 넘더라도 피부에 맞는 쪽을 우선했어요. 올리브영 세일가는 정상가보다 낮은 경우가 많아요.");
  if (sensitive) notes.push("예민한 편이라 각질 제거·레티놀 소구 제품은 뺐어요. 새 제품은 귀 뒤나 턱선에 먼저 테스트해 보세요.");
  if (a.concerns.includes("trouble") && a.sensitive === "often")
    notes.push("트러블이 계속되거나 심해지면 화장품보다 피부과 상담이 먼저예요.");

  return { skin, sensitive, steps, picks, total, overBudget: !best, candidates, excluded, notes };
}

export function daysToEmpty(p: Product) {
  return Math.max(7, Math.round((p.volume * p.units) / dailyUse[p.category]));
}

// 지금 쓰는 제품 검사
export type CheckResult = { level: "good" | "caution" | "bad"; title: string; detail: string[] };

export function checkProducts(list: Product[], a: Answers | null): CheckResult[] {
  return list.map((p) => {
    const detail: string[] = [];
    let level: CheckResult["level"] = "good";
    if (a) {
      const skin = skinTypeOf(a);
      if (!p.skin.includes(skin)) {
        level = "caution";
        detail.push(`${skinTypeLabel[skin]} 피부와는 잘 맞지 않는 제형으로 분류돼요.`);
      }
      if ((skin === "oily" || skin === "combo") && p.texture === "rich") {
        level = "caution";
        detail.push("리치한 제형이라 번들거림이 늘 수 있어요.");
      }
      if (isSensitive(a) && p.active) {
        level = "bad";
        detail.push("예민한 피부에는 각질·피지 케어 성분 제품을 매일 쓰는 건 주의가 필요해요.");
      }
      const hit = a.concerns.filter((c) => p.concerns.includes(c));
      if (hit.length) detail.push(`${hit.map((c) => concernLabel[c]).join("·")} 고민과 맞아요.`);
    }
    const actives = list.filter((x) => x.active);
    if (p.active && actives.length > 1) {
      level = "bad";
      detail.push(`각질·레티놀 소구 제품을 ${actives.length}개 함께 쓰고 있어요. 자극이 겹칠 수 있으니 번갈아 쓰세요.`);
    }
    const sameCat = list.filter((x) => x.category === p.category);
    if (sameCat.length > 1 && p.category !== "serum") {
      if (level === "good") level = "caution";
      detail.push(`${categoryLabel[p.category]} 제품이 ${sameCat.length}개예요. 하나만 써도 충분해요.`);
    }
    if (!detail.length) detail.push("특별히 걸리는 점은 없어요.");
    const title = level === "good" ? "잘 맞아요" : level === "caution" ? "확인 필요" : "주의";
    return { level, title, detail };
  });
}

// 결과 공유용 인코딩
export function encodeAnswers(a: Answers) {
  const s = JSON.stringify(a);
  return typeof window === "undefined"
    ? Buffer.from(s).toString("base64url")
    : btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
