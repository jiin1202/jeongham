// 정함 고민 상담 API. 대화 기록은 서버에 저장하지 않는다(요청마다 클라이언트가 보낸 기록으로 판단).
import { NextResponse } from "next/server";
import { counsel, type ChatTurn, type CounselContext } from "@/lib/counsel/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ type: "error", message: "상담 기능이 아직 준비 중이에요." }, { status: 503 });
  let body: { history?: ChatTurn[]; context?: CounselContext };
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
  try {
    return NextResponse.json(await counsel(history, ctx, key));
  } catch (e) {
    const why = String((e as Error).message);
    return NextResponse.json({ type: "error", message: /429/.test(why) ? "지금 상담 요청이 많아요. 잠시 뒤 다시 시도해 주세요." : "상담 중 문제가 생겼어요. 다시 시도해 주세요." }, { status: 502 });
  }
}
