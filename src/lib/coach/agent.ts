// 정함 코치 에이전트의 판단 엔진(서버 전용)
// 관찰(Snapshot) → 신호 계산 → LLM이 도구를 골라 쓰며 판단 → 정책 계층 검사 → 행동
// API(/api/coach, 사용자가 열 때)와 크론(/api/cron/coach, 매일 자율 실행)이 같이 쓴다.
import { byId } from "@/lib/model";
import {
  computeSignals, planByRules, toolFindAlternative, toolGetProduct, toolSearch,
  type Action, type CoachResult, type Snapshot, type Step,
} from "@/lib/coach/core";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
// 수업에서 받은 키가 별도 중계 서버용이면 그 주소를 넣는다(기본: OpenAI)
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MAX_TURNS = 5;

const SYSTEM = `너는 '정함 코치'라는 스킨케어 습관 코치 에이전트야. 사용자는 20대 남성이고, 정함이 정해준 루틴을 4주 동안 지속해 효과를 보는 게 목표야.
매번 다음 순서로 일해:
1) 주어진 신호(signals)와 상태를 읽고 지금 가장 중요한 문제 1~2개를 고른다.
2) 필요하면 도구(get_product, find_alternative, search_products)로 사실을 확인한다. 제품 정보는 반드시 도구 결과로만 말한다.
3) finish 도구로 행동을 확정한다. 행동은 메시지 1개 + 최대 3개.
우선순위(높은 것부터): ① issues의 severe_irritation ② irritation_with_active ③ goal_soon ④ missed_days ⑤ running_out ⑥ needs_review ⑦ duplicate_category.
제품을 바꾸거나 쉬게 할 때는 반드시 먼저 get_product나 find_alternative로 확인한다. 도구 결과에 없는 제품 ID는 쓰지 않는다.
규칙:
- issues가 none이면 메시지(필요하면 리마인드)만. 제품을 쉬게 하거나 바꾸지 않는다.
- 도구 결과·신호에 없는 사용법(격일, 몇 분 등)을 지어내지 않는다. 메시지에 제품 ID 숫자를 쓰지 않고 제품 이름으로 말한다.
- 제품을 아껴 쓰거나 양을 줄이라고 하지 않는다(특히 선크림은 충분한 양이 중요). 다 써가면 재구매를 권한다.
- 선크림은 아침 단계다. 저녁(tonight) 알림이나 저녁 루틴 안내에 선크림을 넣지 않는다.
- missed_days일 때는 부담을 줄이는 게 목표: 각질·레티노이드 같은 센 성분 말고 세안 + 보습제처럼 가장 쉬운 단계만 권한다.
- 진단·치료 표현 금지. 따가움이 '심함'(3)이면 see_doctor를 포함한다.
- 중요한 날까지 7일 이하이면 새 제품 교체(swap_product)를 하지 말고 freeze_new를 쓴다.
- 루틴 변경(pause_product, swap_product)은 제안일 뿐이고 사용자가 승인한다는 전제로 이유를 한 문장으로 쓴다.
- declined에 있는 제안은 다시 하지 않는다.
- 메시지는 친구처럼 짧고 자연스러운 존댓말(~요). 과장·이모지·느낌표 남발 금지. 80자 이내.`;

const TOOLS = [
  { type: "function", function: { name: "get_product", description: "제품 상세(종류, 가격, 고민, 센 성분, 자극 가능 성분, 다 쓰는 데 걸리는 일수)", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "find_alternative", description: "같은 종류에서 대체품 최대 3개. reason: irritation(더 순한 것), no_effect(같은 고민의 다른 제품), price(더 싼 것)", parameters: { type: "object", properties: { id: { type: "string" }, reason: { type: "string", enum: ["irritation", "no_effect", "price"] } }, required: ["id", "reason"] } } },
  { type: "function", function: { name: "search_products", description: "조건으로 제품 검색(사용자 피부에 맞는 점수순 5개)", parameters: { type: "object", properties: { category: { type: "string", enum: ["cleanser", "toner", "serum", "moisturizer", "allinone", "sun", "pad", "sheet", "pack", "patch"] }, concern: { type: "string", enum: ["trouble", "pore", "oil", "dry", "redness", "tone", "aging"] }, gentle: { type: "boolean" }, maxPrice: { type: "number" } } } } },
  {
    type: "function",
    function: {
      name: "finish",
      description: "판단을 끝내고 사용자에게 보여줄 행동을 확정한다",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["pause_product", "swap_product", "reorder", "reminder", "ask_review", "freeze_new", "see_doctor"] },
                productId: { type: "string" }, removeId: { type: "string" }, addId: { type: "string" },
                days: { type: "number" }, when: { type: "string", enum: ["tonight", "tomorrow_am"] }, text: { type: "string" }, reason: { type: "string" },
              },
              required: ["type"],
            },
          },
        },
        required: ["message", "actions"],
      },
    },
  },
];

type Msg = { role: string; content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[]; tool_call_id?: string };

function sanitize(raw: Record<string, unknown>[], s: Snapshot, sig: ReturnType<typeof computeSignals>, dup: Set<string>): Action[] {
  const inRoutine = new Set(s.routine.map((r) => r.id));
  const out: Action[] = [];
  // 행동 허용 규칙(정책 계층): LLM이 고른 행동이라도 근거 신호가 없으면 버린다
  const canPause = (id: string) =>
    dup.has(id) || (!!sig.irritation && (sig.activeIds.includes(id) || (byId.get(id)?.irritation ?? 0) >= 2));
  const canSwap = (id: string) =>
    dup.has(id) || (!!sig.irritation && sig.activeIds.includes(id)) || (sig.troubleTrend === "worse" && sig.day >= 28);
  for (const a of raw.slice(0, 4)) {
    const reason = String(a.reason ?? "").slice(0, 160);
    switch (a.type) {
      case "pause_product":
        if (inRoutine.has(String(a.productId)) && canPause(String(a.productId)) && !out.some((x) => x.type === "pause_product" && x.productId === String(a.productId))) out.push({ type: "pause_product", productId: String(a.productId), days: Math.min(7, Math.max(1, Number(a.days) || 3)), reason });
        break;
      case "swap_product":
        if (inRoutine.has(String(a.removeId)) && canSwap(String(a.removeId)) && !s.declined.includes(`swap:${a.removeId}:${a.addId}`) && !inRoutine.has(String(a.addId)) && byId.get(String(a.addId))?.category === byId.get(String(a.removeId))?.category && !(sig.goalDaysLeft !== null && sig.goalDaysLeft >= 0 && sig.goalDaysLeft <= 7))
          out.push({ type: "swap_product", removeId: String(a.removeId), addId: String(a.addId), reason });
        break;
      case "reorder":
        if (inRoutine.has(String(a.productId))) out.push({ type: "reorder", productId: String(a.productId), reason });
        break;
      case "reminder":
        if (out.some((x) => x.type === "reminder")) break;
        {
          const when = a.when === "tomorrow_am" ? "tomorrow_am" : "tonight";
          let text = String(a.text ?? reason).slice(0, 80);
          // 저녁 알림에 선크림이 들어가면 빼거나 기본 문구로 바꾼다(선크림은 아침 단계)
          if (when === "tonight" && /선크림|자외선/.test(text)) {
            // "세안-토너-보습-선크림"처럼 단계 나열 속에 있을 때만 그 항목을 빼고, 아니면 기본 문구로
            const listed = /[-·,]\s*(선크림|자외선 ?차단제?)/.test(text);
            const cleaned = text.replace(/[-·,]\s*(선크림|자외선 ?차단제?)/g, "").trim();
            text = listed && !/선크림|자외선/.test(cleaned) ? cleaned : "오늘 밤은 세안하고 보습제까지만 발라요.";
          }
          out.push({ type: "reminder", when, text });
        }
        break;
      case "ask_review":
        if (out.filter((x) => x.type === "ask_review").length >= 2) break;
        if (inRoutine.has(String(a.productId)) && sig.needsReview.includes(String(a.productId))) out.push({ type: "ask_review", productId: String(a.productId) });
        break;
      case "freeze_new":
        out.push({ type: "freeze_new", reason });
        break;
      case "see_doctor":
        out.push({ type: "see_doctor", reason });
        break;
    }
  }
  // 필수 행동 보장: 신호가 있는데 LLM이 빠뜨린 안전·핵심 행동은 코드가 채운다
  if (sig.irritation && sig.irritation.level >= 3 && !out.some((a) => a.type === "see_doctor"))
    out.unshift({ type: "see_doctor", reason: "따가움·붉어짐이 심하게 기록됐어요. 멈춰도 계속되면 피부과에서 확인받는 게 안전해요." });
  const soon = sig.goalDaysLeft !== null && sig.goalDaysLeft >= 0 && sig.goalDaysLeft <= 7;
  if (soon && !out.some((a) => a.type === "freeze_new"))
    out.push({ type: "freeze_new", reason: `${s.goal?.label ?? "중요한 날"}까지 ${sig.goalDaysLeft}일. 지금부터는 새 제품 없이 쓰던 그대로 가요.` });
  if (!soon) for (let i = out.length - 1; i >= 0; i--) if (out[i].type === "freeze_new") out.splice(i, 1);
  for (const id of sig.needsReview.slice(0, 2)) if (out.filter((a) => a.type === "ask_review").length < 2 && !out.some((a) => a.type === "ask_review" && a.productId === id)) out.push({ type: "ask_review", productId: id });
  for (const r of sig.runningOut) if (!out.some((a) => a.type === "reorder" && a.productId === r.id)) out.push({ type: "reorder", productId: r.id, reason: `${Math.max(0, r.daysLeft)}일쯤 남았어요.` });
  return out;
}

export async function runLLM(s: Snapshot, key: string): Promise<CoachResult> {
  const sig = computeSignals(s);
  const routine = s.routine.map((r) => ({ id: r.id, start: r.start, ...toolGetProduct(r.id) }));
  // 신호를 사람이 읽는 '문제 목록'으로 정리해 LLM이 놓치지 않게 한다(판단과 행동 선택은 LLM이 한다)
  const issues: string[] = [];
  if (sig.irritation && sig.irritation.level >= 3) issues.push(`severe_irritation: ${sig.irritation.day} 따가움 심함`);
  if (sig.irritation && sig.activeIds.length) issues.push(`irritation_with_active: 따가움 ${sig.irritation.level}/3, 센 성분 제품 ${sig.activeIds.join(",")}`);
  if (sig.goalDaysLeft !== null && sig.goalDaysLeft >= 0 && sig.goalDaysLeft <= 7) issues.push(`goal_soon: ${s.goal?.label} D-${sig.goalDaysLeft}`);
  if (sig.missedDays >= 2) issues.push(`missed_days: ${sig.missedDays}일 연속 체크 없음`);
  sig.runningOut.forEach((r) => issues.push(`running_out: ${r.id} 약 ${Math.max(0, r.daysLeft)}일 남음`));
  if (sig.needsReview.length) issues.push(`needs_review: ${sig.needsReview.join(",")}`);
  const cats = new Map<string, string[]>();
  routine.forEach((r) => { const c = String((r as { category?: string }).category ?? ""); cats.set(c, [...(cats.get(c) ?? []), r.id]); });
  const dup = new Set<string>();
  cats.forEach((v, c) => { if (v.length > 1 && c) { issues.push(`duplicate_category: ${c} ${v.join(",")}`); v.forEach((x) => dup.add(x)); } });
  const steps: Step[] = [{ kind: "observe", title: `${sig.day + 1}일째, ${sig.week}주차`, detail: `최근 7일 체크율 ${Math.round(sig.checkRate7 * 100)}%, 연속 ${sig.streak}일, 빠진 날 ${sig.missedDays}일` }];
  const messages: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify({ today: s.today, issues: issues.length ? issues : ["none: 특별한 문제 없음, 짧게 독려"], answers: s.answers, signals: sig, routine, recentLogs: s.logs, goal: s.goal ?? null, declined: s.declined }) },
  ];

  let usedTool = false;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key.trim()}` },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: turn === MAX_TURNS - 1 ? { type: "function", function: { name: "finish" } } : "auto" }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const why = res.status === 401 ? "키가 거절됨" : res.status === 404 ? "모델 이름 또는 주소 확인" : res.status === 429 ? "한도 초과" : "";
      throw new Error(`openai ${res.status} ${why}`.trim());
    }
    const data = await res.json();
    const m: Msg = data.choices?.[0]?.message;
    if (!m) throw new Error("empty");
    messages.push(m);
    if (m.content && !m.tool_calls?.length) steps.push({ kind: "think", title: m.content.slice(0, 120) });
    if (!m.tool_calls?.length) {
      messages.push({ role: "user", content: "finish 도구로 행동을 확정해 줘." });
      continue;
    }
    for (const call of m.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* 빈 인자로 처리 */ }
      if (call.function.name === "finish" && !usedTool && issues.some((i) => /irritation|running_out|duplicate/.test(i))) {
        usedTool = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "제품을 다루는 문제가 있어요. 먼저 get_product 또는 find_alternative로 확인한 뒤 finish 하세요." }) });
        continue;
      }
      if (call.function.name === "finish") {
        const actions = sanitize((args.actions as Record<string, unknown>[]) ?? [], s, sig, dup);
        const dropped = ((args.actions as unknown[]) ?? []).length - actions.length;
        if (dropped !== 0) steps.push({ kind: "think", title: dropped > 0 ? `정책 검사: 근거 없는 행동 ${dropped}개 제외` : `정책 검사: 빠진 필수 행동 ${-dropped}개 보완` });
        const text = (String(args.message ?? "").replace(/\b\d{8}\b/g, (m) => byId.get(m)?.name ?? "그 제품").slice(0, 120)) || "오늘도 체크 하나만 남겨요.";
        steps.push({ kind: "act", title: `행동 ${actions.length + 1}개 결정` });
        return { mode: "llm", model: MODEL, signals: sig, steps, actions: [{ type: "message", text }, ...actions] };
      }
      usedTool = true;
      let result: unknown;
      if (call.function.name === "get_product") result = toolGetProduct(String(args.id));
      else if (call.function.name === "find_alternative") result = toolFindAlternative(s, String(args.id), (args.reason as "irritation") ?? "irritation");
      else if (call.function.name === "search_products") result = toolSearch(s, args as never);
      else result = { error: "알 수 없는 도구" };
      const brief = Array.isArray(result) ? result.map((r: { brand?: string; name?: string }) => `${r.brand ?? ""} ${r.name ?? ""}`.trim()).join(", ") || "결과 없음" : (result as { name?: string }).name ?? JSON.stringify(result).slice(0, 80);
      steps.push({ kind: "tool", title: `${call.function.name}(${Object.values(args).join(", ")})`, detail: brief });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error("no finish");
}

export function valid(s: unknown): s is Snapshot {
  const x = s as Snapshot;
  return !!x && typeof x.today === "string" && Array.isArray(x.routine) && x.routine.length > 0 && x.routine.length <= 12 && !!x.answers && typeof x.checks === "object";
}


/** 키가 있으면 LLM으로, 없거나 실패하면 규칙 플래너로 판단한다 */
export async function decide(s: Snapshot): Promise<CoachResult> {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      return await runLLM(s, key);
    } catch (e) {
      const r = planByRules(s, computeSignals(s));
      r.steps.unshift({ kind: "think", title: "AI 판단 실패, 규칙으로 대신 판단했어요", detail: String((e as Error).message).slice(0, 60) });
      return r;
    }
  }
  return planByRules(s, computeSignals(s));
}
