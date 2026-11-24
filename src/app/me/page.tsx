"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { loadSaved, loadFeedback, loadLogs, loadCounselNote, saveCounselNote, today, type CounselNote, type Saved, type Feedback, type SkinLog, type Review } from "@/lib/store";
import { clearSaved, saveSaved, saveFeedback, submitReview } from "@/lib/sync";
import { daysToEmpty, specialCare } from "@/lib/engine";
import { buildPlan } from "@/lib/plan";
import Coach from "./Coach";
import { byId, categoryLabel, oliveyoungUrl, buyUrl, type Product } from "@/lib/model";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";
import Reminders from "@/components/Reminders";

const DAY = 86400000;
const parse = (s: string) => new Date(s + "T00:00:00");
const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function downloadIcs(p: Product, date: Date) {
  const end = new Date(date.getTime() + DAY);
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jeongham//routine//KO", "BEGIN:VEVENT",
    `UID:${p.id}-${ymd(date)}@jeongham`, `DTSTAMP:${ymd(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${ymd(date)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:[정함] ${p.brand} ${p.name} 곧 다 써요`, `DESCRIPTION:재구매: ${oliveyoungUrl(p.goodsNo)}`,
    "BEGIN:VALARM", "TRIGGER:PT9H", "ACTION:DISPLAY", "DESCRIPTION:정함 재구매 알림", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  a.download = `jeongham-${p.id}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}점`} onClick={() => onChange(n)} className={`h-9 w-9 rounded-lg text-[15px] font-bold ${n <= value ? "bg-lemon-deep text-ink" : "bg-white text-mist ring-1 ring-line hover:text-ink"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default function MePage() {
  const { user } = useAuth();
  const [s, setS] = useState<Saved | null>(null);
  const [fb, setFb] = useState<Feedback>({});
  const [logs, setLogs] = useState<SkinLog[]>([]);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ date: "", label: "면접" });
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [note, setNote] = useState<CounselNote | null>(null);

  useEffect(() => {
    const load = () => {
      setS(loadSaved());
      setFb(loadFeedback());
      setLogs(loadLogs());
      setNote(loadCounselNote());
    };
    load();
    setReady(true);
    // 서버 연결 전에 저장만 된 4주 후기는 다음 방문 때 다시 보낸다
    const sv = loadSaved();
    const f0 = loadFeedback();
    if (sv && cloudEnabled) {
      const startKey = Object.values(sv.start).sort()[0];
      const days = startKey ? Math.floor((Date.now() - new Date(startKey + "T00:00:00").getTime()) / 86400000) : 0;
      const pending = Object.entries(f0).filter(([, r]) => r.sent && !r.synced);
      if (pending.length && days >= 21) {
        Promise.all(pending.map(([pid, r]) => submitReview(pid, sv.answers, r, days).then((ok) => [pid, ok] as const))).then((res) => {
          const next = { ...loadFeedback() };
          res.forEach(([pid, ok]) => { if (ok) next[pid] = { ...next[pid], synced: true }; });
          saveFeedback(next);
        });
      }
    }
    window.addEventListener("jh-store", load);
    return () => window.removeEventListener("jh-store", load);
  }, []);

  const update = (next: Saved) => {
    setS(next);
    saveSaved(next);
  };

  const streak = useMemo(() => {
    if (!s) return 0;
    let n = 0;
    const d = new Date();
    for (let i = 0; i < 400; i++) {
      const c = s.checks[key(d)];
      if (c && (c.am || c.pm)) n++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [s]);

  const week = useMemo(() => {
    const out: { k: string; d: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      out.push({ k: key(d), d });
    }
    return out;
  }, []);

  if (!ready) return <div className="page py-24 text-steel">불러오는 중…</div>;

  if (!s) {
    return (
      <div className="page max-w-[560px] py-24">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">아직 정한 루틴이 없어요</h1>
        <p className="mt-3 leading-7 text-steel">진단 결과에서 &lsquo;이 루틴으로 정함&rsquo;을 누르면 여기서 매일 체크하고 재구매 시점을 받아볼 수 있어요.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/check/" className="btn-primary">1분 진단 시작</Link>
          {cloudEnabled && !user && <Link href="/login/" className="btn-ghost">로그인해서 기록 불러오기</Link>}
        </div>
      </div>
    );
  }

  const items = s.ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const t = today();
  const todayCheck = s.checks[t] ?? {};
  const toggle = (k: "am" | "pm") => {
    track("check", { k });
    update({ ...s, checks: { ...s.checks, [t]: { ...todayCheck, [k]: !todayCheck[k] } } });
  };
  const startDay = Object.values(s.start).sort()[0] ?? t;
  const daysIn = Math.floor((parse(t).getTime() - parse(startDay).getTime()) / DAY);
  const rateFb = (id: string, rating: number) => {
    const next = { ...fb, [id]: { ...fb[id], rating } };
    setFb(next);
    saveFeedback(next);
    track("rate", { id, rating });
  };
  const setReview = (id: string, patch: Partial<Review>) => {
    const next: Feedback = { ...fb, [id]: { ...(fb[id] ?? { rating: 0 }), ...patch } };
    setFb(next);
    saveFeedback(next);
  };
  const sendReview = async (id: string) => {
    const r = fb[id];
    if (!r || !r.rating || !r.change || r.again === undefined) return;
    const ok = await submitReview(id, s.answers, r, daysIn);
    setReview(id, { sent: t, synced: ok });
    track("review_4w", { id, change: r.change, again: r.again });
    setSentMsg(ok ? "후기를 보냈어요. 같은 피부 타입 남자들의 결과에 더해져요." : "후기를 이 기기에 저장했어요. 집계 서버가 연결되면 같이 보내져요.");
    setTimeout(() => setSentMsg(null), 3500);
  };
  const special = specialCare(s.answers, items).map((x) => x.product);
  const plan = buildPlan(s, items, special, logs, fb, t);
  const saveGoal = () => {
    if (!goalDraft.date) return;
    update({ ...s, goal: { date: goalDraft.date, label: goalDraft.label } });
    track("set_goal", { label: goalDraft.label });
    setGoalOpen(false);
  };

  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      {cloudEnabled && !user && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-fog px-5 py-4 text-[14px]">
          <span>지금 기록은 이 브라우저에만 있어요. 로그인하면 폰과 PC에서 이어서 볼 수 있어요.</span>
          <Link href="/login/" className="font-semibold underline underline-offset-4">로그인</Link>
        </div>
      )}
      <p className="text-[15px] text-steel">{skinTypeLabel[skinTypeOf(s.answers)]} 피부 루틴, {daysIn + 1}일째</p>
      <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.04em] sm:text-[42px]">{streak > 0 ? `${streak}일 연속 발랐어요` : "오늘부터 시작해요"}</h1>

      <section className="mt-8 grid grid-cols-2 gap-3">
        {(["am", "pm"] as const).map((k) => {
          const on = !!todayCheck[k];
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className={`rounded-2xl border p-5 text-left transition-colors ${on ? "border-lemon-deep bg-lemon-wash" : "border-line hover:border-ink"}`}>
              <span className="block text-[14px] text-steel">{k === "am" ? "오늘 아침" : "오늘 저녁"}</span>
              <span className={`mt-1 block text-[20px] font-bold ${on ? "text-lemon-ink" : ""}`}>{on ? "발랐어요" : "아직이에요"}</span>
            </button>
          );
        })}
      </section>

      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="최근 7일 기록">
        {week.map(({ k, d }) => {
          const c = s.checks[k] ?? {};
          const n = (c.am ? 1 : 0) + (c.pm ? 1 : 0);
          return (
            <li key={k} className="text-center">
              <div className={`mx-auto h-9 w-full rounded-lg ${n === 2 ? "bg-lemon-deep" : n === 1 ? "bg-lemon-deep/40" : "bg-fog"}`} title={`${fmt(d)} ${n}/2`} />
              <span className="mt-1 block text-[11.5px] text-mist">{"일월화수목금토"[d.getDay()]}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/log/" className="btn-ghost">오늘 피부 기록하기</Link>
        <Reminders items={items} startKey={Object.values(s.start).sort()[0] ?? t} today={t} />
      </div>

      {note && (
        <section className="mt-8 rounded-2xl border border-line p-5" aria-labelledby="note-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="note-h" className="text-[17px] font-bold">상담에서 정한 할 일</h2>
            <span className="text-[12.5px] text-mist">{note.at.slice(5).replace("-", "월 ")}일 상담</span>
          </div>
          {note.doctor && <p className="mt-2 rounded-xl bg-rose-wash px-4 py-2.5 text-[14px] text-rose">진료가 먼저예요: {note.doctor}</p>}
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] leading-6">{note.doNow.map((x) => <li key={x}>{x}</li>)}</ol>
          <p className="mt-2 text-[13.5px] text-steel">{note.watch}</p>
          <div className="mt-3 flex gap-3 text-[13px] font-semibold">
            <Link href="/counsel/" className="underline underline-offset-4">다시 상담하기</Link>
            <button type="button" onClick={() => { saveCounselNote(null); setNote(null); }} className="text-steel hover:text-ink">다 했어요, 지우기</button>
          </div>
        </section>
      )}

      <Coach s={s} logs={logs} fb={fb} today={t} update={update} />

      <section className="mt-14" aria-labelledby="plan-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="plan-h" className="text-[20px] font-bold tracking-[-0.02em]">4주 플랜</h2>
            <p className="mt-1 text-[14px] text-steel">
              {plan.done ? "4주를 다 채웠어요. 써본 결과를 남겨 주세요." : `${plan.current}주차예요. 효과는 4주 써본 뒤에 판단해요.`}
            </p>
          </div>
          {plan.goal ? (
            <button type="button" onClick={() => { setGoalDraft({ date: s.goal!.date, label: s.goal!.label }); setGoalOpen((v) => !v); }} className="rounded-full bg-ink px-3.5 py-1.5 text-[13.5px] font-bold text-white">
              {plan.goal.label} {plan.goal.dLeft > 0 ? `D-${plan.goal.dLeft}` : plan.goal.dLeft === 0 ? "D-DAY" : "지났어요"}
            </button>
          ) : (
            <button type="button" onClick={() => setGoalOpen((v) => !v)} className="rounded-full border border-line px-3.5 py-1.5 text-[13.5px] font-medium hover:border-ink">
              중요한 날 정하기
            </button>
          )}
        </div>

        {goalOpen && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-fog p-4">
            <label className="text-[13px] font-semibold">
              무슨 날이에요?
              <select value={goalDraft.label} onChange={(e) => setGoalDraft({ ...goalDraft, label: e.target.value })} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-[14px] font-normal">
                {["면접", "발표", "소개팅", "촬영", "졸업식", "여행"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-semibold">
              날짜
              <input type="date" value={goalDraft.date} min={t} onChange={(e) => setGoalDraft({ ...goalDraft, date: e.target.value })} className="mt-1 block h-10 rounded-lg border border-line bg-white px-3 text-[14px] font-normal" />
            </label>
            <button type="button" onClick={saveGoal} disabled={!goalDraft.date} className="btn-primary h-10 px-4 text-[14px] disabled:opacity-40">저장</button>
            {s.goal && (
              <button type="button" onClick={() => { update({ ...s, goal: undefined }); setGoalOpen(false); }} className="h-10 px-2 text-[13.5px] text-steel underline underline-offset-4">지우기</button>
            )}
          </div>
        )}

        {plan.goal?.freeze && (
          <p className="mt-4 rounded-2xl bg-amber-wash px-5 py-4 text-[14px] leading-6">
            <b>{plan.goal.label}까지 일주일도 안 남았어요.</b> 지금부터는 새 제품을 시작하지 말고, 쓰던 그대로 가요. 처음 쓰는 제품이 하필 그날 안 맞으면 되돌릴 시간이 없어요.
          </p>
        )}

        <ol className="mt-5 grid gap-3 sm:grid-cols-2">
          {plan.weeks.map((w) => {
            const now = w.n === plan.current && !plan.done;
            const past = w.n < plan.current || plan.done;
            return (
              <li key={w.n} className={`rounded-2xl border p-5 ${now ? "border-ink bg-lemon-wash" : "border-line"} ${!now && !past ? "opacity-60" : ""}`}>
                <p className="text-[12.5px] font-semibold text-lemon-ink">{w.n}주차{now ? ", 지금" : ""}</p>
                <p className="mt-0.5 text-[16px] font-bold">{w.title}</p>
                <ul className="mt-3 space-y-1.5 text-[14px]">
                  {w.tasks.map((k) => (
                    <li key={k.text} className="flex gap-2">
                      {k.done === undefined ? (
                        <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-lemon-deep mx-[5px]" />
                      ) : (
                        <span aria-hidden className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-[5px] text-[10px] ${k.done ? "bg-ink text-white" : "border border-mist/60"}`}>{k.done ? "✓" : ""}</span>
                      )}
                      <span className={k.done ? "text-steel line-through decoration-mist" : ""}>
                        {k.href ? <Link href={k.href} className="underline decoration-line underline-offset-4 hover:decoration-ink">{k.text}</Link> : k.text}
                        <span className="sr-only">{k.done ? " (완료)" : ""}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {w.note && now && <p className="mt-3 text-[12.5px] leading-5 text-steel">{w.note}</p>}
              </li>
            );
          })}
        </ol>
      </section>

      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em]">다 쓰는 날</h2>
      <p className="mt-1 text-[14px] text-steel">용량을 하루 사용량 추정치로 나눠 계산했어요. 실제와 다를 수 있어요.</p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {items.map((p, i) => {
          const start = parse(s.start[p.id] ?? t);
          const pausedUntil = s.paused?.[p.id] && s.paused[p.id] > t ? s.paused[p.id] : null;
          const total = daysToEmpty(p);
          const used = Math.max(0, Math.floor((parse(t).getTime() - start.getTime()) / DAY));
          const left = Math.max(0, total - used);
          const end = new Date(start.getTime() + total * DAY);
          const pct = Math.min(100, Math.round((used / total) * 100));
          return (
            <li key={p.id} className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ProductThumb p={p} size={56} />
                  <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-lemon-ink">
                    {categoryLabel[p.category]}
                    {pausedUntil && <span className="ml-2 rounded-full bg-amber-wash px-2 py-0.5 text-[12px] text-amber">{Number(pausedUntil.slice(5, 7))}월 {Number(pausedUntil.slice(8))}일까지 쉬는 중</span>}
                  </p>
                  <Link href={`/p/${p.id}/`} className="block truncate text-[16px] font-bold hover:underline">
                    <span className="text-steel">{p.brand}</span> {p.name}
                  </Link>
                  <FitLine p={p} className="mt-1" />
                  </div>
                </div>
                <p className={`shrink-0 text-[15px] font-bold tabular-nums ${left <= 7 ? "text-rose" : ""}`}>{left === 0 ? "다 썼을 때예요" : `${left}일 남음`}</p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-fog">
                <div className={`h-1.5 rounded-full ${left <= 7 ? "bg-rose" : "bg-lemon-deep"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]">
                <span className="mr-auto text-steel">예상 {fmt(end)}</span>
                <button type="button" onClick={() => downloadIcs(p, new Date(end.getTime() - 3 * DAY))} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink">캘린더에 알림 추가</button>
                <a href={buyUrl(p.goodsNo)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => { track("repurchase", { id: p.id }); update({ ...s, start: { ...s.start, [p.id]: t } }); }} className="rounded-lg bg-lemon px-3 py-1.5 font-medium text-ink hover:bg-lemon-deep">
                  다 썼어요, 재구매
                </a>
              </div>
              {daysIn >= 7 && daysIn < 21 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-fog px-4 py-3">
                  <span className="text-[13.5px] text-steel">써보니 어때요?</span>
                  <Stars label={`${p.name} 만족도`} value={fb[p.id]?.rating ?? 0} onChange={(v) => rateFb(p.id, v)} />
                </div>
              )}
              {daysIn >= 21 && (
                <div id={i === 0 ? "review" : undefined} className="mt-4 scroll-mt-24 rounded-xl bg-fog px-4 py-4">
                  <p className="text-[14px] font-bold">{fb[p.id]?.sent ? "4주 후기를 남겼어요" : "4주 써본 결과를 남겨 주세요"}</p>
                  <p className="mt-0.5 text-[12.5px] text-steel">{skinTypeLabel[skinTypeOf(s.answers)]} 피부라는 것만 같이 집계돼요. 이름이나 연락처는 보내지 않아요.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="w-24 text-[13.5px] text-steel">만족도</span>
                    <Stars label={`${p.name} 만족도`} value={fb[p.id]?.rating ?? 0} onChange={(v) => setReview(p.id, { rating: v })} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="w-24 text-[13.5px] text-steel">고민은요?</span>
                    {([["better", "좋아졌어요"], ["same", "그대로예요"], ["worse", "나빠졌어요"]] as const).map(([v, l]) => (
                      <button key={v} type="button" aria-pressed={fb[p.id]?.change === v} onClick={() => setReview(p.id, { change: v })} className={`h-9 rounded-lg px-3 text-[13.5px] font-medium ${fb[p.id]?.change === v ? "bg-ink text-white" : "bg-white hover:bg-lemon-wash"}`}>{l}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="w-24 text-[13.5px] text-steel">또 살래요?</span>
                    {([[true, "네"], [false, "아니요"]] as const).map(([v, l]) => (
                      <button key={l} type="button" aria-pressed={fb[p.id]?.again === v} onClick={() => setReview(p.id, { again: v })} className={`h-9 rounded-lg px-3 text-[13.5px] font-medium ${fb[p.id]?.again === v ? "bg-ink text-white" : "bg-white hover:bg-lemon-wash"}`}>{l}</button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!fb[p.id]?.rating || !fb[p.id]?.change || fb[p.id]?.again === undefined}
                    onClick={() => sendReview(p.id)}
                    className="btn-primary mt-3 h-10 px-4 text-[14px] disabled:opacity-40"
                  >
                    {fb[p.id]?.sent ? "후기 고쳐서 다시 보내기" : "후기 보내기"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {daysIn < 7 && <p className="mt-3 text-[13px] text-mist">일주일 써본 뒤에 제품별 만족도를, 3주가 지나면 4주 후기를 남길 수 있어요. 남긴 후기는 같은 피부 타입 남자들에게 보여줘요.</p>}
      {sentMsg && (
        <p role="status" className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-center text-[14px] leading-6 text-white">{sentMsg}</p>
      )}

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/result/" className="btn-ghost">루틴 결과 다시 보기</Link>
        <Link href="/mine/" className="btn-ghost">같이 쓰는 제품 검사</Link>
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} className="btn px-4 text-steel hover:text-rose">루틴 지우기</button>
        ) : (
          <span className="flex items-center gap-2 text-[14px]">
            체크 기록까지 지워져요.
            <button type="button" onClick={() => { clearSaved(); setS(null); }} className="rounded-lg bg-rose px-3 py-2 font-semibold text-white">지우기</button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg px-3 py-2 text-steel">취소</button>
          </span>
        )}
      </div>
    </div>
  );
}
