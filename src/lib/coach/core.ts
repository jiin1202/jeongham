// 정함 코치 에이전트 — 관찰(Snapshot) → 신호(Signals) → 판단(LLM 또는 규칙) → 행동(Actions)
// 이 파일은 브라우저·서버 양쪽에서 쓰는 순수 함수만 둔다.
import { byId, categoryLabel, products, type Product, type Category } from "../model";
import { checkProducts, daysToEmpty, scoreProduct } from "../engine";
import type { Answers } from "../quiz";

/** 에이전트가 관찰하는 사용자 상태(개인 식별 정보 없음) */
export type Snapshot = {
  today: string;
  answers: Answers;
  routine: { id: string; start: string }[];
  /** 최근 14일 체크: 날짜 → 아침/저녁 */
  checks: Record<string, { am?: boolean; pm?: boolean }>;
  /** 최근 피부 기록 5개(사진 제외) */
  logs: { day: string; overall: number; trouble: number; oil: number; dry: number; irritation?: number }[];
  reviews: Record<string, { rating: number; change?: string; again?: boolean }>;
  goal?: { date: string; label: string };
  /** 사용자가 이미 거절한 제안(같은 제안을 반복하지 않기 위함) */
  declined: string[];
};

export type Signals = {
  day: number;
  week: number;
  missedDays: number;
  streak: number;
  checkRate7: number;
  irritation: { level: number; day: string } | null;
  troubleTrend: "better" | "same" | "worse" | "unknown";
  runningOut: { id: string; daysLeft: number }[];
  goalDaysLeft: number | null;
  needsReview: string[];
  conflicts: string[];
  activeIds: string[];
};

export type Action =
  | { type: "message"; text: string }
  | { type: "pause_product"; productId: string; days: number; reason: string }
  | { type: "swap_product"; removeId: string; addId: string; reason: string }
  | { type: "reorder"; productId: string; reason: string }
  | { type: "reminder"; when: "tonight" | "tomorrow_am"; text: string }
  | { type: "ask_review"; productId: string }
  | { type: "freeze_new"; reason: string }
  | { type: "see_doctor"; reason: string };

export type Step = { kind: "observe" | "think" | "tool" | "act"; title: string; detail?: string };
export type CoachResult = { mode: "llm" | "rules"; model?: string; signals: Signals; steps: Step[]; actions: Action[] };

const DAY = 86400000;
const t0 = (s: string) => new Date(s + "T00:00:00").getTime();
const shift = (s: string, d: number) => {
  const x = new Date(t0(s) + d * DAY);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export function computeSignals(s: Snapshot): Signals {
  const start = s.routine.map((r) => r.start).sort()[0] ?? s.today;
  const day = Math.max(0, Math.round((t0(s.today) - t0(start)) / DAY));
  const did = (d: string) => !!(s.checks[d]?.am || s.checks[d]?.pm);

  // 오늘은 아직 끝나지 않았으니 어제부터 연속으로 빠진 날을 센다
  let missedDays = 0;
  for (let i = 1; i <= Math.min(day, 14); i++) {
    if (did(shift(s.today, -i))) break;
    missedDays++;
  }
  let streak = 0;
  for (let i = did(s.today) ? 0 : 1; i <= 60; i++) {
    if (!did(shift(s.today, -i))) break;
    streak++;
  }
  const last7 = Array.from({ length: 7 }, (_, i) => shift(s.today, -i)).filter((d) => d >= start);
  const checkRate7 = last7.length ? last7.filter(did).length / last7.length : 0;

  const logs = [...s.logs].sort((a, b) => a.day.localeCompare(b.day));
  const recent = logs.filter((l) => l.day >= shift(s.today, -3));
  const irr = recent.reduce<{ level: number; day: string } | null>((m, l) => ((l.irritation ?? 0) >= 2 && (!m || (l.irritation ?? 0) > m.level) ? { level: l.irritation!, day: l.day } : m), null);
  let troubleTrend: Signals["troubleTrend"] = "unknown";
  if (logs.length >= 2) {
    const d = logs[logs.length - 1].trouble - logs[0].trouble;
    troubleTrend = d < 0 ? "better" : d > 0 ? "worse" : "same";
  }

  const items = s.routine.map((r) => byId.get(r.id)).filter(Boolean) as Product[];
  const runningOut = s.routine
    .map((r) => {
      const p = byId.get(r.id);
      if (!p) return null;
      const used = Math.round((t0(s.today) - t0(r.start)) / DAY);
      return { id: r.id, daysLeft: daysToEmpty(p) - used };
    })
    .filter((x): x is { id: string; daysLeft: number } => !!x && x.daysLeft <= 10);

  const goalDaysLeft = s.goal?.date ? Math.round((t0(s.goal.date) - t0(s.today)) / DAY) : null;
  const needsReview = day >= 21 ? items.filter((p) => !s.reviews[p.id]?.change).map((p) => p.id) : [];
  const conflicts = checkProducts(items, s.answers)
    .flatMap((c, i) => (c.level !== "good" ? c.detail.map((d) => `${items[i].name}: ${d}`) : []))
    .slice(0, 4);
  const activeIds = items.filter((p) => p.activeStrong.length > 0 && p.category !== "cleanser").map((p) => p.id);

  return { day, week: Math.min(4, Math.floor(day / 7) + 1), missedDays, streak, checkRate7, irritation: irr, troubleTrend, runningOut, goalDaysLeft, needsReview, conflicts, activeIds };
}

// ───────────── 도구(Tools): LLM과 규칙 플래너가 같이 쓴다 ─────────────

export function toolGetProduct(id: string) {
  const p = byId.get(id);
  if (!p) return { error: "없는 제품" };
  return {
    id: p.id, brand: p.brand, name: p.name, category: categoryLabel[p.category], price: p.price,
    concerns: p.concerns, activeStrong: p.activeStrong, irritation: p.irritation, fragranceFree: p.fragranceFree,
    daysToEmpty: daysToEmpty(p),
  };
}

/** 같은 종류에서 더 순한 대체품(자극 신호가 있을 때) 또는 같은 고민을 다루는 대체품 */
export function toolFindAlternative(s: Snapshot, id: string, reason: "irritation" | "no_effect" | "price") {
  const cur = byId.get(id);
  if (!cur) return [];
  const inRoutine = new Set(s.routine.map((r) => r.id));
  const out = products
    .filter((p) => p.category === cur.category && !inRoutine.has(p.id) && !s.declined.includes(`swap:${id}:${p.id}`))
    .map((p) => ({ p, r: scoreProduct(p, s.answers) }))
    .filter((x) => x.r)
    .filter(({ p }) => (reason === "irritation" ? p.activeStrong.length === 0 && p.irritation < Math.max(1, cur.irritation) : true))
    .filter(({ p }) => (reason === "price" ? p.price < cur.price : true))
    .sort((a, b) => b.r!.score - a.r!.score || a.p.price - b.p.price)
    .slice(0, 3);
  return out.map(({ p, r }) => ({ id: p.id, brand: p.brand, name: p.name, price: p.price, why: r!.reasons.slice(0, 2) }));
}

export function toolSearch(s: Snapshot, q: { category?: Category; concern?: string; gentle?: boolean; maxPrice?: number }) {
  return products
    .filter((p) => (!q.category || p.category === q.category) && (!q.concern || p.concerns.includes(q.concern as never)) && (!q.gentle || p.irritation === 0) && (!q.maxPrice || p.price <= q.maxPrice))
    .map((p) => ({ p, r: scoreProduct(p, s.answers) }))
    .filter((x) => x.r)
    .sort((a, b) => b.r!.score - a.r!.score)
    .slice(0, 5)
    .map(({ p }) => ({ id: p.id, brand: p.brand, name: p.name, category: categoryLabel[p.category], price: p.price }));
}

// ───────────── 규칙 플래너: API 키가 없거나 LLM이 실패할 때 ─────────────

export function planByRules(s: Snapshot, sig: Signals): CoachResult {
  const steps: Step[] = [
    { kind: "observe", title: `${sig.day + 1}일째, ${sig.week}주차`, detail: `최근 7일 체크율 ${Math.round(sig.checkRate7 * 100)}%, 연속 ${sig.streak}일, 빠진 날 ${sig.missedDays}일` },
  ];
  const actions: Action[] = [];
  const name = (id: string) => byId.get(id)?.name ?? id;

  if (sig.irritation && sig.irritation.level >= 3) {
    steps.push({ kind: "think", title: "따가움이 심하게 기록됐어요", detail: "센 성분을 멈춰도 계속되면 전문의 상담이 먼저예요." });
    actions.push({ type: "see_doctor", reason: "따가움·붉어짐이 '심함'으로 기록됐어요. 바르던 걸 멈춰도 이틀 넘게 계속되면 피부과에서 확인받는 게 안전해요." });
  }
  if (sig.irritation && sig.activeIds.length) {
    const id = sig.activeIds[0];
    steps.push({ kind: "think", title: "자극 신호와 센 성분이 겹쳐요", detail: `${name(id)}에 각질·레티노이드 계열 성분이 있어요.` });
    const alt = toolFindAlternative(s, id, "irritation");
    steps.push({ kind: "tool", title: "find_alternative", detail: alt.length ? alt.map((a) => `${a.brand} ${a.name}`).join(", ") : "조건에 맞는 대체품 없음" });
    actions.push({ type: "pause_product", productId: id, days: 3, reason: "따가움이 기록돼서 사흘만 쉬고, 괜찮아지면 이틀에 한 번 저녁부터 다시 써요." });
    if (alt[0]) actions.push({ type: "swap_product", removeId: id, addId: alt[0].id, reason: "그래도 따가우면 센 성분이 없는 이 제품으로 바꿔요." });
  }
  if (sig.goalDaysLeft !== null && sig.goalDaysLeft >= 0 && sig.goalDaysLeft <= 7) {
    steps.push({ kind: "think", title: `${s.goal?.label} D-${sig.goalDaysLeft}`, detail: "이 시기에 새 제품을 시작하면 반응을 되돌릴 시간이 없어요." });
    actions.push({ type: "freeze_new", reason: `${s.goal?.label}까지 ${sig.goalDaysLeft}일. 지금부터는 새 제품 없이 쓰던 그대로 가요.` });
    actions.forEach((a, i) => { if (a.type === "swap_product") actions.splice(i, 1); });
  }
  if (sig.missedDays >= 2) {
    steps.push({ kind: "think", title: `${sig.missedDays}일째 체크가 없어요`, detail: "설문에서 그만둔 이유 1위가 '귀찮아서'(32%)였어요. 단계를 줄여 부담을 낮춰요." });
    actions.push({ type: "reminder", when: "tonight", text: "오늘 밤은 세안하고 보습제 하나만 발라도 돼요." });
  }
  for (const r of sig.runningOut) {
    steps.push({ kind: "tool", title: "get_product", detail: `${name(r.id)}: 약 ${Math.max(0, r.daysLeft)}일 남음` });
    actions.push({ type: "reorder", productId: r.id, reason: r.daysLeft <= 0 ? "다 썼을 때가 됐어요. 같은 걸로 살지 정해요." : `${r.daysLeft}일쯤 남았어요. 배송 기간을 생각하면 지금 주문할 때예요.` });
  }
  if (sig.needsReview.length) {
    steps.push({ kind: "think", title: "3주가 지났어요", detail: "4주 후기가 쌓여야 같은 피부 타입 남자들의 결과를 보여줄 수 있어요." });
    sig.needsReview.slice(0, 2).forEach((id) => actions.push({ type: "ask_review", productId: id }));
  }
  if (sig.troubleTrend === "worse" && sig.day >= 28 && !sig.irritation) {
    steps.push({ kind: "think", title: "4주가 지났는데 트러블이 늘었어요", detail: "효과가 없는 제품부터 바꿔볼 때예요." });
    const target = s.routine.map((r) => byId.get(r.id)).find((p) => p && p.concerns.includes("trouble" as never));
    if (target) {
      const alt = toolFindAlternative(s, target.id, "no_effect");
      steps.push({ kind: "tool", title: "find_alternative", detail: alt.map((a) => `${a.brand} ${a.name}`).join(", ") || "없음" });
      if (alt[0]) actions.push({ type: "swap_product", removeId: target.id, addId: alt[0].id, reason: "4주 써도 트러블이 늘었으면 다른 성분 조합으로 바꿔 볼 때예요." });
    }
  }
  const msg =
    sig.irritation ? "따가운 날은 쉬는 게 먼저예요. 아래 제안부터 확인해 주세요."
    : sig.missedDays >= 2 ? `${sig.missedDays}일 쉬었네요. 오늘 저녁 하나만 해도 다시 이어져요.`
    : sig.streak >= 5 ? `${sig.streak}일 연속이에요. 이대로 ${sig.week}주차 마무리해요.`
    : sig.day < 7 ? "첫 주는 습관 만들기만 하면 돼요. 아침·저녁 체크부터요."
    : `${sig.week}주차예요. 오늘도 체크 하나만 남겨요.`;
  actions.unshift({ type: "message", text: msg });
  steps.push({ kind: "act", title: `행동 ${actions.length}개 결정` });
  return { mode: "rules", signals: sig, steps, actions };
}
