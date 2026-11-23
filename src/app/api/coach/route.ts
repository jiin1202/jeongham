// 정함 코치 에이전트 API — 사용자가 /me를 열 때 호출된다.
// 판단 로직은 src/lib/coach/agent.ts (매일 자율 실행하는 크론과 공유)
import { NextResponse } from "next/server";
import { decide, valid } from "@/lib/coach/agent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let s: unknown;
  try { s = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 }); }
  if (!valid(s)) return NextResponse.json({ error: "루틴 정보가 없어요." }, { status: 400 });
  s.declined = Array.isArray(s.declined) ? s.declined.slice(0, 50) : [];
  s.logs = Array.isArray(s.logs) ? s.logs.slice(-5) : [];
  s.reviews = s.reviews && typeof s.reviews === "object" ? s.reviews : {};
  return NextResponse.json(await decide(s));
}
