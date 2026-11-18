"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { useRouter, useSearchParams } from "next/navigation";
import { buildRoutine, decodeAnswers, encodeAnswers, pickFor, scoreProduct, type Pick } from "@/lib/engine";
import { skinTypeLabel, type Answers } from "@/lib/quiz";
import { loadAnswers, today } from "@/lib/store";
import { fetchRatings, saveSaved } from "@/lib/sync";
import { setRatings } from "@/lib/engine";
import { recordDiagnosis } from "@/lib/track";
import { categoryLabel, concernLabel, buyUrl, products } from "@/lib/model";
import { track } from "@/lib/track";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

function ResultInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const shared = sp.get("d");
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [ready, setReady] = useState(false);
  const [swaps, setSwaps] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const a = shared ? decodeAnswers(shared) : loadAnswers();
    fetchRatings()
      .then((r) => setRatings(r))
      .catch(() => {})
      .finally(() => {
        setAnswers(a);
        setReady(true);
      });
  }, [shared]);

  const routine = useMemo(() => (answers ? buildRoutine(answers) : null), [answers]);
  useEffect(() => {
    if (routine && answers && !shared) recordDiagnosis(answers, routine.picks.map((p) => p.product.id), routine.total, routine.plan);
  }, [routine, answers, shared]);

  const picks: Pick[] = useMemo(() => {
    if (!routine || !answers) return [];
    return routine.picks.map((pk, idx) => {
      const id = swaps[idx];
      if (!id) return pk;
      return pickFor(id, answers) ?? pk;
    });
  }, [routine, swaps, answers]);

  const alternatives = (idx: number) => {
    if (!answers || !routine) return [];
    const cat = routine.steps[idx];
    const current = picks[idx]?.product.id;
    return products
      .filter((p) => p.category === cat && p.id !== current)
      .map((p) => ({ p, r: scoreProduct(p, answers) }))
      .filter((x) => x.r && x.r.score > 0)
      .sort((x, y) => y.r!.score - x.r!.score)
      .slice(0, 3);
  };

  if (!ready) return <div className="page py-24 text-steel">불러오는 중…</div>;

  if (!answers || !routine) {
    return (
      <div className="page max-w-[560px] py-24">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">아직 진단 결과가 없어요</h1>
        <p className="mt-3 text-steel">
          {shared ? "공유 링크가 잘못됐거나 일부가 잘렸어요. 직접 진단해 보세요." : "질문 8개에 답하면 루틴을 정해드려요."}
        </p>
        <Link href="/check" className="btn-primary mt-8">
          1분 진단 시작
        </Link>
      </div>
    );
  }

  const total = picks.reduce((s, p) => s + p.product.price, 0);
  const budget = answers.budget ?? 999999;

  const save = async () => {
    const start: Record<string, string> = {};
    picks.forEach((p) => (start[p.product.id] = today()));
    track("save_routine");
    await saveSaved({ answers, ids: picks.map((p) => p.product.id), start, checks: {} });
    router.push("/me/");
  };

  const share = async () => {
    const url = `${location.origin}/result/?d=${encodeAnswers(answers)}`;
    const text = `내 피부는 ${skinTypeLabel[routine.skin]}, 정함이 정해준 루틴 보기`;
    try {
      track("share");
      if (navigator.share) {
        await navigator.share({ title: "정함", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("링크를 복사했어요. 친구에게 붙여넣기 하세요.");
    } catch {
      setToast("공유를 취소했어요.");
    }
    setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      {shared && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-teal-wash px-5 py-4 text-[14px]">
          <span className="font-semibold text-teal-deep">친구가 공유한 루틴이에요.</span>
          <Link href="/check" className="font-semibold text-ink underline underline-offset-4">
            내 피부로 진단하기
          </Link>
        </div>
      )}

      <p className="text-[15px] text-steel">정함이 정한 루틴</p>
      <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[44px]">
        {skinTypeLabel[routine.skin]} 피부, {picks.length}단계면 충분해요
      </h1>
      <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
        {answers.concerns.map((c) => (
          <span key={c} className="rounded-full bg-teal-wash px-3 py-1.5 font-semibold text-teal-deep">
            {concernLabel[c]} 고민
          </span>
        ))}
        {routine.sensitive && <span className="rounded-full bg-teal-wash px-3 py-1.5 font-semibold text-teal-deep">예민한 편</span>}
        <span className="rounded-full bg-fog px-3 py-1.5 font-medium">
          예산 {budget >= 999999 ? "제한 없음" : `${budget / 10000}만 원 이하`}
        </span>
      </div>

      <p className="mt-6 border-l-2 border-teal pl-4 text-[14px] leading-6 text-steel">
        전성분을 분석한 제품 {products.length}개 중 이 루틴 단계에 해당하는 {routine.candidates}개를 비교했고,
        {routine.excluded > 0 ? ` 자극이 겹칠 수 있는 ${routine.excluded}개는 뺐어요.` : " 자극 우려로 뺀 제품은 없어요."} 예산 안에서 점수가 가장 높은 조합이에요.
      </p>

      <ol className="mt-10 divide-y divide-line border-y border-line">
        {picks.map((pk, idx) => {
          const p = pk.product;
          const alts = open === idx ? alternatives(idx) : [];
          return (
            <li key={idx} className="py-6">
              <div className="flex gap-4">
                <Link href={`/p/${p.id}/`} className="relative shrink-0 self-start" aria-label={`${p.brand} ${p.name} 성분 보기`}>
                  <ProductThumb src={p.image} brand={p.brand} name={p.name} className="h-[88px] w-[88px] sm:h-[120px] sm:w-[120px]" priority={idx < 2} />
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal-deep text-[13px] font-bold text-white ring-2 ring-white">
                    {idx + 1}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[13px] font-semibold text-teal-deep">
                      {categoryLabel[p.category]}
                      {p.category === "sun" ? ", 아침에만" : ""}
                    </p>
                    <p className="text-[15px] font-bold tabular-nums">
                      {won(p.price)}
                      {p.priceFrom && <span className="font-normal text-steel">~</span>}
                    </p>
                  </div>
                  <h2 className="mt-1 text-[19px] font-bold leading-snug tracking-[-0.02em]">
                    <span className="text-steel">{p.brand}</span> {p.name}
                  </h2>
                  <FitLine p={p} className="mt-1.5" />
                  <p className="mt-0.5 text-[13px] text-mist">
                    {p.volumeEstimated ? "용량 정보 없음" : `${p.volume}${/g/i.test(p.volumeText) ? "g" : "ml"}`}
                    {p.units > 1 ? ` × ${p.units}개 구성` : ""}
                    {p.salePrice && p.salePrice < p.price ? `, 조사일 할인가 ${won(p.salePrice)}` : ""}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {pk.reasons.map((r) => (
                      <li key={r} className="rounded-md bg-teal-wash px-2 py-1 text-[12.5px] font-medium text-teal-deep">
                        {r}
                      </li>
                    ))}
                  </ul>
                  {pk.warnings.map((w) => (
                    <p key={w} className="mt-2 text-[13px] text-amber">{w}</p>
                  ))}
                  <div className="mt-4 flex flex-wrap gap-2 text-[13.5px]">
                    <Link href={`/p/${p.id}/`} className="rounded-lg border border-line px-3 py-2 font-medium hover:border-ink">
                      성분 보기
                    </Link>
                    <a onClick={() => track("click_buy", { id: p.id })} href={buyUrl(p.goodsNo)} target="_blank" rel="noopener noreferrer sponsored" className="rounded-lg bg-teal-deep px-3 py-2 font-medium text-white hover:bg-teal-dark">
                      올리브영에서 보기
                    </a>
                    <button type="button" onClick={() => setOpen(open === idx ? null : idx)} aria-expanded={open === idx} className="rounded-lg px-3 py-2 font-medium text-steel hover:text-ink">
                      {open === idx ? "후보 닫기" : "다른 후보"}
                    </button>
                  </div>
                  {open === idx && (
                    <div className="mt-3 rounded-2xl bg-fog p-3">
                      {alts.length === 0 && <p className="px-2 py-2 text-[14px] text-steel">이 조건에 맞는 다른 후보가 없어요.</p>}
                      {alts.map(({ p: ap }) => (
                        <button
                          key={ap.id}
                          type="button"
                          onClick={() => {
                            setSwaps({ ...swaps, [idx]: ap.id });
                            setOpen(null);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white"
                        >
                          <span className="flex min-w-0 items-center gap-3 text-[14.5px]">
                            <ProductThumb src={ap.image} brand={ap.brand} name={ap.name} size={48} />
                            <span className="min-w-0">
                              <span className="block"><span className="text-steel">{ap.brand}</span> <span className="font-semibold">{ap.name}</span></span>
                              <FitLine p={ap} className="mt-1" />
                            </span>
                          </span>
                          <span className="shrink-0 text-[13.5px] tabular-nums text-steel">{won(ap.price)}로 바꾸기</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-[15px] text-steel">합계(정상가)</span>
        <span className="text-[24px] font-extrabold tabular-nums tracking-[-0.02em]">
          {won(total)}
          {total > budget && <span className="ml-2 align-middle text-[13px] font-semibold text-amber">예산 초과</span>}
        </span>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <h3 className="text-[15px] font-bold">아침</h3>
          <p className="mt-2 text-[14px] leading-6 text-steel">
            {picks.map((p) => categoryLabel[p.product.category]).join(" → ")}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <h3 className="text-[15px] font-bold">저녁</h3>
          <p className="mt-2 text-[14px] leading-6 text-steel">
            {picks.filter((p) => p.product.category !== "sun").map((p) => categoryLabel[p.product.category]).join(" → ")}
          </p>
        </div>
      </section>

      {routine.notes.length > 0 && (
        <ul className="mt-6 space-y-2 rounded-2xl bg-amber-wash p-5 text-[14px] leading-6 text-[#6B4300]">
          {routine.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-4 z-20 mt-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-[0_10px_30px_-12px_rgba(28,36,48,0.3)] backdrop-blur">
        <button type="button" onClick={save} className="btn-teal flex-1">
          이 루틴으로 정함
        </button>
        <button type="button" onClick={share} className="btn-ghost">
          공유
        </button>
        <Link href="/check" className="btn-ghost">
          다시 진단
        </Link>
      </div>
      {toast && (
        <p role="status" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[14px] text-white">
          {toast}
        </p>
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="page py-24 text-steel">불러오는 중…</div>}>
      <ResultInner />
    </Suspense>
  );
}
