// 정함 고민 상담 API. 대화 기록은 서버에 저장하지 않는다(요청마다 클라이언트가 보낸 기록으로 판단).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { counsel, type ChatTurn, type CounselContext, type CounselResult } from "@/lib/counsel/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ type: "error", message: "상담 기능이 아직 준비 중이에요." }, { status: 503 });
  let body: { history?: ChatTurn[]; context?: CounselContext; eval?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ type: "error", message: "잘못된 요청이에요." }, { status: 400 }); }
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((t) => (t.role === "user" || t.role === "agent") && typeof t.text === "string")
    .slice(-12)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 500) }));
  if (!history.length || history[0].role !== "user") return NextResponse.json({ type: "error", message: "고민을 먼저 알려주세요." }, { status: 400 });
  const ctx: CounselContext = {
    answers: body.context?.answers ?? null,
    mineIds: (body.context?.mineIds ?? []).slice(0, 10).map(String),
    routineIds: (body.context?.routineIds ?? []).slice(0, 10).map(String),
  };
  const t0 = Date.now();
  try {
    const r = await counsel(history, ctx, key);
    // 평가 스크립트 실행분은 운영 통계에 넣지 않는다
    if (!body.eval) await logStats(r, history.length === 1, Date.now() - t0);
    return NextResponse.json(r);
  } catch (e) {
    const why = String((e as Error).message);
    return NextResponse.json({ type: "error", message: /429/.test(why) ? "지금 상담 요청이 많아요. 잠시 뒤 다시 시도해 주세요." : "상담 중 문제가 생겼어요. 다시 시도해 주세요." }, { status: 502 });
  }
}

// 익명 통계: 대화 내용·사용자 ID·IP는 남기지 않고 숫자와 고민 분류만 남긴다
async function logStats(r: CounselResult, first: boolean, ms: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key || r.type === "error") return;
  const rows: Record<string, unknown>[] = [];
  if (first) rows.push({ kind: "start" });
  if (r.type === "question") rows.push({ kind: "question" });
  if (r.type === "answer") {
    rows.push({
      kind: "answer",
      questions: r.meta.questions,
      tool_calls: r.meta.tools,
      concerns: r.meta.concerns,
      red_flag: r.meta.redFlag,
      doctor_needed: r.answer.doctor.needed,
      product_count: r.answer.products.length,
      policy_fixes: r.steps.filter((s) => s.kind === "policy").length,
    });
  }
  const last = rows[rows.length - 1];
  Object.assign(last, { latency_ms: ms, calls: r.usage.calls, tokens_in: r.usage.input, tokens_out: r.usage.output });
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    await db.from("counsel_stats").insert(rows);
  } catch {
    /* 통계 실패는 상담을 막지 않음 */
  }
}
