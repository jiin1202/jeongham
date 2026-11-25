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
  anonId,
  type Feedback,
  type Review,
  type Saved,
  type SkinLog,
} from "./store";
import { skinTypeOf, type Answers } from "./quiz";

async function uid() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveSaved(s: Saved) {
  saveSavedLocal(s);
  const u = await uid();
  if (!u || !supabase) return;
  await supabase.from("routines").upsert({ user_id: u, answers: s.answers, ids: s.ids, start: s.start, goal: s.goal ?? null, updated_at: new Date().toISOString() });
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
    await supabase.from("skin_logs").insert({ user_id: u, day: log.day, overall: log.overall, trouble: log.trouble, oil: log.oil, dry: log.dry, irritation: log.irritation ?? null, note: log.note ?? null, photo_path: log.photo?.startsWith("data:") ? null : log.photo ?? null });
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
    saveSavedLocal({ answers: r.answers, ids: r.ids, start: r.start, checks, goal: r.goal ?? local?.goal });
  } else if (local) {
    await saveSaved(local);
  }
  const { data: logs } = await supabase.from("skin_logs").select("*").eq("user_id", u).order("day");
  if (logs?.length) {
    const merged = new Map(loadLogs().map((l) => [l.day, l]));
    logs.forEach((l: { day: string; overall: number; trouble: number; oil: number; dry: number; irritation: number | null; note: string | null; photo_path: string | null }) =>
      merged.set(l.day, { day: l.day, overall: l.overall, trouble: l.trouble, oil: l.oil, dry: l.dry, irritation: l.irritation ?? undefined, note: l.note ?? undefined, photo: l.photo_path ?? merged.get(l.day)?.photo })
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

/** 4주 후기를 같은 조건 집계로 보낸다(로그인 없이도 익명 ID로). 클라우드가 없으면 false */
export async function submitReview(productId: string, a: Answers, r: Review, daysUsed: number) {
  if (!supabase || !r.change || r.again === undefined) return false;
  const { error } = await supabase.rpc("submit_review", {
    p_anon: anonId(), p_product: productId, p_skin: skinTypeOf(a), p_concern: a.concerns[0] ?? null,
    p_sensitive: a.sensitive ?? null, p_shave: a.shave ?? null, p_days: daysUsed,
    p_rating: r.rating, p_change: r.change, p_again: r.again,
  });
  return !error;
}

export type PeerRow = { skin_type: string; n: number; avg_rating: number; better_pct: number; again_pct: number };
export async function fetchPeer(productId: string): Promise<PeerRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("peer_results", { p_product: productId });
  if (error) return null;
  return (data ?? []).map((x: PeerRow) => ({ ...x, n: Number(x.n), avg_rating: Number(x.avg_rating) }));
}

/** 코치 에이전트 실행 기록(클라우드가 있을 때만). 반환: 실행 ID */
export async function logCoachRun(mode: string, signals: unknown, steps: unknown, actions: unknown): Promise<number | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.rpc("log_coach_run", { p_anon: anonId(), p_mode: mode, p_signals: signals, p_steps: steps, p_actions: actions });
  return error ? undefined : (data as number);
}
export async function logCoachOutcome(id: number | undefined, outcome: unknown) {
  if (!supabase || !id) return;
  await supabase.rpc("coach_outcome", { p_anon: anonId(), p_id: id, p_outcome: outcome });
}

// ── 써본 사람 장단점(익명 태그 + 한 줄) ──
export const NOTE_PROS = ["촉촉해요", "끈적임 없어요", "순해요", "향이 거의 없어요", "흡수가 빨라요", "가성비 좋아요", "면도 후에도 괜찮아요", "백탁 없어요"] as const;
export const NOTE_CONS = ["끈적여요", "건조해요", "따가웠어요", "향이 세요", "하얗게 떠요", "트러블이 났어요", "비싸요", "눈이 시려요"] as const;
export type NoteSummary = { n: number; pros: Record<string, number>; cons: Record<string, number>; recent: { comment: string; skin_type: string | null; used: string; d: string }[] };
export async function fetchNotes(productId: string): Promise<NoteSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("product_notes_summary", { p_product: productId });
  return error ? null : (data as NoteSummary);
}
export async function submitNote(productId: string, v: { skin: string | null; used: string; pros: string[]; cons: string[]; comment: string }) {
  if (!supabase) return "지금은 의견을 남길 수 없어요.";
  const { error } = await supabase.rpc("submit_note", { p_anon: anonId(), p_product: productId, p_skin: v.skin ?? "", p_used: v.used, p_pros: v.pros, p_cons: v.cons, p_comment: v.comment });
  return error ? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." : null;
}
