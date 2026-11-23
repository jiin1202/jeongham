// 자율 실행(매일 크론)에서 "사용자에게 먼저 연락할 이유"가 있는지 고르는 규칙.
// 순수 함수라 브라우저·서버·평가 스크립트 어디서든 같은 결과를 낸다.
// 이유가 없으면 GPT를 부르지도, 알림을 보내지도 않는다(비용·피로 관리).
import type { Signals, Snapshot } from "./core";

export type Trigger = {
  /** 같은 이유로 다시 연락하지 않기 위한 키 */
  key: string;
  /** 높을수록 급함 */
  priority: number;
  label: string;
};

/** 빠진 날을 2·4·7일 구간으로 묶어 구간마다 한 번만 연락한다(매일 조르지 않기, 크론이 하루 빠져도 놓치지 않기) */
const missedBucket = (n: number) => (n >= 7 ? 7 : n >= 4 ? 4 : n >= 2 ? 2 : 0);

export function pushTriggers(s: Snapshot, sig: Signals): Trigger[] {
  const out: Trigger[] = [];

  // 어제·오늘 기록한 따가움(보통 이상) + 센 성분 → 다음 날 상태 확인
  if (sig.irritation && sig.irritation.level >= 2 && (sig.activeIds.length > 0 || sig.irritation.level >= 3))
    out.push({ key: `irritation:${sig.irritation.day}`, priority: 5, label: `따가움 ${sig.irritation.level}/3 기록 후 확인` });

  // 중요한 날: 일주일 안으로 들어올 때 한 번, 전날 한 번
  const g = sig.goalDaysLeft;
  if (s.goal && g !== null && g >= 0 && g <= 7) {
    const phase = g <= 1 ? "eve" : "week";
    out.push({ key: `goal:${s.goal.date}:${phase}`, priority: 4, label: `${s.goal.label} D-${g}` });
  }

  // 이탈 직전: 미체크 2·4·7일 구간마다 한 번
  const b = missedBucket(sig.missedDays);
  if (b) out.push({ key: `missed:${shiftKey(s.today, -sig.missedDays)}:${b}`, priority: 3, label: `${sig.missedDays}일 연속 체크 없음` });

  // 소진 5일 이하: 제품·시작일당 한 번
  for (const r of sig.runningOut)
    if (r.daysLeft <= 5) {
      const start = s.routine.find((x) => x.id === r.id)?.start ?? "";
      out.push({ key: `reorder:${r.id}:${start}`, priority: 2, label: `제품 소진 약 ${Math.max(0, r.daysLeft)}일 전` });
    }

  // 3주 이상 썼는데 후기 없음: 제품당 한 번
  for (const id of sig.needsReview.slice(0, 2)) out.push({ key: `review:${id}`, priority: 1, label: "4주 후기 요청" });

  return out.sort((a, b) => b.priority - a.priority);
}

/** 미체크가 시작된 날짜(같은 이탈 구간을 하나로 묶기 위함) */
function shiftKey(today: string, d: number) {
  const x = new Date(new Date(today + "T00:00:00Z").getTime() + d * 86400000);
  return x.toISOString().slice(0, 10);
}

/** 이미 연락한 이유는 뺀다 */
export function pickNew(triggers: Trigger[], sent: Set<string>): Trigger[] {
  return triggers.filter((t) => !sent.has(t.key));
}
