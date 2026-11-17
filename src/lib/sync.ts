"use client";
// 로컬 저장을 기본으로 쓰고, 로그인하면 Supabase와 양방향 동기화
import { supabase } from "./supabase";
import {
  loadFeedback,
  loadLogs,
  loadSaved,
  saveFeedbackLocal,
  saveLogsLocal,
  saveSavedLocal,
  clearSavedLocal,
  type Feedback,
  type Saved,
  type SkinLog,
} from "./store";

async function uid() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveSaved(s: Saved) {
  saveSavedLocal(s);
  const u = await uid();
  if (!u || !supabase) return;
  await supabase.from("routines").upsert({ user_id: u, answers: s.answers, ids: s.ids, start: s.start, updated_at: new Date().toISOString() });
  const rows = Object.entries(s.checks).map(([day, c]) => ({ user_id: u, day, am: !!c.am, pm: !!c.pm }));
  if (rows.length) await supabase.from("checks").upsert(rows.slice(-60));
}

export async function clearSaved() {
  clearSavedLocal();
  const u = await uid();
  if (u && supabase) await supabase.from("routines").delete().eq("user_id", u);
}

export async function saveLog(log: SkinLog, photoFile?: Blob) {
  const logs = loadLogs().filter((l) => l.day !== log.day);
  const u = await uid();
  if (u && supabase && photoFile) {
    const path = `${u}/${log.day}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("skin").upload(path, photoFile, { contentType: "image/jpeg", upsert: true });
    if (!error) log = { ...log, photo: path };
  }
  logs.push(log);
  logs.sort((a, b) => a.day.localeCompare(b.day));
  const ok = saveLogsLocal(logs);
  if (u && supabase) {
    await supabase.from("skin_logs").delete().eq("user_id", u).eq("day", log.day);
    await supabase.from("skin_logs").insert({ user_id: u, day: log.day, overall: log.overall, trouble: log.trouble, oil: log.oil, dry: log.dry, note: log.note ?? null, photo_path: log.photo?.startsWith("data:") ? null : log.photo ?? null });
  }
  return ok;
}

export async function photoUrl(path: string) {
  if (path.startsWith("data:")) return path;
  if (!supabase) return null;
  const { data } = await supabase.storage.from("skin").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function saveFeedback(f: Feedback) {
  saveFeedbackLocal(f);
  const u = await uid();
  if (!u || !supabase) return;
  const rows = Object.entries(f).map(([product_id, v]) => ({ user_id: u, product_id, rating: v.rating, comment: v.comment ?? null }));
  if (rows.length) await supabase.from("feedback").upsert(rows, { onConflict: "user_id,product_id" });
}

// 로그인 직후: 클라우드에 있으면 로컬로, 없으면 로컬 기록을 올림
export async function pullFromCloud(u: string) {
  if (!supabase) return;
  const { data: r } = await supabase.from("routines").select("*").eq("user_id", u).maybeSingle();
  const local = loadSaved();
  if (r) {
    const { data: ch } = await supabase.from("checks").select("day,am,pm").eq("user_id", u).gte("day", new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10));
    const checks: Saved["checks"] = { ...(local?.checks ?? {}) };
    (ch ?? []).forEach((c: { day: string; am: boolean; pm: boolean }) => (checks[c.day] = { am: c.am || checks[c.day]?.am, pm: c.pm || checks[c.day]?.pm }));
    saveSavedLocal({ answers: r.answers, ids: r.ids, start: r.start, checks });
  } else if (local) {
    await saveSaved(local);
  }
  const { data: logs } = await supabase.from("skin_logs").select("*").eq("user_id", u).order("day");
  if (logs?.length) {
    const merged = new Map(loadLogs().map((l) => [l.day, l]));
    logs.forEach((l: { day: string; overall: number; trouble: number; oil: number; dry: number; note: string | null; photo_path: string | null }) =>
      merged.set(l.day, { day: l.day, overall: l.overall, trouble: l.trouble, oil: l.oil, dry: l.dry, note: l.note ?? undefined, photo: l.photo_path ?? merged.get(l.day)?.photo })
    );
    saveLogsLocal(Array.from(merged.values()).sort((a, b) => a.day.localeCompare(b.day)));
  }
  const { data: fb } = await supabase.from("feedback").select("product_id,rating,comment").eq("user_id", u);
  if (fb?.length) {
    const f = loadFeedback();
    fb.forEach((x: { product_id: string; rating: number; comment: string | null }) => (f[x.product_id] = { rating: x.rating, comment: x.comment ?? undefined }));
    saveFeedbackLocal(f);
  }
}

export async function fetchRatings() {
  if (!supabase) return {};
  const { data } = await supabase.rpc("product_ratings");
  const out: Record<string, { avg: number; n: number }> = {};
  (data ?? []).forEach((r: { product_id: string; avg: number; n: number }) => (out[r.product_id] = { avg: Number(r.avg), n: Number(r.n) }));
  return out;
}
