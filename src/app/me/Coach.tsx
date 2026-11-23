"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { byId, buyUrl, categoryLabel } from "@/lib/model";
import { loadCoach, saveCoach, type Saved, type SkinLog, type Feedback } from "@/lib/store";
import { logCoachOutcome, logCoachRun } from "@/lib/sync";
import { track } from "@/lib/track";
import type { Action, CoachResult, Snapshot, Step } from "@/lib/coach/core";

const DAY = 86400000;
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s: string, n: number) => key(new Date(new Date(s + "T00:00:00").getTime() + n * DAY));

function snapshot(s: Saved, logs: SkinLog[], fb: Feedback, today: string, declined: string[]): Snapshot {
  const from = addDays(today, -14);
  return {
    today,
    answers: s.answers,
    routine: s.ids.map((id) => ({ id, start: s.start[id] ?? today })),
    checks: Object.fromEntries(Object.entries(s.checks).filter(([d]) => d >= from)),
    logs: logs.slice(-5).map(({ day, overall, trouble, oil, dry, irritation }) => ({ day, overall, trouble, oil, dry, irritation })),
    reviews: Object.fromEntries(Object.entries(fb).map(([k, v]) => [k, { rating: v.rating, change: v.change, again: v.again }])),
    goal: s.goal,
    declined,
  };
}

function reminderIcs(text: string, when: "tonight" | "tomorrow_am", today: string) {
  const d = when === "tonight" ? today : addDays(today, 1);
  const hh = when === "tonight" ? "220000" : "080000";
  const ymd = d.replace(/-/g, "");
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jeongham//coach//KO", "BEGIN:VEVENT",
    `UID:coach-${ymd}-${hh}@jeongham`, `DTSTAMP:${ymd}T000000`, `DTSTART:${ymd}T${hh}`, `DTEND:${ymd}T${hh.slice(0, 2)}1500`,
    `SUMMARY:[정함] ${text}`, "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:${text}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  a.download = "jeongham-reminder.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

const STEP_LABEL: Record<Step["kind"], string> = { observe: "관찰", think: "판단", tool: "도구", act: "행동" };
const actKey = (a: Action) =>
  a.type === "swap_product" ? `swap:${a.removeId}:${a.addId}` : a.type === "pause_product" ? `pause:${a.productId}` : a.type === "reorder" ? `reorder:${a.productId}` : a.type === "ask_review" ? `review:${a.productId}` : a.type;

type Props = { s: Saved; logs: SkinLog[]; fb: Feedback; today: string; update: (s: Saved) => void };

export default function Coach({ s, logs, fb, today, update }: Props) {
  const [res, setRes] = useState<CoachResult | null>(null);
  const [runId, setRunId] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "approved" | "declined" | "done">>({});
  // 코치가 먼저 보낸 알림(자율 실행)을 눌러 들어왔는지
  const [fromPush, setFromPush] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("from") === "coach") {
      setFromPush(true);
      track("coach_push_open", {});
    }
  }, []);

  const run = useCallback(
    async (force: boolean) => {
      const c = loadCoach();
      if (!force && c.last?.day === today && c.last.result) {
        setRes(c.last.result as CoachResult);
        setRunId(c.last.runId);
        setDone(c.log.at(-1)?.outcome ?? {});
        return;
      }
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch("/api/coach/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot(s, logs, fb, today, c.declined)) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "판단하지 못했어요.");
        const result: CoachResult = await r.json();
        const id = await logCoachRun(result.mode, result.signals, result.steps, result.actions).catch(() => undefined);
        setRes(result);
        setRunId(id);
        setDone({});
        saveCoach({ ...c, last: { day: today, result, runId: id }, log: [...c.log, { at: new Date().toISOString(), mode: result.mode, actions: result.actions.map(actKey) }] });
        track("coach_run", { mode: result.mode, n: result.actions.length });
      } catch (e) {
        setErr((e as Error).message === "Failed to fetch" ? "인터넷 연결을 확인하고 다시 눌러 주세요." : (e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [s, logs, fb, today],
  );

  useEffect(() => {
    run(false);
    // 하루에 한 번 자동으로 판단한다(같은 날은 저장된 결과를 보여줌)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const mark = (a: Action, v: "approved" | "declined" | "done") => {
    const k = actKey(a);
    const next = { ...done, [k]: v };
    setDone(next);
    const c = loadCoach();
    if (v === "declined" && !c.declined.includes(k)) c.declined.push(k);
    if (c.log.length) c.log[c.log.length - 1].outcome = next;
    saveCoach(c);
    logCoachOutcome(runId, next);
    track("coach_action", { action: a.type, result: v });
  };

  const apply = (a: Action) => {
    if (a.type === "pause_product") {
      update({ ...s, paused: { ...(s.paused ?? {}), [a.productId]: addDays(today, a.days) } });
      mark(a, "approved");
    } else if (a.type === "swap_product") {
      const ids = s.ids.map((x) => (x === a.removeId ? a.addId : x));
      const start = { ...s.start };
      delete start[a.removeId];
      start[a.addId] = today;
      const paused = { ...(s.paused ?? {}) };
      delete paused[a.removeId];
      update({ ...s, ids, start, paused });
      mark(a, "approved");
    } else if (a.type === "reminder") {
      reminderIcs(a.text, a.when, today);
      mark(a, "done");
    }
  };

  if (!res && !busy && !err) return null;
  const msg = res?.actions.find((a) => a.type === "message") as Extract<Action, { type: "message" }> | undefined;
  const acts = (res?.actions ?? []).filter((a) => a.type !== "message");

  return (
    <section id="coach" aria-labelledby="coach-h" className="scroll-mt-20 mt-10 overflow-hidden rounded-3xl border border-ink/10 bg-lemon-wash">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
        <div>
          <p id="coach-h" className="text-[13px] font-semibold text-lemon-ink">정함 코치{fromPush && <span className="ml-2 font-normal text-steel">알림 보고 들어왔군요. 지금 기록으로 다시 봤어요.</span>}</p>
          <p className="mt-1 text-[19px] font-bold leading-snug tracking-[-0.02em]">{busy ? "오늘 기록을 보고 판단하는 중이에요" : err ? "판단하지 못했어요" : msg?.text}</p>
          {err && <p className="mt-1 text-[14px] text-steel">{err}</p>}
        </div>
        <button type="button" onClick={() => run(true)} disabled={busy} className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-[13px] font-medium hover:border-ink disabled:opacity-50">
          {busy ? "판단 중…" : "다시 판단하기"}
        </button>
      </div>

      {acts.length > 0 && (
        <ul className="mt-4 space-y-2 px-6">
          {acts.map((a) => {
            const k = actKey(a);
            const st = done[k];
            const p = "productId" in a ? byId.get(a.productId) : undefined;
            const box = "rounded-2xl bg-white px-4 py-3.5 text-[14.5px] leading-6";
            const choose = (yes: string, onYes: () => void) =>
              st ? (
                <p className="mt-2 text-[13px] font-semibold text-steel">{st === "declined" ? "다음엔 이 제안을 하지 않을게요" : "적용했어요"}</p>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <button type="button" onClick={onYes} className="btn-primary h-9 px-3.5 text-[13.5px]">{yes}</button>
                  <button type="button" onClick={() => mark(a, "declined")} className="h-9 rounded-lg px-3 text-[13.5px] text-steel hover:text-ink">괜찮아요</button>
                </div>
              );
            switch (a.type) {
              case "see_doctor":
                return <li key={k} className={`${box} border border-rose/30`}><b>피부과 확인이 먼저예요.</b> {a.reason}</li>;
              case "freeze_new":
                return <li key={k} className={box}><b>새 제품은 잠시 멈춰요.</b> {a.reason}</li>;
              case "pause_product":
                return (
                  <li key={k} className={box}>
                    <b>{p?.name} {a.days}일 쉬기</b>
                    <p className="text-steel">{a.reason}</p>
                    {choose(`${a.days}일 쉬기`, () => apply(a))}
                  </li>
                );
              case "swap_product": {
                const from = byId.get(a.removeId), to = byId.get(a.addId);
                return (
                  <li key={k} className={box}>
                    <b>{categoryLabel[to!.category]} 바꾸기</b>: {from?.name} → <Link href={`/p/${to!.id}/`} className="underline underline-offset-4">{to!.brand} {to!.name}</Link>
                    <p className="text-steel">{a.reason}</p>
                    {choose("이걸로 바꾸기", () => apply(a))}
                  </li>
                );
              }
              case "reorder":
                return (
                  <li key={k} className={box}>
                    <b>{p?.name} 재구매</b>
                    <p className="text-steel">{a.reason}</p>
                    {st ? <p className="mt-2 text-[13px] font-semibold text-steel">확인했어요</p> : (
                      <div className="mt-2.5 flex gap-2">
                        <a href={p ? buyUrl(p.goodsNo) : "#"} target="_blank" rel="noopener noreferrer" onClick={() => mark(a, "done")} className="btn-primary h-9 px-3.5 text-[13.5px]">올리브영에서 보기</a>
                        <button type="button" onClick={() => mark(a, "declined")} className="h-9 rounded-lg px-3 text-[13.5px] text-steel hover:text-ink">아직이요</button>
                      </div>
                    )}
                  </li>
                );
              case "reminder":
                return (
                  <li key={k} className={box}>
                    <b>{a.when === "tonight" ? "오늘 밤 10시" : "내일 아침 8시"} 알림</b>: {a.text}
                    {choose("캘린더에 넣기", () => apply(a))}
                  </li>
                );
              case "ask_review":
                return (
                  <li key={k} className={box}>
                    <b>{p?.name} 4주 후기</b>
                    <p className="text-steel">써본 결과를 남기면 같은 피부 타입 남자들에게 보여줘요.</p>
                    {st ? null : <a href="#review" onClick={() => mark(a, "done")} className="mt-2 inline-block text-[13.5px] font-semibold underline underline-offset-4">후기 남기러 가기</a>}
                  </li>
                );
              default:
                return null;
            }
          })}
        </ul>
      )}

      {res && (
        <details className="group mt-4 border-t border-ink/10 bg-white/50 px-6 py-4">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-steel">
            코치가 판단한 과정 보기 <span className="font-normal">({res.mode === "llm" ? `AI ${res.model ?? ""}` : "규칙 기반"}, {res.steps.length}단계)</span>
          </summary>
          <ol className="mt-3 space-y-2 text-[13.5px]">
            {res.steps.map((st, i) => (
              <li key={i} className="grid grid-cols-[44px_1fr] gap-2">
                <span className="text-[12px] font-bold text-lemon-ink">{STEP_LABEL[st.kind]}</span>
                <span>
                  <span className="font-medium">{st.title}</span>
                  {st.detail && <span className="block text-steel">{st.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
