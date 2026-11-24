"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { questions, type Answers, type MineItem } from "@/lib/quiz";
import { saveAnswers } from "@/lib/store";
import { track } from "@/lib/track";
import type { Concern } from "@/lib/model";
import MineStep from "./MineStep";

export default function CheckPage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Answers>({ concerns: [] });
  const [warn, setWarn] = useState("");
  // '지금 몇 개 바르고 있어요?'에 '안 발라요'가 아니면, 다음 질문 전에 지금 제품·순서를 묻는다
  const [mineStage, setMineStage] = useState(false);
  const q = questions[i];
  const last = i === questions.length - 1;

  useEffect(() => {
    track("start_check");
  }, []);

  useEffect(() => {
    setWarn("");
    window.scrollTo({ top: 0 });
  }, [i, mineStage]);

  const finish = (next: Answers) => {
    saveAnswers(next);
    router.push("/result");
  };

  const pickSingle = (value: unknown) => {
    const next = { ...a, [q.key]: value } as Answers;
    if (q.key === "current" && value === "none") delete next.mine;
    setA(next);
    if (q.key === "current" && value !== "none") {
      setTimeout(() => setMineStage(true), 160);
      return;
    }
    if (last) finish(next);
    else setTimeout(() => setI((x) => x + 1), 160);
  };

  const afterMine = (items: MineItem[] | null) => {
    const next = { ...a };
    if (items && items.length) next.mine = items;
    else delete next.mine;
    setA(next);
    setMineStage(false);
    if (items) track("mine_entered", { n: items.length });
    if (last) finish(next);
    else setI((x) => x + 1);
  };

  const toggleMulti = (value: Concern) => {
    if (q.type !== "multi") return;
    const has = a.concerns.includes(value);
    if (!has && a.concerns.length >= q.max) {
      setWarn(`최대 ${q.max}개까지 고를 수 있어요. 하나를 빼고 골라주세요.`);
      return;
    }
    setWarn("");
    setA({ ...a, concerns: has ? a.concerns.filter((c) => c !== value) : [...a.concerns, value] });
  };

  const nextFromMulti = () => {
    if (a.concerns.length === 0) {
      setWarn("하나 이상 골라주세요.");
      return;
    }
    if (last) finish(a);
    else setI(i + 1);
  };

  const selected = (v: unknown) =>
    q.type === "multi" ? a.concerns.includes(v as Concern) : (a as Record<string, unknown>)[q.key] === v;

  return (
    <div className="page max-w-[640px] pb-10 pt-8 sm:pt-12">
      <div className="flex items-center justify-between text-[14px]">
        <button
          type="button"
          onClick={() => (mineStage ? setMineStage(false) : i === 0 ? router.push("/") : setI(i - 1))}
          className="rounded-lg px-2 py-1 text-steel hover:text-ink"
        >
          이전
        </button>
        <span className="tabular-nums text-steel">
          <b className="text-ink">{i + 1}</b> / {questions.length}
        </span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-fog" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={questions.length}>
        <div className="h-1 rounded-full bg-lemon-deep transition-[width] duration-300" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
      </div>

      {mineStage ? (
        <MineStep initial={a.mine ?? []} onDone={(items) => afterMine(items)} onSkip={() => afterMine(null)} />
      ) : (
      <>
      <h1 className="mt-10 text-[28px] font-extrabold leading-snug tracking-[-0.035em] sm:text-[34px]">{q.title}</h1>
      {q.sub && <p className="mt-2 text-[15px] text-steel">{q.sub}</p>}

      <div className="mt-8 grid gap-2.5" role={q.type === "multi" ? "group" : "radiogroup"} aria-label={q.title}>
        {q.options.map((o) => {
          const on = selected(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              role={q.type === "multi" ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => (q.type === "multi" ? toggleMulti(o.value as Concern) : pickSingle(o.value))}
              className={`flex min-h-[60px] w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
                on ? "border-lemon-deep bg-lemon-wash" : "border-line bg-white hover:border-ink"
              }`}
            >
              <span>
                <span className="block text-[16px] font-semibold">{o.label}</span>
                {"hint" in o && o.hint && <span className="mt-0.5 block text-[13px] text-steel">{o.hint}</span>}
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  on ? "border-lemon-deep bg-lemon-deep" : "border-line"
                }`}
              >
                {on && (
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 6.2l2.2 2.2L9.5 3.6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {warn && (
        <p role="alert" className="mt-4 text-[14px] font-medium text-rose">
          {warn}
        </p>
      )}

      {q.type === "multi" && (
        <button type="button" onClick={nextFromMulti} className="btn-primary mt-8 w-full">
          {last ? "결과 보기" : `다음 (${a.concerns.length}/${q.max})`}
        </button>
      )}
      </>
      )}
    </div>
  );
}
