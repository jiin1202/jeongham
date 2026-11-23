// 정함 코치 에이전트 API
// 관찰(Snapshot) → 신호 계산 → LLM이 도구를 골라 쓰며 판단 → 행동 목록 반환
// OPENAI_API_KEY가 없거나 LLM이 실패하면 같은 도구를 쓰는 규칙 플래너로 대신 판단한다.
import { NextResponse } from "next/server";
import { byId } from "@/lib/model";
import {
  computeSignals, planByRules, toolFindAlternative, toolGetProduct, toolSearch,
  type Action, type CoachResult, type Snapshot, type Step,
} from "@/lib/coach/core";

export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const MAX_TURNS = 5;

const SYSTEM = `너는 '정함 코치'라는 스킨케어 습관 코치 에이전트야. 사용자는 20대 남성이고, 정함이 정해준 루틴을 4주 동안 지속해 효과를 보는 게 목표야.
매번 다음 순서로 일해:
1) 주어진 신호(signals)와 상태를 읽고 지금 가장 중요한 문제 1~2개를 고른다.
2) 필요하면 도구(get_product, find_alternative, search_products)로 사실을 확인한다. 제품 정보는 반드시 도구 결과로만 말한다.
3) finish 도구로 행동을 확정한다. 행동은 메시지 1개 + 최대 3개.
규칙:
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

function sanitize(raw: Record<string, unknown>[], s: Snapshot, sig: ReturnType<typeof computeSignals>): Action[] {
  const inRoutine = new Set(s.routine.map((r) => r.id));
  const out: Action[] = [];
  for (const a of raw.slice(0, 4)) {
    const reason = String(a.reason ?? "").slice(0, 160);
    switch (a.type) {
      case "pause_product":
        if (inRoutine.has(String(a.productId))) out.push({ type: "pause_product", productId: String(a.productId), days: Math.min(7, Math.max(1, Number(a.days) || 3)), reason });
        break;
      case "swap_product":
        if (inRoutine.has(String(a.removeId)) && byId.get(String(a.addId))?.category === byId.get(String(a.removeId))?.category && !(sig.goalDaysLeft !== null && sig.goalDaysLeft >= 0 && sig.goalDaysLeft <= 7))
          out.push({ type: "swap_product", removeId: String(a.removeId), addId: String(a.addId), reason });
        break;
      case "reorder":
        if (inRoutine.has(String(a.productId))) out.push({ type: "reorder", productId: String(a.productId), reason });
        break;
      case "reminder":
        out.push({ type: "reminder", when: a.when === "tomorrow_am" ? "tomorrow_am" : "tonight", text: String(a.text ?? reason).slice(0, 80) });
        break;
      case "ask_review":
        if (inRoutine.has(String(a.productId))) out.push({ type: "ask_review", productId: String(a.productId) });
        break;
      case "freeze_new":
        out.push({ type: "freeze_new", reason });
        break;
      case "see_doctor":
        out.push({ type: "see_doctor", reason });
        break;
    }
  }
  // 안전장치: 심한 자극이면 LLM이 빠뜨려도 전문의 안내를 넣는다
  if (sig.irritation && sig.irritation.level >= 3 && !out.some((a) => a.type === "see_doctor"))
    out.unshift({ type: "see_doctor", reason: "따가움·붉어짐이 심하게 기록됐어요. 멈춰도 계속되면 피부과에서 확인받는 게 안전해요." });
  return out;
}

async function runLLM(s: Snapshot, key: string): Promise<CoachResult> {
  const sig = computeSignals(s);
  const routine = s.routine.map((r) => ({ id: r.id, start: r.start, ...toolGetProduct(r.id) }));
  const steps: Step[] = [{ kind: "observe", title: `${sig.day + 1}일째, ${sig.week}주차`, detail: `최근 7일 체크율 ${Math.round(sig.checkRate7 * 100)}%, 연속 ${sig.streak}일, 빠진 날 ${sig.missedDays}일` }];
  const messages: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify({ today: s.today, answers: s.answers, signals: sig, routine, recentLogs: s.logs, goal: s.goal ?? null, declined: s.declined }) },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: turn === MAX_TURNS - 1 ? { type: "function", function: { name: "finish" } } : "auto" }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
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
      if (call.function.name === "finish") {
        const actions = sanitize((args.actions as Record<string, unknown>[]) ?? [], s, sig);
        const text = String(args.message ?? "").slice(0, 120) || "오늘도 체크 하나만 남겨요.";
        steps.push({ kind: "act", title: `행동 ${actions.length + 1}개 결정` });
        return { mode: "llm", model: MODEL, signals: sig, steps, actions: [{ type: "message", text }, ...actions] };
      }
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

function valid(s: unknown): s is Snapshot {
  const x = s as Snapshot;
  return !!x && typeof x.today === "string" && Array.isArray(x.routine) && x.routine.length > 0 && x.routine.length <= 12 && !!x.answers && typeof x.checks === "object";
}

export async function POST(req: Request) {
  let s: unknown;
  try { s = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 }); }
  if (!valid(s)) return NextResponse.json({ error: "루틴 정보가 없어요." }, { status: 400 });
  s.declined = Array.isArray(s.declined) ? s.declined.slice(0, 50) : [];
  s.logs = Array.isArray(s.logs) ? s.logs.slice(-5) : [];
  s.reviews = s.reviews && typeof s.reviews === "object" ? s.reviews : {};

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      return NextResponse.json(await runLLM(s, key));
    } catch (e) {
      const r = planByRules(s, computeSignals(s));
      r.steps.unshift({ kind: "think", title: "AI 판단 실패, 규칙으로 대신 판단했어요", detail: String((e as Error).message).slice(0, 60) });
      return NextResponse.json(r);
    }
  }
  return NextResponse.json(planByRules(s, computeSignals(s)));
}
