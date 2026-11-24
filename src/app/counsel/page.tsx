"use client";
// 고민 상담: 고민을 고르거나 적으면 에이전트가 상황을 몇 가지 묻고(탭으로 답), 확인한 뒤 맞춤 답을 준다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { loadAnswers, loadMine, loadSaved, saveCounselNote, today } from "@/lib/store";
import { saveSaved } from "@/lib/sync";
import { track } from "@/lib/track";
import type { AnswerProduct, ChatTurn, CounselAnswer, Step } from "@/lib/counsel/types";

const STARTERS = [
  "턱에 트러블이 계속 올라와요",
  "면도하고 나면 따갑고 빨개져요",
  "오후만 되면 얼굴이 번들거려요",
  "코 블랙헤드가 금방 다시 차요",
  "번들거리는데 속은 당겨요",
  "선크림 바르면 하얗게 떠요",
];

type Item = ChatTurn & { options?: string[]; answer?: CounselAnswer; steps?: Step[] };

export default function CounselPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ctxNote, setCtxNote] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = loadAnswers();
    const s = loadSaved();
    const m = loadMine();
    const parts = [a ? "진단 결과" : "", s?.ids?.length ? "저장한 루틴" : "", m.length || a?.mine?.length ? "지금 쓰는 제품" : ""].filter(Boolean);
    setCtxNote(parts.length ? `${parts.join(", ")}을 참고해서 답해요.` : "진단을 먼저 하면 내 피부에 맞춰 더 정확하게 답해요.");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, busy]);

  const send = async (msg: string) => {
    const t = msg.trim();
    if (!t || busy) return;
    const next: Item[] = [...items.map((x) => ({ ...x, options: undefined })), { role: "user", text: t }];
    setItems(next);
    setText("");
    setErr("");
    setBusy(true);
    if (items.length === 0) track("counsel_start", {});
    try {
      const a = loadAnswers();
      const s = loadSaved();
      const mineIds = [...loadMine(), ...((a?.mine ?? []).map((x) => x.id).filter(Boolean) as string[])];
      const r = await fetch("/api/counsel/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next.map(({ role, text }) => ({ role, text })), context: { answers: a ? { ...a, mine: undefined } : null, mineIds, routineIds: s?.ids ?? [] } }),
      });
      const j = await r.json();
      if (j.type === "question") setItems([...next, { role: "agent", text: j.question, options: j.options, steps: j.steps }]);
      else if (j.type === "answer") {
        setItems([...next, { role: "agent", text: j.answer.summary, answer: j.answer, steps: j.steps }]);
        track("counsel_answer", { doctor: j.answer.doctor.needed, products: j.answer.products.length });
      } else setErr(j.message ?? "상담 중 문제가 생겼어요.");
    } catch {
      setErr("네트워크 오류로 답을 받지 못했어요. 다시 보내 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setItems([]); setErr(""); };
  const done = items.some((x) => x.answer);

  return (
    <div className="page max-w-[680px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[40px]">피부 고민, 상황부터 들을게요</h1>
      <p className="mt-3 text-[15px] leading-7 text-steel">고민을 고르면 몇 가지만 탭으로 물어보고, 제품 성분까지 확인해서 지금 할 일을 정리해 드려요. {ctxNote}</p>

      {items.length === 0 && (
        <div className="mt-8">
          <p className="text-[14px] font-semibold">많이 묻는 고민</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-2xl border border-line px-4 py-3.5 text-left text-[15px] font-medium hover:border-ink">{s}</button>
            ))}
          </div>
        </div>
      )}

      <ol className="mt-8 space-y-4" aria-live="polite">
        {items.map((it, i) => (
          <li key={i} className={it.role === "user" ? "flex justify-end" : ""}>
            {it.role === "user" ? (
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[15px] text-white">{it.text}</p>
            ) : it.answer ? (
              <AnswerCard a={it.answer} steps={it.steps ?? []} />
            ) : (
              <div className="max-w-[90%]">
                <p className="rounded-2xl rounded-bl-md bg-fog px-4 py-3 text-[15px]">{it.text}</p>
                {it.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.options.map((o) => (
                      <button key={o} type="button" disabled={busy} onClick={() => send(o)} className="rounded-full border border-lemon-deep bg-lemon-wash px-3.5 py-2 text-[14px] font-medium hover:bg-lemon disabled:opacity-50">{o}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {busy && <li className="text-[14px] text-steel">상황을 보고 확인하는 중…</li>}
      </ol>
      {err && <p role="alert" className="mt-4 text-[14px] font-medium text-rose">{err}</p>}
      <div ref={endRef} />

      {!done ? (
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-6 flex gap-2">
          <label htmlFor="counsel-input" className="sr-only">고민이나 답 직접 쓰기</label>
          <input id="counsel-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={items.length ? "보기에 없으면 직접 써도 돼요" : "직접 쓰기, 예: 이마에 좁쌀이 많아요"} className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 text-[15px] outline-none placeholder:text-mist focus:border-lemon-deep" />
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary shrink-0 disabled:opacity-40">보내기</button>
        </form>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn-ghost">다른 고민 상담하기</button>
          <Link href="/check" className="btn-primary">내 피부로 루틴 정하기</Link>
        </div>
      )}
      <p className="mt-6 text-[12.5px] leading-5 text-mist">정함 상담은 화장품 사용에 대한 안내예요. 진단이나 치료를 대신하지 않아요. 대화 내용은 저장하지 않아요.</p>
    </div>
  );
}

function AnswerCard({ a, steps }: { a: CounselAnswer; steps: Step[] }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-2xl border border-line p-5">
      <p className="text-[16px] font-semibold leading-7">{a.summary}</p>
      {a.doctor.needed && (
        <p className="mt-3 rounded-xl bg-rose-wash px-4 py-3 text-[14px] font-medium leading-6 text-rose">진료가 먼저예요: {a.doctor.why}</p>
      )}
      {a.causes.length > 0 && (
        <section className="mt-4">
          <h3 className="text-[14px] font-bold">이럴 수 있어요</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] leading-6 text-steel">{a.causes.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      )}
      <section className="mt-4">
        <h3 className="text-[14px] font-bold">오늘부터 이렇게</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-[14px] leading-6">{a.doNow.map((x) => <li key={x}>{x}</li>)}</ol>
      </section>
      {a.products.length > 0 && (
        <section className="mt-4">
          <h3 className="text-[14px] font-bold">도움이 될 제품</h3>
          <ul className="mt-2 space-y-2">
            {a.products.map((p) => {
              return (
                <li key={p.id}>
                  <Link href={`/p/${p.id}/`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-ink">
                    <ProductThumb p={p.thumb} size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-steel">{p.category}, {p.brand}</span>
                      <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                      <span className="block text-[13px] text-steel">{p.why}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-bold tabular-nums">{p.price.toLocaleString()}원</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p className="mt-4 text-[14px] leading-6"><span className="font-bold">언제 다시 볼까요</span> <span className="text-steel">{a.watch}</span></p>
      <ApplyToRoutine a={a} />
      {steps.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-[13px] font-semibold text-steel hover:text-ink">상담 에이전트가 확인한 과정 {open ? "닫기" : "보기"}</button>
          {open && (
            <ol className="mt-2 space-y-1 text-[13px] text-steel">
              {steps.map((s, i) => <li key={i}>{s.kind === "policy" ? "검사" : s.kind === "tool" ? "도구" : "판단"}: {s.title}{s.detail ? ` (${s.detail})` : ""}</li>)}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}

// 상담 결과를 저장한 루틴에 반영: 고른 제품은 같은 종류를 바꾸거나 더하고, 할 일은 '내 루틴'에 띄운다
function ApplyToRoutine({ a }: { a: CounselAnswer }) {
  const [has, setHas] = useState<boolean | null>(null);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = loadSaved();
    setHas(!!s?.ids?.length);
    // 진료가 먼저인 경우엔 새 제품을 기본으로 고르지 않는다
    setPick(Object.fromEntries(a.products.filter((p) => p.fit?.kind !== "have").map((p) => [p.id, !a.doctor.needed])));
  }, [a]);

  if (has === null) return null;
  if (!has)
    return (
      <div className="mt-5 rounded-xl bg-fog px-4 py-3 text-[14px]">
        <p className="text-steel">저장한 루틴이 아직 없어요. 진단하고 루틴을 만들면 상담 내용을 바로 반영할 수 있어요.</p>
        <Link href="/check/" className="mt-2 inline-block font-semibold underline underline-offset-4">진단하고 루틴 만들기</Link>
      </div>
    );

  const changes = a.products.filter((p) => p.fit && p.fit.kind !== "have");
  const line = (p: AnswerProduct) => (p.fit?.kind === "replace" ? `${p.fit.replaces?.name} → ${p.brand} ${p.name}` : `${p.brand} ${p.name} 더하기`);

  const apply = async () => {
    const s = loadSaved();
    if (!s) return;
    setBusy(true);
    const t = today();
    let ids = [...s.ids];
    const start = { ...s.start };
    let n = 0;
    for (const p of changes) {
      if (!pick[p.id]) continue;
      if (p.fit?.kind === "replace" && p.fit.replaces) {
        ids = ids.filter((x) => x !== p.fit!.replaces!.id);
        delete start[p.fit.replaces.id];
      }
      if (!ids.includes(p.id)) ids.push(p.id);
      start[p.id] = t;
      n++;
    }
    await saveSaved({ ...s, ids, start });
    saveCounselNote({ at: t, summary: a.summary, doNow: a.doNow, watch: a.watch, doctor: a.doctor.needed ? a.doctor.why : undefined });
    track("counsel_apply", { products: n, doctor: a.doctor.needed });
    setBusy(false);
    setDone(true);
  };

  return (
    <section className="mt-5 rounded-xl border border-lemon-deep/60 bg-lemon-wash px-4 py-4 text-[14px]" aria-labelledby="apply-h">
      <h3 id="apply-h" className="font-bold">내 루틴에 반영하기</h3>
      {done ? (
        <p className="mt-2" role="status">
          반영했어요. 할 일은 내 루틴 화면 위에 보여요. 제품을 바꿨다면 캘린더 알림도 다시 넣어 주세요.{" "}
          <Link href="/me/" className="font-semibold underline underline-offset-4">내 루틴 보기</Link>
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-1.5">
            <li className="text-steel">오늘부터 할 일 {a.doNow.length}개를 내 루틴 화면에 띄워요.</li>
            {changes.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={!!pick[p.id]} onChange={(e) => setPick({ ...pick, [p.id]: e.target.checked })} className="mt-1 h-4 w-4 accent-ink" />
                  <span>{line(p)}</span>
                </label>
              </li>
            ))}
            {a.products.filter((p) => p.fit?.kind === "have").map((p) => (
              <li key={p.id} className="text-steel">{p.brand} {p.name}은(는) 이미 루틴에 있어요.</li>
            ))}
          </ul>
          {a.doctor.needed && changes.length > 0 && <p className="mt-2 text-[13px] text-rose">진료를 먼저 받고, 새 제품은 그다음에 더하는 걸 권해요.</p>}
          <button type="button" onClick={apply} disabled={busy} className="btn-primary mt-3 h-10 px-4 text-[14px] disabled:opacity-50">이 내용으로 내 루틴 업데이트</button>
        </>
      )}
    </section>
  );
}
