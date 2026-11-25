// 운영자 전용 이미지 생성: OpenAI 이미지 모델로 만들고 Supabase 공개 저장소(media/gen)에 올린다.
// 키는 서버 환경변수에만 있고, 로그인한 운영자(admins 표)만 부를 수 있다.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODELS = ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"];

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const oai = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!url || !key || !oai) return NextResponse.json({ error: "서버 설정(Supabase·OpenAI 키)이 비어 있어요." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(token);
  const email = u.user?.email;
  if (!email) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { data: adm } = await db.from("admins").select("email").eq("email", email).maybeSingle();
  if (!adm) return NextResponse.json({ error: "운영자만 쓸 수 있어요." }, { status: 403 });

  let body: { name?: string; prompt?: string; size?: string; quality?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 }); }
  const name = String(body.name ?? "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const prompt = String(body.prompt ?? "").slice(0, 3000);
  const size = ["1024x1024", "1536x1024", "1024x1536"].includes(String(body.size)) ? String(body.size) : "1536x1024";
  const quality = ["low", "medium", "high"].includes(String(body.quality)) ? String(body.quality) : "medium";
  if (!name || !prompt) return NextResponse.json({ error: "이름과 설명이 필요해요." }, { status: 400 });

  // 수업용 키가 허용하는 모델을 차례로 시도
  let b64 = "";
  let used = "";
  let usage: unknown = null;
  const errors: string[] = [];
  for (const model of MODELS) {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${oai}` },
      body: JSON.stringify({ model, prompt, size, quality, n: 1, output_format: "webp", output_compression: 82 }),
      signal: AbortSignal.timeout(110000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.data?.[0]?.b64_json) {
      b64 = j.data[0].b64_json;
      used = model;
      usage = j.usage ?? null;
      break;
    }
    errors.push(`${model}: ${r.status} ${String(j.error?.message ?? "").slice(0, 120)}`);
    if (r.status === 400 && /safety|policy|moderation/i.test(String(j.error?.message))) break;
  }
  if (!b64) return NextResponse.json({ error: "이미지를 만들지 못했어요.", detail: errors }, { status: 502 });

  const path = `gen/${name}.webp`;
  const { error: upErr } = await db.storage.from("media").upload(path, Buffer.from(b64, "base64"), { contentType: "image/webp", upsert: true, cacheControl: "60" });
  if (upErr) return NextResponse.json({ error: `저장 실패: ${upErr.message}` }, { status: 500 });
  const pub = db.storage.from("media").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url: `${pub}?v=${Date.now()}`, model: used, usage });
}
