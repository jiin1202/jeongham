"use client";
// 친구 사용 테스트(10분): 해볼 일 체크 → 1분 설문. 답은 익명 이벤트(beta_survey)로만 남긴다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";

const TASKS = [
  { k: "check", t: "1분 진단 하기", d: "내 피부와 고민을 답하면 루틴이 나와요.", href: "/check/" },
  { k: "result", t: "추천 결과 보고 루틴 저장", d: "결과 화면 아래 '이 루틴으로 정함'을 눌러요.", href: "/check/" },
  { k: "counsel", t: "고민 상담 한 번 해보기", d: "지금 신경 쓰이는 피부 고민을 하나 골라 보세요.", href: "/counsel/" },
  { k: "me", t: "내 루틴에서 오늘 체크", d: "아침이나 저녁 루틴을 체크해요. 알림 설정도 열어 보세요.", href: "/me/" },
];

const Q = [
  { k: "easy", t: "내 피부에 뭘 써야 할지 정하기가 쉬워졌나요?", type: "scale" },
  { k: "trust", t: "추천 이유(성분·피부 타입 설명)가 믿을 만했나요?", type: "scale" },
  { k: "counsel", t: "고민 상담 답이 도움이 됐나요?", type: "scale" },
  { k: "again", t: "4주 동안 이 루틴을 써볼 생각이 있나요?", type: "scale" },
  { k: "best", t: "가장 좋았던 기능 하나는?", type: "pick", options: ["1분 진단·추천", "지금 쓰는 제품 검사", "고민 상담", "루틴 체크·알림", "제품 목록·성분 보기"] },
] as const;
const SCALE = ["전혀 아니에요", "아니에요", "보통", "그래요", "매우 그래요"];
const KEY = "jh.beta";

export default function BetaPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ans, setAns] = useState<Record<string, number | string>>({});
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      setDone(s.done ?? {});
      setSent(!!s.sent);
    } catch { /* 처음 */ }
    track("beta_open");
  }, []);
  const save = (v: object) => {
    try { localStorage.setItem(KEY, JSON.stringify({ done, sent, ...v })); } catch { /* 저장 공간 없음 */ }
  };
  const toggle = (k: string) => {
    const next = { ...done, [k]: !done[k] };
    setDone(next);
    save({ done: next });
  };
  const ready = Q.every((q) => ans[q.k] !== undefined);
  const submit = () => {
    if (!ready) return;
    track("beta_survey", { ...ans, tasks: Object.keys(done).filter((k) => done[k]).length, note: note.trim().slice(0, 200) || undefined });
    setSent(true);
    save({ sent: true });
  };

  return (
    <div className="page max-w-[680px] pb-12 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[38px]">정함 10분 테스트</h1>
      <p className="mt-3 text-[16px] leading-7 text-steel">아래 네 가지를 순서대로 해보고, 마지막에 1분 설문만 남겨 주세요. 이름·연락처는 받지 않고, 답은 익명으로만 모아요.</p>

      <ol className="mt-8 space-y-3">
        {TASKS.map((x, i) => (
          <li key={x.k} className="flex items-start gap-3 rounded-2xl border border-line p-4">
            <input type="checkbox" checked={!!done[x.k]} onChange={() => toggle(x.k)} aria-label={`${x.t} 완료`} className="mt-1 h-5 w-5 accent-lemon-deep" />
            <div className="min-w-0 flex-1">
              <p className="font-bold"><span className="mr-1.5 text-lemon-ink">{i + 1}</span>{x.t}</p>
              <p className="mt-0.5 text-[14px] text-steel">{x.d}</p>
            </div>
            <Link href={x.href} target="_blank" className="btn h-9 shrink-0 px-3 text-[13px]">열기</Link>
          </li>
        ))}
      </ol>

      <section className="mt-10" aria-labelledby="sv-h">
        <h2 id="sv-h" className="text-[22px] font-extrabold tracking-[-0.03em]">1분 설문</h2>
        {sent ? (
          <p role="status" className="mt-4 rounded-2xl bg-lemon-wash px-5 py-4 text-[15px]">고마워요. 답이 잘 들어갔어요.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {Q.map((q, i) => (
              <fieldset key={q.k}>
                <legend className="text-[15px] font-semibold">{i + 1}. {q.t}</legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(q.type === "scale" ? SCALE : q.options).map((o, j) => {
                    const v = q.type === "scale" ? j + 1 : o;
                    const on = ans[q.k] === v;
                    return (
                      <button key={o} type="button" aria-pressed={on} onClick={() => setAns({ ...ans, [q.k]: v })} className={`rounded-full px-3 py-1.5 text-[13.5px] font-medium ${on ? "bg-lemon text-ink" : "bg-fog text-steel hover:text-ink"}`}>
                        {o}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <label className="block">
              <span className="text-[15px] font-semibold">6. 불편했거나 바라는 점 (선택)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={3} placeholder="개인정보는 적지 말아 주세요." className="mt-2 w-full rounded-xl border border-line p-3 text-[14px]" />
            </label>
            <button type="button" onClick={submit} disabled={!ready} className="btn-primary h-12 px-6 disabled:opacity-40">설문 보내기</button>
            {!ready && <p className="text-[13px] text-mist">1~5번에 모두 답하면 보낼 수 있어요.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
