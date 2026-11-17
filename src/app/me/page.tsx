"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearSaved, loadSaved, saveSaved, today, type Saved } from "@/lib/store";
import { daysToEmpty } from "@/lib/engine";
import { categoryLabel, oliveyoungUrl, products, type Product } from "@/data/products";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";

const DAY = 86400000;
const parse = (s: string) => new Date(s + "T00:00:00");
const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function downloadIcs(p: Product, date: Date) {
  const end = new Date(date.getTime() + DAY);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jeongham//routine//KO",
    "BEGIN:VEVENT",
    `UID:${p.id}-${ymd(date)}@jeongham`,
    `DTSTAMP:${ymd(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${ymd(date)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:[정함] ${p.brand} ${p.name} 곧 다 써요`,
    `DESCRIPTION:재구매하려면 ${oliveyoungUrl(p.goodsNo)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jeongham-${p.id}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function MePage() {
  const [s, setS] = useState<Saved | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setS(loadSaved());
    setReady(true);
  }, []);

  const update = (next: Saved) => {
    setS(next);
    saveSaved(next);
  };

  const streak = useMemo(() => {
    if (!s) return 0;
    let n = 0;
    const d = new Date();
    for (;;) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const c = s.checks[key];
      if (c && (c.am || c.pm)) n++;
      else if (n > 0 || key !== today()) break;
      d.setDate(d.getDate() - 1);
      if (n > 365) break;
    }
    return n;
  }, [s]);

  if (!ready) return <div className="page py-24 text-steel">불러오는 중…</div>;

  if (!s) {
    return (
      <div className="page max-w-[560px] py-24">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">아직 정한 루틴이 없어요</h1>
        <p className="mt-3 leading-7 text-steel">진단 결과에서 &lsquo;이 루틴으로 정함&rsquo;을 누르면 여기서 매일 체크하고 재구매 시점을 받아볼 수 있어요.</p>
        <Link href="/check" className="btn-primary mt-8">
          1분 진단 시작
        </Link>
      </div>
    );
  }

  const items = s.ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  const t = today();
  const todayCheck = s.checks[t] ?? {};
  const toggle = (k: "am" | "pm") => update({ ...s, checks: { ...s.checks, [t]: { ...todayCheck, [k]: !todayCheck[k] } } });

  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      <p className="text-[15px] text-steel">{skinTypeLabel[skinTypeOf(s.answers)]} 피부 루틴</p>
      <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.04em] sm:text-[42px]">
        {streak > 0 ? `${streak}일째 바르는 중` : "오늘부터 시작해요"}
      </h1>

      <section className="mt-8 grid grid-cols-2 gap-3">
        {(["am", "pm"] as const).map((k) => {
          const on = !!todayCheck[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(k)}
              className={`rounded-2xl border p-5 text-left transition-colors ${on ? "border-teal bg-teal-wash" : "border-line hover:border-ink"}`}
            >
              <span className="block text-[14px] text-steel">{k === "am" ? "아침" : "저녁"}</span>
              <span className={`mt-1 block text-[20px] font-bold ${on ? "text-teal-deep" : ""}`}>{on ? "발랐어요" : "아직이에요"}</span>
            </button>
          );
        })}
      </section>

      <h2 className="mt-14 text-[20px] font-bold tracking-[-0.02em]">다 쓰는 날</h2>
      <p className="mt-1 text-[14px] text-steel">하루 사용량 추정치로 계산했어요. 실제와 다를 수 있어요.</p>
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
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-teal-deep">{categoryLabel[p.category]}</p>
                  <p className="truncate text-[16px] font-bold">
                    <span className="text-steel">{p.brand}</span> {p.name}
                  </p>
                </div>
                <p className={`shrink-0 text-[15px] font-bold tabular-nums ${left <= 7 ? "text-rose" : ""}`}>
                  {left === 0 ? "다 썼을 때예요" : `${left}일 남음`}
                </p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-fog">
                <div className={`h-1.5 rounded-full ${left <= 7 ? "bg-rose" : "bg-teal"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px]">
                <span className="mr-auto text-steel">예상 {fmt(end)}</span>
                <button type="button" onClick={() => downloadIcs(p, new Date(end.getTime() - 3 * DAY))} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink">
                  캘린더에 알림 추가
                </button>
                <a
                  href={oliveyoungUrl(p.goodsNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => update({ ...s, start: { ...s.start, [p.id]: t } })}
                  className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white hover:bg-[#2C3644]"
                >
                  다 썼어요, 재구매
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/result" className="btn-ghost">
          루틴 결과 다시 보기
        </Link>
        <Link href="/mine" className="btn-ghost">
          같이 쓰는 제품 검사
        </Link>
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} className="btn px-4 text-steel hover:text-rose">
            루틴 지우기
          </button>
        ) : (
          <span className="flex items-center gap-2 text-[14px]">
            체크 기록까지 지워져요.
            <button
              type="button"
              onClick={() => {
                clearSaved();
                setS(null);
              }}
              className="rounded-lg bg-rose px-3 py-2 font-semibold text-white"
            >
              지우기
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg px-3 py-2 text-steel">
              취소
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
