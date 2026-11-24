"use client";
// 알림 설정: 시간은 사용자가 고르고, 받는 방법은 ① 휴대폰 캘린더(.ics / 구글) ② 웹 알림(선택) 중에서 고른다.
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/model";
import { buildEvents, googleLink, stepsFor, toIcs, type Times } from "@/lib/ics";
import { track } from "@/lib/track";
import PushSettings from "./PushSettings";

const KEY = "jh.remind";
const AM = ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "11:00"];
const PM = ["20:00", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"];

function load(): Times {
  try {
    return { am: "08:00", pm: "22:00", ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { am: "08:00", pm: "22:00" };
  }
}

const label = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const hh = h === 0 ? "밤 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `오후 ${h - 12}시`;
  return m ? `${hh} ${m}분` : hh;
};

type Props = { items: Product[]; startKey: string; today: string };

export default function Reminders({ items, startKey, today }: Props) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<Times>({ am: "08:00", pm: "22:00" });
  const [how, setHow] = useState<"calendar" | "push">("calendar");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => setT(load()), []);
  const update = (v: Times) => {
    setT(v);
    setDone(null);
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* 저장 공간이 없어도 이번 화면에서는 쓸 수 있음 */
    }
  };

  const site = typeof window !== "undefined" ? window.location.origin : "";
  const evs = useMemo(() => buildEvents(items, startKey, today, t, site), [items, startKey, today, t, site]);
  const routineEvs = evs.filter((e) => e.uid.startsWith("routine-"));
  const extra = evs.length - routineEvs.length;
  const none = !t.am && !t.pm;

  const downloadIcs = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toIcs(evs)], { type: "text/calendar;charset=utf-8" }));
    a.download = "jeongham-routine.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track("calendar_add", { via: "ics", am: t.am, pm: t.pm, n: evs.length });
    setDone("파일을 열면 캘린더 앱이 '추가'를 물어봐요. 추가하면 고른 시간에 캘린더가 알려줘요.");
  };

  const hourOf = (x: string | null, d: number) => (x ? Number(x.split(":")[0]) : d);

  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn-ghost">
        루틴 알림 설정
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-line p-5 text-[14px]">
          <fieldset>
            <legend className="font-bold">언제 알려드릴까요?</legend>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                아침
                <select value={t.am ?? ""} onChange={(e) => update({ ...t, am: e.target.value || null })} className="rounded-lg border border-line px-2 py-1.5">
                  <option value="">안 받기</option>
                  {AM.map((x) => <option key={x} value={x}>{label(x)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                저녁
                <select value={t.pm ?? ""} onChange={(e) => update({ ...t, pm: e.target.value || null })} className="rounded-lg border border-line px-2 py-1.5">
                  <option value="">안 받기</option>
                  {PM.map((x) => <option key={x} value={x}>{label(x)}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <div role="tablist" aria-label="받는 방법" className="mt-5 inline-flex rounded-xl bg-fog p-1">
            {([["calendar", "휴대폰 캘린더"], ["push", "웹 알림"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={how === k} onClick={() => setHow(k)} className={`rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold ${how === k ? "bg-white text-ink shadow-sm" : "text-steel"}`}>
                {l}
              </button>
            ))}
          </div>

          {how === "calendar" ? (
            <div className="mt-4">
              <p className="text-steel">
                남은 4주 동안의 {[t.am && "아침", t.pm && "저녁"].filter(Boolean).join("·") || "루틴"} 일정
                {extra > 0 && `과 점검·재구매 날 ${extra}개`}를 캘린더에 넣어요. 알림은 캘린더 앱이 보내서 로그인이나 알림 허용이 따로 필요 없어요.
              </p>
              {!none && (
                <ul className="mt-3 space-y-1 rounded-xl bg-fog px-4 py-3 text-[13px] text-steel">
                  {t.am && <li><b className="text-ink">{label(t.am)}</b> 아침 루틴: {stepsFor(items, "am").map((x) => x.replace(/^\d+\. /, "")).join(" → ")}</li>}
                  {t.pm && <li><b className="text-ink">{label(t.pm)}</b> 저녁 루틴: {stepsFor(items, "pm").map((x) => x.replace(/^\d+\. /, "")).join(" → ")}</li>}
                </ul>
              )}
              {none ? (
                <p className="mt-3 text-steel">아침이나 저녁 중 하나는 골라야 일정을 만들 수 있어요.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={downloadIcs} className="btn-primary h-10 px-4 text-[14px]">아이폰·삼성 캘린더에 넣기</button>
                  {routineEvs.map((e) => (
                    <a key={e.uid} href={googleLink(e)} target="_blank" rel="noopener noreferrer" onClick={() => track("calendar_add", { via: "google", which: e.uid })} className="btn h-10 px-4 text-[14px]">
                      구글 캘린더에 {e.uid.endsWith("am") ? "아침" : "저녁"} 넣기
                    </a>
                  ))}
                </div>
              )}
              {done && <p role="status" className="mt-3 text-[13px] text-steel">{done}</p>}
              <p className="mt-3 text-[12.5px] text-mist">구글 캘린더는 아침·저녁 반복 일정만 넣어져요. 점검·재구매 날까지 넣으려면 파일로 넣어 주세요. 루틴 제품이 바뀌면 다시 넣어 주세요.</p>
            </div>
          ) : (
            <div className="mt-4">
              <PushSettings embedded amHour={hourOf(t.am, 8)} pmHour={hourOf(t.pm, 22)} />
              <p className="mt-3 text-[12.5px] text-mist">웹 알림은 로그인과 알림 허용이 필요하고, 브라우저·기기에 따라 늦게 오거나 안 올 수 있어요. 확실하게 받으려면 캘린더를 추천해요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
