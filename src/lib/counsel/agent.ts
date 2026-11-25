// 정함 고민 상담 에이전트(서버 전용)
// 흐름: 사용자가 고민을 고름/적음 → 에이전트가 상황 질문을 직접 골라 최대 3번 묻는다(ask_user)
//      → 도구로 제품·성분·지금 루틴을 확인 → answer로 원인 후보·지금 할 일·제품·진료 신호를 낸다
//      → 정책 계층이 제품 실재 여부, 약 이름·처방 표현, 진료 신호 누락을 검사한다.
// 근거: 08번 프로젝트 문서 - 남성은 자유 채팅보다 '내 상황 입력 → 맞춤 답'을 선호(AI 정보원 6%).
import { byId, categoryLabel, concernLabel, products, type Category, type Concern } from "@/lib/model";
import { checkProducts, scoreProduct } from "@/lib/engine";
import { CONCERN_PLAN } from "@/lib/concernPlan";
import type { Answers } from "@/lib/quiz";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MAX_TOOL_TURNS = 6;
export const MAX_QUESTIONS = 3;

export type ChatTurn = { role: "user" | "agent"; text: string };
export type CounselContext = { answers?: Answers | null; mineIds?: string[]; routineIds?: string[] };
export type Step = { kind: "think" | "tool" | "policy"; title: string; detail?: string };
export type AnswerProduct = { id: string; brand: string; name: string; category: string; price: number; why: string;
  /** 저장한 루틴 기준: 이미 씀 / 같은 종류를 바꿈 / 새로 더함 */
  fit?: { kind: "have" | "replace" | "add"; replaces?: { id: string; name: string } }; thumb: { id: string; brand: string; name: string; fullName: string; category: Category; image?: string } };
export type CounselAnswer = {
  summary: string;
  causes: string[];
  doNow: string[];
  products: AnswerProduct[];
  watch: string;
  doctor: { needed: boolean; why: string };
};
export type CounselResult =
  | { type: "question"; question: string; options: string[]; steps: Step[]; usage: Usage }
  | { type: "answer"; answer: CounselAnswer; steps: Step[]; usage: Usage; meta: CounselMeta }
  | { type: "error"; message: string };
type Usage = { calls: number; input: number; output: number };
/** 익명 통계용. 대화 내용·사용자 식별 정보는 담지 않는다 */
export type CounselMeta = { questions: number; tools: number; concerns: string[]; redFlag: boolean };

const SYSTEM = `너는 '정함 고민 상담' 에이전트야. 상대는 스킨케어를 잘 모르는 20대 남성이야.
일하는 순서:
1) 고민을 읽고, 답을 바꿀 수 있는 정보가 빠졌으면 ask_user로 하나씩 묻는다. 질문은 짧게, 보기는 2~5개(사용자가 탭만 하면 되게). 이미 아는 건 묻지 않는다. 최대 ${MAX_QUESTIONS}번.
   좋은 질문 예: 언제부터/얼마나 자주, 위치(턱·이마·볼), 통증·고름 여부, 면도 직후인지, 지금 쓰는 제품, 새로 바꾼 제품이 있는지.
2) 필요하면 도구로 사실을 확인한다. 제품은 search_products/get_product 결과에 있는 것만 말한다. 지금 쓰는 제품이 있으면 check_current로 충돌을 본다. concern_plan으로 고민별 기본 관리법을 참고한다.
3) answer로 답한다. 구성:
   - summary: 상황을 한 문장으로 다시 정리(공감 한 마디 포함, 과장 금지)
   - causes: 가능성 있는 원인 1~3개. '~일 수 있어요'처럼 단정하지 않는다
   - doNow: 오늘부터 할 일 2~4개. 구체적으로(언제, 얼마나)
   - products: 최대 2개. 답하기 전에 search_products를 한 번은 불러서, 고민에 맞는 게 있으면 1~2개 넣는다(예: 면도 자극이면 진정·보습). 지금 쓰는 제품으로 충분할 때만 비운다. 꼭 도구 결과의 id만
   - watch: 언제쯤 다시 확인할지(보통 2~4주 단위, 과장 금지)
   - doctor: 진료가 먼저인 신호가 있으면 needed=true와 이유
규칙:
- 진단·처방·약 이름(항생제, 스테로이드, 이소트레티노인, 벤조일퍼옥사이드, 연고 등)을 말하지 않는다. 사용자가 약 이름을 먼저 말해도 그 약의 사용법·횟수·중단·병용을 안내하지 않고, 피부과 의사나 약사와 상의하도록 권한다. 제품 이유(why)에도 약 이름을 쓰지 않는다.
- 통증이 심함, 고름, 붓기, 열감, 빠르게 번짐, 눈 주변, 진물·물집, 2주 넘게 계속 악화 → doctor.needed=true.
- 존댓말(~요), 친구처럼 짧게. 이모지·느낌표 남발 금지. 각 항목 60자 안팎.`;

const TOOLS = [
  { type: "function", function: { name: "ask_user", description: "사용자에게 탭으로 답할 수 있는 질문 하나를 한다. 이걸 부르면 이번 차례가 끝난다.", parameters: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 } }, required: ["question", "options"] } } },
  { type: "function", function: { name: "search_products", description: "조건에 맞는 제품을 사용자 피부 점수순으로 최대 5개", parameters: { type: "object", properties: { category: { type: "string", enum: ["cleanser", "toner", "serum", "moisturizer", "allinone", "sun", "pad", "sheet", "pack", "patch"] }, concern: { type: "string", enum: ["trouble", "pore", "oil", "dry", "redness", "tone", "aging"] }, gentle: { type: "boolean", description: "자극 가능 성분·센 성분 없는 것만" }, maxPrice: { type: "number" }, forMen: { type: "boolean" } } } } },
  { type: "function", function: { name: "get_product", description: "제품 상세(종류, 정가, 맞는 고민, 센 성분, 자극 가능 성분 수준)", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "concern_plan", description: "고민별 기본 관리법(맡는 성분, 쓰는 법, 생활 습관, 진료 신호)", parameters: { type: "object", properties: { concern: { type: "string", enum: ["trouble", "pore", "oil", "dry", "redness", "tone", "aging"] } }, required: ["concern"] } } },
  { type: "function", function: { name: "check_current", description: "사용자가 지금 쓰는 제품끼리 충돌·피부 적합성 검사", parameters: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"] } } },
  {
    type: "function",
    function: {
      name: "answer",
      description: "상담 답을 확정한다",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          causes: { type: "array", items: { type: "string" } },
          doNow: { type: "array", items: { type: "string" } },
          products: { type: "array", items: { type: "object", properties: { id: { type: "string" }, why: { type: "string" } }, required: ["id", "why"] } },
          watch: { type: "string" },
          doctor: { type: "object", properties: { needed: { type: "boolean" }, why: { type: "string" } }, required: ["needed"] },
        },
        required: ["summary", "causes", "doNow", "products", "watch", "doctor"],
      },
    },
  },
];

// ── 도구 구현 ──
const baseAnswers = (ctx: CounselContext, concern?: string): Answers => ({ ...(ctx.answers ?? {}), concerns: ctx.answers?.concerns?.length ? ctx.answers.concerns : concern ? [concern as Concern] : [] }) as Answers;

function searchProducts(ctx: CounselContext, q: { category?: Category; concern?: Concern; gentle?: boolean; maxPrice?: number; forMen?: boolean }) {
  const a = baseAnswers(ctx, q.concern);
  return products
    .filter((p) => (!q.category || p.category === q.category) && (!q.concern || p.concerns.includes(q.concern)) && (!q.gentle || (p.irritation === 0 && p.activeStrong.length === 0)) && (!q.maxPrice || p.price <= q.maxPrice) && (!q.forMen || p.forMen))
    .map((p) => ({ p, r: scoreProduct(p, a) }))
    .filter((x) => x.r)
    .sort((x, y) => y.r!.score - x.r!.score || x.p.rank - y.p.rank)
    // 평가에서 토리든·피지오겔만 반복 추천됨 → 브랜드당 1개로 후보를 넓힌다
    .filter((x, i, arr) => arr.findIndex((y) => y.p.brand === x.p.brand) === i)
    .slice(0, 6)
    .map(({ p, r }) => ({ id: p.id, brand: p.brand, name: p.name, category: categoryLabel[p.category], price: p.price, reasons: r!.reasons.slice(0, 2) }));
}
function getProduct(id: string) {
  const p = byId.get(id);
  if (!p) return { error: "없는 제품" };
  return { id: p.id, brand: p.brand, name: p.name, category: categoryLabel[p.category], price: p.price, concerns: p.concerns.map((c) => concernLabel[c]), activeStrong: p.activeStrong, irritationLevel: p.irritation, forMen: p.forMen };
}
function checkCurrent(ctx: CounselContext, ids: string[]) {
  const list = ids.map((id) => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
  if (!list.length) return { note: "확인할 수 있는 제품이 없어요" };
  const r = checkProducts(list, ctx.answers ?? null);
  return list.map((p, i) => ({ id: p.id, name: `${p.brand} ${p.name}`, level: r[i].level, detail: r[i].detail }));
}

// ── 정책 계층: 진료 신호, 약 이름, 제품 실재 ──
const RED_FLAG = /(고름|붓|부어|열감|열이|욱신|너무 아파|많이 아파|통증이 심|번져|번지|퍼져|눈\s?(주변|주위|밑)|진물|물집|피가|출혈|화상|2주\s?(넘|이상)|한 달 넘|계속 심해|점점 심해)/;
// 의약품 이름·사용 지시(평가 D4·D6·D7·D8에서 새어 나온 이름 보강: 벤조일퍼옥사이드·후시딘 등 일반의약품 포함)
const DRUG = /(항생제|스테로이드|이소트레티노인|로아큐탄|아큐탄|트레티노인|아다팔렌|디페린|미노사이클린|독시사이클린|클린다마이신|에리스로마이신|벤조일\s?퍼옥사이드|과산화벤조일|후시딘|마데카솔|에스로반|박트로반|브레트라|연고|처방|약을 먹|약을 바르)/;

function sanitizeAnswer(raw: Record<string, unknown>, userText: string, seen: Set<string>, steps: Step[]): CounselAnswer {
  const arr = (x: unknown) => (Array.isArray(x) ? x.map(String).filter(Boolean) : []);
  let causes = arr(raw.causes).slice(0, 3);
  let doNow = arr(raw.doNow).slice(0, 4);
  let summary = String(raw.summary ?? "").slice(0, 160);
  let watch = String(raw.watch ?? "").slice(0, 120) || "2주 정도 써보고 다시 확인해요.";
  const d = (raw.doctor ?? {}) as { needed?: boolean; why?: string };
  let doctor = { needed: !!d.needed, why: String(d.why ?? "") };

  // 약 이름·처방 표현 제거(원인·할 일·요약·확인 시점·진료 이유 모두)
  const before = causes.length + doNow.length;
  const asksDrug = DRUG.test(userText);
  const strip = (xs: string[]) => xs.filter((x) => !DRUG.test(x));
  causes = strip(causes);
  doNow = strip(doNow);
  if (DRUG.test(summary)) summary = "지금 상황을 정리하면 이래요.";
  if (DRUG.test(watch)) watch = "2주 정도 써보고 다시 확인해요.";
  if (DRUG.test(doctor.why)) doctor.why = "";
  if (causes.length + doNow.length < before || asksDrug) {
    steps.push({ kind: "policy", title: asksDrug ? "정책 검사: 약 질문이라 사용법 대신 진료·약사 상담 안내로 바꿈" : "정책 검사: 약·처방 표현을 빼고 진료 안내로 바꿈" });
    doctor = { needed: true, why: doctor.why || "약을 쓸지, 어떻게 쓸지는 피부과 의사나 약사와 정하는 게 안전해요. 정함은 화장품 루틴만 도와드려요." };
  }
  // 진료 신호가 있는데 빠졌으면 보완
  if (RED_FLAG.test(userText) && !doctor.needed) {
    doctor = { needed: true, why: "말씀하신 증상(통증·붓기·고름·번짐 등)은 화장품보다 피부과 진료가 먼저예요." };
    steps.push({ kind: "policy", title: "정책 검사: 진료가 먼저인 신호를 보고 진료 안내를 추가함" });
  }
  // 제품: 도구로 확인한 실제 제품만, 최대 2개
  const prods: AnswerProduct[] = [];
  let dropped = 0;
  for (const x of (Array.isArray(raw.products) ? raw.products : []) as { id?: string; why?: string }[]) {
    const p = x.id ? byId.get(String(x.id)) : undefined;
    if (!p || !seen.has(p.id) || prods.some((y) => y.id === p.id) || prods.length >= 2) { dropped++; continue; }
    prods.push({ id: p.id, brand: p.brand, name: p.name, category: categoryLabel[p.category], price: p.price, why: (DRUG.test(String(x.why ?? "")) ? "순한 보습·진정용으로 무난해요" : String(x.why ?? "")).replace(/\b\d{8}\b/g, "").slice(0, 80), thumb: { id: p.id, brand: p.brand, name: p.name, fullName: p.fullName, category: p.category, image: p.image } });
  }
  if (dropped) steps.push({ kind: "policy", title: `정책 검사: 확인되지 않은 제품 ${dropped}개 제외` });
  if (!doNow.length) doNow = ["오늘은 순한 세안과 보습만 하고 새 제품은 잠시 미뤄요."];
  return { summary: summary || "말씀하신 상황을 정리했어요.", causes, doNow, products: prods, watch, doctor };
}

type Msg = { role: string; content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[]; tool_call_id?: string };

export async function counsel(history: ChatTurn[], ctx: CounselContext, key: string): Promise<CounselResult> {
  const asked = history.filter((t) => t.role !== "user").length;
  const userText = history.filter((t) => t.role === "user").map((t) => t.text).join(" / ");
  const steps: Step[] = [];
  const usage: Usage = { calls: 0, input: 0, output: 0 };
  const seen = new Set<string>();
  const concerns = new Set<string>();
  let toolCalls = 0;
  const mine = (ctx.mineIds ?? []).map((id) => byId.get(id)).filter(Boolean).map((p) => ({ id: p!.id, name: `${p!.brand} ${p!.name}`, category: categoryLabel[p!.category] }));
  const routine = (ctx.routineIds ?? []).map((id) => byId.get(id)).filter(Boolean).map((p) => ({ id: p!.id, name: `${p!.brand} ${p!.name}`, category: categoryLabel[p!.category] }));
  const a = ctx.answers;
  const profile = a ? { concerns: a.concerns?.map((c) => concernLabel[c]), sensitive: a.sensitive, shave: a.shave, feel: a.feel, budget: a.budget } : null;
  const flagged = RED_FLAG.test(userText);

  const messages: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify({ profile, currentProducts: mine, savedRoutine: routine, questionsLeft: Math.max(0, MAX_QUESTIONS - asked), redFlagInUserText: flagged }) },
    ...history.map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
  ];
  if (asked >= MAX_QUESTIONS) messages.push({ role: "user", content: "(이제 더 묻지 말고 answer로 답해 줘.)" });

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const forceAnswer = asked >= MAX_QUESTIONS || turn === MAX_TOOL_TURNS - 1;
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key.trim()}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: forceAnswer ? TOOLS.filter((t) => t.function.name !== "ask_user") : TOOLS,
        tool_choice: turn === MAX_TOOL_TURNS - 1 ? { type: "function", function: { name: "answer" } } : "required",
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const data = await res.json();
    usage.calls++;
    usage.input += Number(data.usage?.prompt_tokens ?? 0);
    usage.output += Number(data.usage?.completion_tokens ?? 0);
    const m: Msg = data.choices?.[0]?.message;
    if (!m?.tool_calls?.length) { messages.push(m ?? { role: "assistant", content: "" }); messages.push({ role: "user", content: "도구로 답해 줘." }); continue; }
    messages.push(m);
    for (const call of m.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* 빈 인자 */ }
      const name = call.function.name;
      if (name === "ask_user") {
        const options = (Array.isArray(args.options) ? args.options : []).map(String).filter(Boolean).slice(0, 5);
        const question = String(args.question ?? "").slice(0, 100);
        if (question && options.length >= 2) {
          steps.push({ kind: "think", title: "상황을 더 알아야 해서 질문을 골랐어요", detail: question });
          return { type: "question", question, options, steps, usage };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "질문과 보기 2개 이상이 필요해요" }) });
        continue;
      }
      if (name === "answer") {
        const answer = sanitizeAnswer(args, userText, seen, steps);
        const routineIds = ctx.routineIds ?? [];
        if (routineIds.length) {
          for (const ap of answer.products) {
            const cat = byId.get(ap.id)?.category;
            const same = routineIds.map((id) => byId.get(id)).find((r) => r && r.category === cat);
            ap.fit = routineIds.includes(ap.id) ? { kind: "have" } : same ? { kind: "replace", replaces: { id: same.id, name: `${same.brand} ${same.name}` } } : { kind: "add" };
          }
        }
        return { type: "answer", answer, steps, usage, meta: { questions: asked, tools: toolCalls, concerns: Array.from(concerns), redFlag: flagged } };
      }
      let result: unknown;
      toolCalls++;
      if (typeof args.concern === "string" && args.concern in CONCERN_PLAN) concerns.add(args.concern);
      if (name === "search_products") result = searchProducts(ctx, args as never);
      else if (name === "get_product") result = getProduct(String(args.id));
      else if (name === "concern_plan") result = CONCERN_PLAN[String(args.concern) as Concern] ?? { error: "없는 고민" };
      else if (name === "check_current") result = checkCurrent(ctx, (args.ids as string[]) ?? []);
      else result = { error: "알 수 없는 도구" };
      if (Array.isArray(result)) result.forEach((r: { id?: string }) => r.id && seen.add(r.id));
      else if ((result as { id?: string })?.id) seen.add((result as { id: string }).id);
      const brief = Array.isArray(result) ? result.map((r: { brand?: string; name?: string }) => `${r.brand ?? ""} ${r.name ?? ""}`.trim()).slice(0, 3).join(", ") || "결과 없음" : name === "concern_plan" ? "고민별 관리법 확인" : (result as { name?: string }).name ?? "";
      const label = { search_products: "제품 찾기", get_product: "제품 확인", concern_plan: "관리법 확인", check_current: "지금 쓰는 제품 검사" }[name] ?? name;
      steps.push({ kind: "tool", title: label, detail: brief });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return { type: "error", message: "답을 정리하지 못했어요. 다시 시도해 주세요." };
}
