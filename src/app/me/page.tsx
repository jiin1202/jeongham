"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { loadSaved, loadFeedback, today, type Saved, type Feedback } from "@/lib/store";
import { clearSaved, saveSaved, saveFeedback } from "@/lib/sync";
import { daysToEmpty } from "@/lib/engine";
import { byId, categoryLabel, oliveyoungUrl, buyUrl, type Product } from "@/lib/model";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";
import PushSettings from "@/components/PushSettings";

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
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}점`} onClick={() => onChange(n)} className={`h-9 w-9 rounded-lg text-[15px] font-bold ${n <= value ? "bg-teal text-white" : "bg-fog text-mist hover:text-ink"}`}>
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
  const [ready, setReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const load = () => {
      setS(loadSaved());
      setFb(loadFeedback());
    };
    load();
    setReady(true);
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
            <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className={`rounded-2xl border p-5 text-left transition-colors ${on ? "border-teal bg-teal-wash" : "border-line hover:border-ink"}`}>
              <span className="block text-[14px] text-steel">{k === "am" ? "오늘 아침" : "오늘 저녁"}</span>
              <span className={`mt-1 block text-[20px] font-bold ${on ? "text-teal-deep" : ""}`}>{on ? "발랐어요" : "아직이에요"}</span>
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
              <div className={`mx-auto h-9 w-full rounded-lg ${n === 2 ? "bg-teal" : n === 1 ? "bg-teal/40" : "bg-fog"}`} title={`${fmt(d)} ${n}/2`} />
              <span className="mt-1 block text-[11.5px] text-mist">{"일월화수목금토"[d.getDay()]}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/log/" className="btn-ghost">오늘 피부 기록하기</Link>
        <PushSettings />
      </div>

      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em]">다 쓰는 날</h2>
      <p className="mt-1 text-[14px] text-steel">용량을 하루 사용량 추정치로 나눠 계산했어요. 실제와 다를 수 있어요.</p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {items.map((p) => {
          const start = parse(s.start[p.id] ?? t);
          const total = daysToEmpty(p);
          const used = Math.max(0, Math.floor((parse(t).getTime() - start.getTime()) / DAY));
          const left = Math.max(0, total - used);
          const end = new Date(start.getTime() + total * DAY);
          const pct = Math.min(100, Math.round((used / total) * 100));
          return (
            <li key={p.id} className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ProductThumb src={p.image} brand={p.brand} name={p.name} size={56} />
                  <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-teal-deep">{categoryLabel[p.category]}</p>
                  <Link href={`/p/${p.id}/`} className="block truncate text-[16px] font-bold hover:underline">
                    <span className="text-steel">{p.brand}</span> {p.name}
                  </Link>
                  </div>
                </div>
                <p className={`shrink-0 text-[15px] font-bold tabular-nums ${left <= 7 ? "text-rose" : ""}`}>{left === 0 ? "다 썼을 때예요" : `${left}일 남음`}</p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-fog">
                <div className={`h-1.5 rounded-full ${left <= 7 ? "bg-rose" : "bg-teal"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]">
                <span className="mr-auto text-steel">예상 {fmt(end)}</span>
                <button type="button" onClick={() => downloadIcs(p, new Date(end.getTime() - 3 * DAY))} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink">캘린더에 알림 추가</button>
                <a href={buyUrl(p.goodsNo)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => { track("repurchase", { id: p.id }); update({ ...s, start: { ...s.start, [p.id]: t } }); }} className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-[#2C3644]">
                  다 썼어요, 재구매
                </a>
              </div>
              {daysIn >= 7 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-fog px-4 py-3">
                  <span className="text-[13.5px] text-steel">써보니 어때요?</span>
                  <Stars label={`${p.name} 만족도`} value={fb[p.id]?.rating ?? 0} onChange={(v) => rateFb(p.id, v)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {daysIn < 7 && <p className="mt-3 text-[13px] text-mist">일주일 써본 뒤에 제품별 만족도를 남길 수 있어요. 남긴 점수는 다른 사람의 추천에 반영돼요.</p>}

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
