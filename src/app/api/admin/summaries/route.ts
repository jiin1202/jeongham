// 운영자 전용: 제품 '한 줄 요약'을 GPT로 만든다. 근거는 우리 성분 분석 데이터뿐이고,
// 정책 검사로 질병·치료·과장 표현이 들어간 문장은 버린다(그 제품은 요약 없이 둔다).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { byId, categoryLabel, concernLabel, keyBenefits, cautions, fitLine, textureLabel } from "@/lib/model";
import { GROUPS } from "@/data/ingredients";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const BANNED = /치료|완치|처방|의약|질환|질병|아토피|여드름\s?(치료|개선|완화)|재생|흉터\s?(제거|개선)|미백|주름\s?개선|100%|즉각|완벽|최고|유일|보장|기적|효과\s?만점|약효/;

function facts(id: string) {
  const p = byId.get(id);
  if (!p) return null;
  return {
    id: p.id,
    종류: categoryLabel[p.category],
    이름: `${p.brand} ${p.name}`,
    제형: textureLabel[p.texture],
    맞는피부: fitLine(p),
    고민: p.concerns.map((c) => concernLabel[c]),
    핵심성분: keyBenefits(p).filter((h) => h.pos < 15).slice(0, 4).map((h) => GROUPS[h.group].label),
    주의성분: cautions(p).map((h) => GROUPS[h.group].label),
    자외선차단: p.sunFilter ?? null,
    남성용: p.forMen,
    순함: p.irritation === 0 && p.activeStrong.length === 0,
    강한성분: p.activeStrong,
  };
}

const SYSTEM = `너는 20대 초반 남성을 위한 스킨케어 서비스 '정함'의 에디터야. 제품마다 한 줄 요약을 쓴다.
규칙:
- 주어진 데이터(종류·제형·맞는 피부·고민·핵심 성분·주의 성분)만 근거로 쓴다. 데이터에 없는 효과·느낌·향을 지어내지 않는다.
- 한 문장, 25~45자, 존댓말 아닌 명사형 끝맺음(예: "~한 날 쓰기 좋은 가벼운 수분 로션").
- '무엇인지'와 '언제·누구에게'가 함께 들어가게. 성분 이름은 최대 1개.
- 치료·개선·완화·미백·주름 개선·재생 같은 효능 단정, 질병명, 최상급(최고·완벽·유일)은 쓰지 않는다.
- 강한 성분(레티노이드·AHA·BHA)이 있으면 '저녁에'·'적응 기간' 같은 쓰는 법을 짧게 반영해도 된다.
출력: {"items":[{"id":"...","line":"..."}]} JSON만.`;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const oai = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!url || !key || !oai) return NextResponse.json({ error: "서버 설정이 비어 있어요." }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(token);
  if (!u.user?.email) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { data: adm } = await db.from("admins").select("email").eq("email", u.user.email).maybeSingle();
  if (!adm) return NextResponse.json({ error: "운영자만 쓸 수 있어요." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const list = ((Array.isArray(body.ids) ? body.ids : []) as unknown[]).slice(0, 20).map(String).map(facts).filter((x): x is NonNullable<ReturnType<typeof facts>> => !!x);
  if (!list.length) return NextResponse.json({ error: "제품이 없어요." }, { status: 400 });

  const r = await fetch(`${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${oai}` },
    body: JSON.stringify({ model: MODEL, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(list) }] }),
    signal: AbortSignal.timeout(55000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ error: `OpenAI ${r.status}`, detail: String(j.error?.message ?? "").slice(0, 200) }, { status: 502 });
  let items: { id?: string; line?: string }[] = [];
  try { items = JSON.parse(j.choices?.[0]?.message?.content ?? "{}").items ?? []; } catch { /* 형식 오류 */ }
  const ok: Record<string, string> = {};
  const dropped: { id: string; line: string }[] = [];
  const ids = new Set(list.map((x) => x.id));
  for (const it of items) {
    const id = String(it.id ?? ""), line = String(it.line ?? "").trim().replace(/[.。]$/, "");
    if (!ids.has(id) || !line) continue;
    if (BANNED.test(line) || line.length > 60 || line.length < 10) dropped.push({ id, line });
    else ok[id] = line;
  }
  return NextResponse.json({ ok, dropped, usage: j.usage ?? null });
}
