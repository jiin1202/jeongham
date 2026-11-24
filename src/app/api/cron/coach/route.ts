// 정함 코치 자율 실행 — 매일 저녁 1회(GitHub Actions가 호출)
// 사용자가 사이트를 열지 않아도 에이전트가 스스로:
//   관찰(DB에서 Snapshot 구성) → 연락할 이유 판단(triggers) → 이유가 있을 때만 GPT 판단(agent)
//   → 웹 푸시로 먼저 연락 → coach_runs에 trigger='auto'로 기록
// 이유가 없으면 GPT를 부르지 않는다. 같은 이유로는 다시 연락하지 않는다. 사용자당 하루 최대 1개.
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { decide } from "@/lib/coach/agent";
import { computeSignals, type Snapshot } from "@/lib/coach/core";
import { pickNew, pushTriggers } from "@/lib/coach/triggers";
import type { Answers } from "@/lib/quiz";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_USERS = 200; // 한 번 실행에서 판단할 최대 인원(비용 상한)

const kstDay = (offset = 0) => new Date(Date.now() + 9 * 3600e3 + offset * 864e5).toISOString().slice(0, 10);

type Sub = { endpoint: string; user_id: string; keys: { p256dh: string; auth: string } };
type RoutineRow = { user_id: string; answers: Answers; ids: string[]; start: Record<string, string>; goal: { date: string; label: string } | null };

async function snapshotOf(db: SupabaseClient, r: RoutineRow, today: string): Promise<Snapshot> {
  const since = kstDay(-14);
  const [{ data: checks }, { data: logs }, { data: reviews }] = await Promise.all([
    db.from("checks").select("day,am,pm").eq("user_id", r.user_id).gte("day", since),
    db.from("skin_logs").select("day,overall,trouble,oil,dry,irritation").eq("user_id", r.user_id).order("day", { ascending: false }).limit(5),
    db.from("reviews").select("product_id,rating,change,again").eq("user_id", r.user_id),
  ]);
  return {
    today,
    answers: r.answers,
    routine: r.ids.map((id) => ({ id, start: r.start?.[id] ?? today })),
    checks: Object.fromEntries((checks ?? []).map((c) => [c.day, { am: c.am, pm: c.pm }])),
    logs: (logs ?? []).reverse().map((l) => ({ ...l, irritation: l.irritation ?? undefined })),
    reviews: Object.fromEntries((reviews ?? []).map((v) => [v.product_id, { rating: v.rating, change: v.change, again: v.again }])),
    goal: r.goal ?? undefined,
    // 거절한 제안은 브라우저에만 있다. 자율 실행은 알림만 보내고 루틴 변경은 사용자가 사이트에서 승인한다.
    declined: [],
  };
}

type Opts = { dry: boolean; only?: string; force?: boolean };

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 붙여넣기 실수(머리말·공백·따옴표)에 대비해 키 부분만 뽑는다
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.match(/[A-Za-z0-9_-]{80,}/)?.[0];
  const priv = process.env.VAPID_PRIVATE_KEY?.match(/[A-Za-z0-9_-]{40,}/)?.[0];
  return url && key && pub && priv ? { url, key, pub, priv } : null;
}

// 예약 실행(GitHub Actions): CRON_SECRET으로 인증, 구독자 전체 대상
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const e = env();
  if (!e) return NextResponse.json({ error: "env missing" }, { status: 500 });
  // ?dry=1 이면 판단까지만 하고 알림·기록은 하지 않는다(테스트용)
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  return NextResponse.json(await runAuto(e, { dry }));
}

// 운영자 시험 실행(/admin 버튼): 로그인한 운영자 본인에게만, 이미 보낸 이유도 다시 판단(force)
export async function POST(req: Request) {
  const e = env();
  if (!e) return NextResponse.json({ error: "알림 키나 DB 설정이 아직 없어요." }, { status: 500 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인 정보가 요청에 없어요. 새로고침 후 다시 눌러 주세요." }, { status: 401 });
  const db = createClient(e.url, e.key, { auth: { persistSession: false } });
  const { data: u, error: authErr } = await db.auth.getUser(token);
  const email = u.user?.email;
  if (!u.user || !email) return NextResponse.json({ error: `서버에서 로그인 확인에 실패했어요. (${authErr?.message ?? "사용자 없음"})` }, { status: 401 });
  const { data: adm } = await db.from("admins").select("email").eq("email", email).maybeSingle();
  if (!adm) return NextResponse.json({ error: "운영자 계정만 시험 실행할 수 있어요." }, { status: 403 });
  let body: { dry?: boolean } = {};
  try { body = await req.json(); } catch { /* 기본값 */ }
  return NextResponse.json(await runAuto(e, { dry: body.dry !== false, only: u.user.id, force: true }));
}

async function runAuto(e: NonNullable<ReturnType<typeof env>>, opts: Opts) {
  const { dry } = opts;
  const { url, key, pub, priv } = e;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@jeongham.app", pub, priv);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const today = kstDay();

  // 알림을 받을 수 있는 사람(푸시 구독)만 대상
  const { data: subs } = await db.from("push_subs").select("endpoint,user_id,keys");
  const byUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const uids = opts.only ? (byUser.has(opts.only) ? [opts.only] : []) : Array.from(byUser.keys()).slice(0, MAX_USERS);
  if (!uids.length) return { today, users: 0, dry, note: opts.only ? "이 계정은 알림이 꺼져 있어요. /me에서 알림을 먼저 켜 주세요." : "알림 구독자가 없어요." };

  const [{ data: routines }, { data: past }] = await Promise.all([
    db.from("routines").select("user_id,answers,ids,start,goal").in("user_id", uids),
    // 최근 30일 자율 실행 기록: 이미 보낸 이유와 오늘 이미 보냈는지 확인
    db.from("coach_runs").select("user_id,signals,created_at").eq("trigger", "auto").in("user_id", uids).gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);
  const sentKeys = new Map<string, Set<string>>();
  const sentToday = new Set<string>();
  for (const p of past ?? []) {
    const keys = ((p.signals as { pushKeys?: string[] })?.pushKeys ?? []);
    const set = sentKeys.get(p.user_id) ?? new Set<string>();
    keys.forEach((k) => set.add(k));
    sentKeys.set(p.user_id, set);
    if (new Date(new Date(p.created_at).getTime() + 9 * 3600e3).toISOString().slice(0, 10) === today) sentToday.add(p.user_id);
  }

  const report = { today, users: uids.length, judged: 0, llm: 0, pushed: 0, skipped: 0, removed: 0, dry, samples: [] as unknown[] };
  const gone: string[] = [];

  for (const r of (routines ?? []) as RoutineRow[]) {
    if (!r.ids?.length || (!opts.force && sentToday.has(r.user_id))) { report.skipped++; continue; }
    const snap = await snapshotOf(db, r, today);
    const sig = computeSignals(snap);
    const fresh = pickNew(pushTriggers(snap, sig), opts.force ? new Set() : sentKeys.get(r.user_id) ?? new Set());
    if (!fresh.length) { report.skipped++; if (opts.only) report.samples.push({ triggers: [], message: "연락할 이유가 없어서 GPT를 부르지 않았어요." }); continue; } // 연락할 이유 없음 → GPT 호출 안 함

    const result = await decide(snap);
    report.judged++;
    if (result.mode === "llm") report.llm++;
    const msg = result.actions.find((a) => a.type === "message");
    const body = (msg && "text" in msg ? msg.text : fresh[0].label).slice(0, 90);
    result.steps.unshift({ kind: "observe", title: "자율 실행: 사용자가 열지 않아도 매일 확인", detail: fresh.map((t) => t.label).join(", ") });
    if (report.samples.length < 3) report.samples.push({ triggers: fresh.map((t) => t.label), message: body, actions: result.actions.map((a) => a.type) });
    if (dry) continue;

    let delivered = false;
    for (const s of byUser.get(r.user_id) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: "정함 코치", body, tag: "coach", url: "/me/?from=coach#coach" }));
        delivered = true;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
      }
    }
    if (delivered) report.pushed++;
    await db.from("coach_runs").insert({
      anon_id: `user:${r.user_id}`, user_id: r.user_id, mode: result.mode, trigger: "auto",
      // 가장 급한 이유 하나만 '연락함'으로 기록한다. 나머지는 다음 날 다시 판단(하루 1개씩 분산)
      signals: { ...result.signals, pushKeys: [fresh[0].key], triggers: fresh.map((t) => t.key), delivered },
      steps: result.steps, actions: result.actions,
    });
  }
  if (gone.length) {
    await db.from("push_subs").delete().in("endpoint", gone);
    report.removed = gone.length;
  }
  return report;
}
