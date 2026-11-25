"use client";
// 써본 사람 장단점: 정해진 태그를 고르고(최대 4개씩) 한 줄(100자)을 남기면, 제품별로 모아 보여준다.
import { useEffect, useState } from "react";
import { NOTE_CONS, NOTE_PROS, fetchNotes, submitNote, type NoteSummary } from "@/lib/sync";
import { loadAnswers } from "@/lib/store";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";

const USED = [
  { v: "week", t: "1주 안" },
  { v: "month", t: "1달쯤" },
  { v: "long", t: "1달 넘게" },
];
const KEY = (id: string) => `jh.note.${id}`;

export default function ProductNotes({ id }: { id: string }) {
  const [sum, setSum] = useState<NoteSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(false);
  const [used, setUsed] = useState("month");
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchNotes(id).then(setSum);
    try { setMine(!!localStorage.getItem(KEY(id))); } catch { /* 저장소 없음 */ }
  }, [id]);

  if (!cloudEnabled) return null;
  const tog = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= 4 ? arr : [...arr, v]);
  const chip = (on: boolean, bad?: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-medium ${on ? (bad ? "bg-amber-wash text-amber ring-1 ring-amber/40" : "bg-lemon text-ink") : "bg-fog text-steel hover:text-ink"}`;
  const top = (r: Record<string, number> = {}) => Object.entries(r).sort((a, b) => b[1] - a[1]);

  const send = async () => {
    if (!pros.length && !cons.length) return setMsg("좋았던 점이나 아쉬운 점을 하나 이상 골라 주세요.");
    setBusy(true);
    const a = loadAnswers();
    const err = await submitNote(id, { skin: a ? skinTypeOf(a) : null, used, pros, cons, comment: comment.trim() });
    setBusy(false);
    if (err) return setMsg(err);
    try { localStorage.setItem(KEY(id), "1"); } catch { /* 저장소 없음 */ }
    track("note_add", { id, pros: pros.length, cons: cons.length, text: !!comment.trim() });
    setMine(true);
    setOpen(false);
    setMsg("고마워요. 같은 제품을 고민하는 사람에게 보여요.");
    fetchNotes(id).then(setSum);
  };

  const n = sum?.n ?? 0;
  return (
    <section className="mt-12" aria-labelledby="notes-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="notes-h" className="text-[19px] font-bold tracking-[-0.02em]">써본 사람 장단점</h2>
          <p className="mt-1 text-[13.5px] text-steel">정함 사용자가 직접 고른 의견이에요. 광고·체험단 글은 받지 않아요.</p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="btn h-10 px-4 text-[14px]">{mine ? "내 의견 고치기" : "써봤어요, 의견 남기기"}</button>
        )}
      </div>

      {n === 0 && !open && <p className="mt-4 rounded-2xl bg-fog px-5 py-4 text-[14px] text-steel">아직 남긴 사람이 없어요. 써봤다면 첫 의견을 남겨 주세요. 1분이면 돼요.</p>}
      {n > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[{ t: "좋았던 점", r: sum!.pros, bad: false }, { t: "아쉬운 점", r: sum!.cons, bad: true }].map((g) => (
            <div key={g.t} className="rounded-2xl border border-line p-4">
              <p className={`text-[13.5px] font-bold ${g.bad ? "text-amber" : "text-lemon-ink"}`}>{g.t}</p>
              {top(g.r).length === 0 ? <p className="mt-2 text-[13px] text-mist">아직 없어요</p> : (
                <ul className="mt-2 space-y-1.5">
                  {top(g.r).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 text-[14px]">
                      <span className="min-w-0 flex-1">{k}</span>
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-fog"><span className={`block h-full ${g.bad ? "bg-amber" : "bg-lemon-deep"}`} style={{ width: `${Math.round((v / n) * 100)}%` }} /></span>
                      <span className="w-12 text-right text-[12.5px] tabular-nums text-steel">{v}/{n}명</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {sum!.recent.length > 0 && (
            <ul className="space-y-2 sm:col-span-2">
              {sum!.recent.map((r, i) => (
                <li key={i} className="rounded-xl bg-fog px-4 py-3 text-[14px]">
                  “{r.comment}”
                  <span className="mt-1 block text-[12px] text-mist">{r.skin_type ? `${skinTypeLabel[r.skin_type as keyof typeof skinTypeLabel]} 피부, ` : ""}{USED.find((u) => u.v === r.used)?.t} 사용</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-5 rounded-2xl border border-line p-5">
          <fieldset>
            <legend className="text-[14px] font-semibold">얼마나 써봤어요?</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">{USED.map((u) => <button key={u.v} type="button" aria-pressed={used === u.v} onClick={() => setUsed(u.v)} className={chip(used === u.v)}>{u.t}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-[14px] font-semibold">좋았던 점 <span className="font-normal text-mist">(최대 4개)</span></legend>
            <div className="mt-2 flex flex-wrap gap-1.5">{NOTE_PROS.map((t) => <button key={t} type="button" aria-pressed={pros.includes(t)} onClick={() => tog(pros, setPros, t)} className={chip(pros.includes(t))}>{t}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-[14px] font-semibold">아쉬운 점 <span className="font-normal text-mist">(최대 4개)</span></legend>
            <div className="mt-2 flex flex-wrap gap-1.5">{NOTE_CONS.map((t) => <button key={t} type="button" aria-pressed={cons.includes(t)} onClick={() => tog(cons, setCons, t)} className={chip(cons.includes(t), true)}>{t}</button>)}</div>
          </fieldset>
          <label className="block">
            <span className="text-[14px] font-semibold">한 줄 의견 <span className="font-normal text-mist">(선택, 100자)</span></span>
            <input value={comment} onChange={(e) => setComment(e.target.value.slice(0, 100))} placeholder="예: 면도 후에 발라도 안 따가웠어요" className="mt-2 h-11 w-full rounded-xl border border-line px-4 text-[15px] outline-none focus:border-lemon-deep" />
            <span className="mt-1 block text-[12px] text-mist">링크·연락처가 들어간 글은 저장되지 않아요.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={send} disabled={busy} className="btn-primary h-11 px-5 text-[14px] disabled:opacity-50">{busy ? "저장 중…" : "의견 남기기"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn h-11 px-4 text-[14px]">취소</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="mt-3 text-[13.5px] text-steel">{msg}</p>}
    </section>
  );
}
