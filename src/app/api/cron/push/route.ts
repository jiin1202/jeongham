// 매시간 실행(GitHub Actions). 사용자가 정한 시각에 체크 안 했으면 아침/저녁 알림(고정 문구)
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

type Sub = { endpoint: string; user_id: string; keys: { p256dh: string; auth: string }; am_hour: number; pm_hour: number };

const kst = () => {
  const d = new Date(Date.now() + 9 * 3600e3);
  return { hour: d.getUTCHours(), day: d.toISOString().slice(0, 10) };
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.match(/[A-Za-z0-9_-]{80,}/)?.[0];
  const priv = process.env.VAPID_PRIVATE_KEY?.match(/[A-Za-z0-9_-]{40,}/)?.[0];
  if (!url || !key || !pub || !priv) return NextResponse.json({ error: "env missing" }, { status: 500 });

  const subj = (process.env.VAPID_SUBJECT ?? "").trim().replace(/^["']|["']$/g, "");
  // web-push는 mailto: 또는 https:// 로 시작해야 한다. 아니면 기본값
  webpush.setVapidDetails(/^(mailto:|https:\/\/)/.test(subj) ? subj : "mailto:hello@jeongham.app", pub, priv);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { hour, day } = kst();

  const { data: subs } = await db.from("push_subs").select("*").or(`am_hour.eq.${hour},pm_hour.eq.${hour}`);
  const list = (subs ?? []) as Sub[];
  if (!list.length) return NextResponse.json({ hour, sent: 0 });

  const uids = Array.from(new Set(list.map((s) => s.user_id)));
  const [{ data: checks }, { data: routines }] = await Promise.all([
    db.from("checks").select("user_id,am,pm").eq("day", day).in("user_id", uids),
    db.from("routines").select("user_id,ids,start").in("user_id", uids),
  ]);
  const ck = new Map((checks ?? []).map((c) => [c.user_id, c]));
  const rt = new Map((routines ?? []).map((r) => [r.user_id, r]));

  let sent = 0;
  const gone: string[] = [];
  for (const s of list) {
    const r = rt.get(s.user_id);
    if (!r) continue;
    const c = ck.get(s.user_id);
    const msgs: { title: string; body: string; tag: string }[] = [];
    if (s.am_hour === hour && !c?.am) msgs.push({ title: "아침 루틴", body: "세안하고 선크림까지 바르면 끝이에요. 바르고 체크해 주세요.", tag: "am" });
    if (s.pm_hour === hour && !c?.pm) msgs.push({ title: "저녁 루틴", body: "오늘 저녁 루틴 체크가 비어 있어요.", tag: "pm" });
    // 재구매·이탈·자극 등 상황 판단 알림은 코치 자율 실행(/api/cron/coach)이 맡는다
    for (const m of msgs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ ...m, url: "/me/" }));
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
      }
    }
  }
  if (gone.length) await db.from("push_subs").delete().in("endpoint", gone);
  return NextResponse.json({ hour, sent, removed: gone.length });
}
