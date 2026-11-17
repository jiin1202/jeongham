"use client";
import { supabase } from "./supabase";
import { anonId, lastDiagKey, pushLocalEvent, setLastDiagKey } from "./store";
import type { Answers } from "./quiz";
import { skinTypeOf } from "./quiz";

// 서비스 이용 이벤트(익명). 운영자 대시보드 퍼널 분석에 사용
export function track(type: string, payload?: Record<string, unknown>) {
  try {
    pushLocalEvent({ type, payload, at: new Date().toISOString() });
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      supabase!.from("events").insert({ anon_id: anonId(), user_id: data.user?.id ?? null, type, payload: payload ?? null }).then(() => {});
    });
  } catch {
    /* 추적 실패는 서비스 이용을 막지 않음 */
  }
}

export function recordDiagnosis(a: Answers, picks: string[], total: number, plan: string) {
  const key = JSON.stringify(a) + picks.join();
  if (lastDiagKey() === key) return;
  setLastDiagKey(key);
  track("finish_check", { skin: skinTypeOf(a) });
  if (!supabase) return;
  supabase.auth.getUser().then(({ data }) => {
    supabase!
      .from("diagnoses")
      .insert({
        user_id: data.user?.id ?? null,
        anon_id: anonId(),
        skin_type: skinTypeOf(a),
        concerns: a.concerns,
        sensitive: a.sensitive,
        shave: a.shave,
        current_steps: a.current,
        plan,
        budget: a.budget,
        picks,
        total,
      })
      .then(() => {});
  });
}
