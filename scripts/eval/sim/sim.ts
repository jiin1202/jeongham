// 4주 가상 사용자 시뮬레이션 (시뮬레이션임을 반드시 표시할 것)
// - 가상 사용자 30명 × 28일. 실제 코치 코드(computeSignals, pushTriggers)로 매일 저녁 '연락할 이유'를 판단한다.
// - 사용자의 반응(알림 후 다시 체크할 확률, 쉬기 제안 수락 확률 등)은 아래 ASSUME에 적은 가정값이다.
//   그래서 이 결과로 '지속률이 올랐다'는 주장은 하지 않는다. 측정 대상은 에이전트의 동작(연락 빈도·이유·규칙 준수)이다.
// - 연락이 일어난 날의 Snapshot은 requests.json으로 내보내, 배포된 /api/coach(GPT + 정책 계층)로 따로 판단시킨다.
// 실행: npx tsx --tsconfig tsconfig.json scripts/eval/sim/sim.ts
import fs from "fs";
import path from "path";
import { computeSignals, type Snapshot } from "../../../src/lib/coach/core";
import { pickNew, pushTriggers } from "../../../src/lib/coach/triggers";

const ASSUME = {
  resumeAfterMissedPush: 0.4, // 미체크 알림을 받은 다음 날 다시 체크할 확률
  acceptPause: 0.6, // 자극 알림 후 '쉬기'를 받아들일 확률
  reviewAfterAsk: 0.3, // 후기 요청 알림 후 후기를 남길 확률
  logEveryDays: 3, // 피부 기록을 남기는 간격(대략)
};

// 재현 가능한 난수
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261124);
const pick = <T,>(xs: T[]) => xs[Math.floor(R() * xs.length)];

const START = "2026-10-26";
const DAYS = 28;
const day = (d: number) => {
  const x = new Date(Date.parse(START + "T00:00:00Z") + d * 86400000);
  return x.toISOString().slice(0, 10);
};

const ACT = ["00268374", "00217777", "00263009", "00240562"]; // 클렌징오일, BHA 토너, 보습, 선크림
const GEN = ["00268374", "00218549", "00263009", "00240562"]; // 센 성분 없는 토너
const ANSWERS = [
  { feel: "tzone", concerns: ["trouble", "oil"], sensitive: "sometimes", shave: "few", current: "few", steps: "min", sunPain: "white", budget: 80000 },
  { feel: "dry", concerns: ["dry", "trouble"], sensitive: "often", shave: "daily", current: "few", steps: "min", sunPain: "sticky", budget: 50000 },
  { feel: "oily", concerns: ["oil", "pore"], sensitive: "rarely", shave: "few", current: "none", steps: "basic", sunPain: "white", budget: 80000 },
];

type Persona = "steady" | "fader" | "irritation" | "goal" | "runout";
const MIX: Persona[] = [
  ...Array(8).fill("steady"), ...Array(8).fill("fader"), ...Array(5).fill("irritation"), ...Array(5).fill("goal"), ...Array(4).fill("runout"),
];

type User = {
  id: string; persona: Persona; snap: Snapshot; checkP: number;
  lapseFrom: number; lapseLen: number; irritDay: number; irritLevel: number; paused: boolean; irritLeft: number;
  sent: Set<string>; pushes: { day: number; key: string; label: string; all: string[] }[];
};

const users: User[] = MIX.map((persona, i) => {
  const ids = persona === "irritation" || R() < 0.4 ? ACT : GEN;
  const offset = Math.floor(R() * 10) + (persona === "steady" ? 0 : 0);
  const start = day(-offset);
  const routine = ids.map((id) => ({ id, start: persona === "runout" && id === "00240562" ? day(-44) : start }));
  const snap: Snapshot = { today: START, answers: pick(ANSWERS) as never, routine, checks: {}, logs: [], reviews: {}, declined: [] };
  if (persona === "goal") snap.goal = { date: day(10 + Math.floor(R() * 10)), label: pick(["면접", "휴가", "발표", "소개팅"]) };
  return {
    id: `U${String(i + 1).padStart(2, "0")}`, persona, snap,
    checkP: persona === "steady" ? 0.92 : persona === "fader" ? 0.85 : 0.8,
    lapseFrom: persona === "fader" ? 5 + Math.floor(R() * 10) : 999, lapseLen: 3 + Math.floor(R() * 6),
    irritDay: persona === "irritation" ? 3 + Math.floor(R() * 8) : 999, irritLevel: R() < 0.5 ? 3 : 2, paused: false, irritLeft: 0,
    sent: new Set(), pushes: [],
  };
});

// 시작 전 기록 채우기: 루틴을 며칠 전에 시작했다면 그동안의 체크 이력이 있어야 첫날부터 '며칠 빠짐'으로 오판하지 않는다
for (const u of users) {
  const first = u.snap.routine.map((r) => r.start).filter((d) => d >= day(-10)).sort()[0] ?? START;
  for (let d = 0; day(-d - 1) >= first; d++) {
    const date = day(-d - 1);
    if (R() < u.checkP) u.snap.checks[date] = { am: true, pm: R() < 0.85 };
  }
  // 시작 전날은 체크한 상태로 둔다(시뮬레이션 첫날의 결석 판단을 깨끗하게)
  u.snap.checks[day(-1)] = { am: true, pm: true };
}

const requests: { user: string; persona: Persona; day: number; date: string; reason: string; triggers: string[]; snap: Snapshot }[] = [];

for (let t = 0; t < DAYS; t++) {
  const today = day(t);
  for (const u of users) {
    const s = u.snap;
    s.today = today;
    // 오늘 아침 체크(저녁 체크는 크론 이후라 반영하지 않음)
    const inLapse = t >= u.lapseFrom && t < u.lapseFrom + u.lapseLen;
    const p = inLapse ? 0.05 : u.checkP;
    if (R() < p) s.checks[today] = { am: true, pm: false };
    if (t > 0) {
      const y = day(t - 1);
      if (s.checks[y]) s.checks[y].pm = R() < 0.85;
    }
    // 피부 기록
    if (t === u.irritDay) { s.logs.push({ day: today, overall: 2, trouble: 2, oil: 1, dry: 1, irritation: u.irritLevel }); u.irritLeft = 3; }
    else if (u.irritLeft > 0 && t % 1 === 0) {
      u.irritLeft--;
      const lvl = u.paused ? Math.max(0, u.irritLevel - 2) : Math.max(1, u.irritLevel - 1);
      s.logs.push({ day: today, overall: 3, trouble: 2, oil: 1, dry: 1, irritation: lvl });
    } else if (t % ASSUME.logEveryDays === 0 && R() < 0.6) s.logs.push({ day: today, overall: 3, trouble: 2, oil: 2, dry: 1 });
    s.logs = s.logs.slice(-5);

    // 저녁 자율 실행: 실제 코드로 신호 계산 → 연락 이유 → 이미 연락한 이유 제외 → 하루 1개
    const sig = computeSignals(s);
    const fresh = pickNew(pushTriggers(s, sig), u.sent);
    if (!fresh.length) continue;
    const top = fresh[0];
    u.sent.add(top.key);
    u.pushes.push({ day: t, key: top.key, label: top.label, all: fresh.map((x) => x.key) });
    requests.push({ user: u.id, persona: u.persona, day: t, date: today, reason: top.key.split(":")[0], triggers: fresh.map((x) => x.key), snap: JSON.parse(JSON.stringify(s)) });

    // 사용자 반응(가정값)
    const kind = top.key.split(":")[0];
    if (kind === "missed" && R() < ASSUME.resumeAfterMissedPush) u.lapseLen = Math.max(0, t + 1 - u.lapseFrom);
    if (kind === "irritation" && R() < ASSUME.acceptPause) u.paused = true;
    if (kind === "review" && R() < ASSUME.reviewAfterAsk) for (const id of sig.needsReview) s.reviews[id] = { rating: 4, change: "better", again: "yes" } as never;
  }
}

// 요약
const byReason: Record<string, number> = {};
requests.forEach((r) => (byReason[r.reason] = (byReason[r.reason] ?? 0) + 1));
const per = users.map((u) => u.pushes.length);
const byPersona: Record<string, { users: number; pushes: number }> = {};
users.forEach((u) => { const b = (byPersona[u.persona] ??= { users: 0, pushes: 0 }); b.users++; b.pushes += u.pushes.length; });
const maxPerDay = Math.max(...users.map((u) => Math.max(0, ...Object.values(u.pushes.reduce((m: Record<number, number>, p) => ((m[p.day] = (m[p.day] ?? 0) + 1), m), {})))));
const summary = {
  start: START, days: DAYS, users: users.length, assumptions: ASSUME,
  totalPushes: requests.length,
  pushesPerUser: { mean: +(per.reduce((a, b) => a + b, 0) / per.length).toFixed(2), min: Math.min(...per), max: Math.max(...per) },
  usersNeverContacted: per.filter((n) => n === 0).length,
  maxPushesPerUserPerDay: maxPerDay,
  byReason, byPersona,
  gptCallsAvoided: users.length * DAYS - requests.length,
};
const out = path.join(__dirname);
fs.writeFileSync(path.join(out, "requests.json"), JSON.stringify(requests));
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ summary, users: users.map((u) => ({ id: u.id, persona: u.persona, pushes: u.pushes })) }, null, 1));
console.log(JSON.stringify(summary, null, 1));
