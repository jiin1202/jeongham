"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { useRouter, useSearchParams } from "next/navigation";
import { buildRoutine, decodeAnswers, encodeAnswers, pickFor, scoreProduct, type Pick, buyOrder, reviewCurrent } from "@/lib/engine";
import { CONCERN_PLAN } from "@/lib/concernPlan";
import { skinTypeLabel, type Answers } from "@/lib/quiz";
import { loadAnswers, today } from "@/lib/store";
import { fetchRatings, saveSaved } from "@/lib/sync";
import { setRatings } from "@/lib/engine";
import { PX_BRANDS, pxNote } from "@/data/px";
import { recordDiagnosis } from "@/lib/track";
import { categoryLabel, concernLabel, buyUrl, products, type Category } from "@/lib/model";
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
  // 지금 쓰는 루틴 진단(입력한 경우만)
  const review = useMemo(() => (answers?.mine?.length ? reviewCurrent(answers.mine, answers) : null), [answers]);
  const keyCat = (c: Category): Category => (c === "allinone" ? "moisturizer" : c);
  /** 이 단계는 지금 쓰는 제품이 잘 맞아 '다 쓴 다음에' 사면 되는지 */
  const keptName = (c: Category) => {
    if (!review || !review.keep.includes(keyCat(c))) return null;
    const row = review.items.find((r) => r.level === "good" && r.product && keyCat(r.item.cat) === keyCat(c));
    return row?.product ? `${row.product.brand} ${row.product.name}` : null;
  };
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
    const brand = picks[idx]?.product.brand;
    const fit = products
      .filter((p) => p.category === cat && p.id !== current)
      .map((p) => ({ p, r: scoreProduct(p, answers), same: false }))
      .filter((x) => x.r && x.r.score > 0)
      .sort((x, y) => y.r!.score - x.r!.score);
    const top = fit.slice(0, 3);
    // 같은 브랜드를 선호하는 사람을 위해: 같은 브랜드에서 피부에 맞는 후보 최대 2개
    const same = fit.filter((x) => x.p.brand === brand && !top.includes(x)).slice(0, 2).map((x) => ({ ...x, same: true }));
    return [...top, ...same];
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
  const toBuy = picks.filter((p) => !keptName(p.product.category));
  const totalNow = toBuy.reduce((s, p) => s + p.product.price, 0);

  const save = async () => {
    const start: Record<string, string> = {};
    picks.forEach((p) => (start[p.product.id] = today()));
    track("save_routine");
    await saveSaved({ answers, ids: picks.map((p) => p.product.id), start, checks: {} });
    router.push("/me/");
  };

  const share = async () => {
    const url = `${location.origin}/result/?d=${encodeAnswers({ ...answers, mine: undefined })}`; // 지금 쓰는 제품은 공유하지 않음
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lemon-wash px-5 py-4 text-[14px]">
          <span className="font-semibold text-lemon-ink">친구가 공유한 루틴이에요.</span>
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
          <span key={c} className="rounded-full bg-lemon-wash px-3 py-1.5 font-semibold text-lemon-ink">
            {concernLabel[c]} 고민
          </span>
        ))}
        {routine.sensitive && <span className="rounded-full bg-lemon-wash px-3 py-1.5 font-semibold text-lemon-ink">예민한 편</span>}
        <span className="rounded-full bg-fog px-3 py-1.5 font-medium">
          예산 {budget >= 999999 ? "제한 없음" : `${budget / 10000}만 원 이하`}
        </span>
      </div>

      <p className="mt-6 border-l-2 border-lemon-deep pl-4 text-[14px] leading-6 text-steel">
        전성분을 분석한 제품 {products.length}개 중 이 루틴 단계에 해당하는 {routine.candidates}개를 비교했고,
        {routine.excluded > 0 ? ` 자극이 겹칠 수 있는 ${routine.excluded}개는 뺐어요.` : " 자극 우려로 뺀 제품은 없어요."} 예산 안에서 점수가 가장 높은 조합이에요.
      </p>

      {review && (
        <section className="mt-10" aria-labelledby="review-h">
          <h2 id="review-h" className="text-[22px] font-bold tracking-[-0.03em]">먼저, 지금 루틴부터 볼게요</h2>
          <p className="mt-2 text-[15px] leading-7 text-steel">{review.summary}</p>
          <ol className="mt-4 space-y-2">
            {review.items.map((r, i) => {
              const tag = { good: "잘 맞아요", caution: "조정하면 좋아요", bad: "바꾸는 게 좋아요", unknown: "성분 확인 못 함" }[r.level];
              const color = { good: "bg-lemon-wash text-lemon-ink", caution: "bg-amber-wash text-amber", bad: "bg-rose-wash text-rose", unknown: "bg-fog text-steel" }[r.level];
              return (
                <li key={i} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold">
                      <span className="mr-2 text-steel">{i + 1}.</span>
                      {r.product ? `${r.product.brand} ${r.product.name}` : r.item.label || categoryLabel[r.item.cat]}
                      <span className="ml-2 text-[12.5px] font-normal text-steel">{categoryLabel[r.item.cat]}</span>
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${color}`}>{tag}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-[13.5px] leading-6 text-steel">
                    {r.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                </li>
              );
            })}
          </ol>
          {(review.orderIssues.length > 0 || review.missing.length > 0) && (
            <ul className="mt-3 space-y-2 rounded-2xl bg-amber-wash p-4 text-[14px] leading-6 text-[#6B4300]">
              {review.orderIssues.map((x) => <li key={x}>순서: {x}</li>)}
              {review.missing.map((m) => <li key={m.cat}>빠진 단계: {m.why}</li>)}
            </ul>
          )}
          <h2 className="mt-10 text-[22px] font-bold tracking-[-0.03em]">그래서 이렇게 바꾸면 좋아요</h2>
          <p className="mt-2 text-[14px] text-steel">잘 맞는 제품은 다 쓸 때까지 그대로 쓰고, 그 단계는 다 쓴 다음에 아래 제품으로 바꾸면 돼요.</p>
        </section>
      )}

      <ol className="mt-10 divide-y divide-line border-y border-line">
        {picks.map((pk, idx) => {
          const p = pk.product;
          const alts = open === idx ? alternatives(idx) : [];
          return (
            <li key={idx} className="py-6">
              <div className="flex gap-4">
                <Link href={`/p/${p.id}/`} className="relative shrink-0 self-start" aria-label={`${p.brand} ${p.name} 성분 보기`}>
                  <ProductThumb p={p} className="h-[88px] w-[88px] sm:h-[120px] sm:w-[120px]" priority={idx < 2} />
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-lemon text-[13px] font-bold text-ink ring-2 ring-white">
                    {idx + 1}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[13px] font-semibold text-lemon-ink">
                      {categoryLabel[p.category]}
                      {p.category === "sun" ? ", 아침에만" : ""}
                    </p>
                    <p className="text-[15px] font-bold tabular-nums">
                      {won(p.price)}
                      {p.priceFrom && <span className="font-normal text-steel">~</span>}
                    </p>
                  </div>
                  <h2 className="mt-1 text-[19px] font-bold leading-snug tracking-[-0.02em]">
                    <Link href={`/brands/${encodeURIComponent(p.brand)}/`} className="text-steel hover:text-ink hover:underline">{p.brand}</Link> {p.name}
                  </h2>
                  <FitLine p={p} className="mt-1.5" />
                  {PX_BRANDS.has(p.brand) && <p className="mt-1 text-[12.5px] font-semibold text-lemon-ink" title={pxNote}>PX에서는 보통 더 싸게 살 수 있어요(지점마다 다름)</p>}
                  {keptName(p.category) && (
                    <p className="mt-2 rounded-lg bg-lemon-wash px-3 py-2 text-[13px] text-lemon-ink">
                      지금 쓰는 제품({keptName(p.category)})이 잘 맞아요. 다 쓸 때까지 그대로 쓰고, 다 쓰면 이걸로 바꿔요.
                    </p>
                  )}
                  <p className="mt-0.5 text-[13px] text-mist">
                    {p.volumeEstimated ? "용량 정보 없음" : `${p.volume}${/g/i.test(p.volumeText) ? "g" : "ml"}`}
                    {p.units > 1 ? ` × ${p.units}개 구성` : ""}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {pk.reasons.map((r) => (
                      <li key={r} className="rounded-md bg-lemon-wash px-2 py-1 text-[12.5px] font-medium text-lemon-ink">
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
                    <a onClick={() => track("click_buy", { id: p.id })} href={buyUrl(p.goodsNo)} target="_blank" rel="noopener noreferrer sponsored" className="rounded-lg bg-lemon px-3 py-2 font-medium text-ink hover:bg-lemon-deep">
                      올리브영에서 보기
                    </a>
                    <button type="button" onClick={() => setOpen(open === idx ? null : idx)} aria-expanded={open === idx} className="rounded-lg px-3 py-2 font-medium text-steel hover:text-ink">
                      {open === idx ? "후보 닫기" : "다른 후보"}
                    </button>
                  </div>
                  {open === idx && (
                    <div className="mt-3 rounded-2xl bg-fog p-3">
                      {alts.length === 0 && <p className="px-2 py-2 text-[14px] text-steel">이 조건에 맞는 다른 후보가 없어요.</p>}
                      {alts.map(({ p: ap, same }, ai) => (
                        <div key={ap.id}>
                        {same && !alts[ai - 1]?.same && <p className="px-3 pb-1 pt-3 text-[12.5px] font-semibold text-steel">같은 브랜드({ap.brand})에서 고르면</p>}
                        <button
                          type="button"
                          onClick={() => {
                            setSwaps({ ...swaps, [idx]: ap.id });
                            setOpen(null);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white"
                        >
                          <span className="flex min-w-0 items-center gap-3 text-[14.5px]">
                            <ProductThumb p={ap} size={48} />
                            <span className="min-w-0">
                              <span className="block"><span className="text-steel">{ap.brand}</span> <span className="font-semibold">{ap.name}</span></span>
                              <FitLine p={ap} className="mt-1" />
                            </span>
                          </span>
                          <span className="shrink-0 text-[13.5px] tabular-nums text-steel">{won(ap.price)}로 바꾸기</span>
                        </button>
                        </div>
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
      {totalNow < total && (
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[14px] text-steel">지금 살 것(잘 맞는 제품은 다 쓴 다음에)</span>
          <span className="text-[18px] font-bold tabular-nums">{won(totalNow)}</span>
        </div>
      )}

      {(() => {
        const order = buyOrder(toBuy, budget, answers);
        const over = totalNow > budget;
        if (order.length === 0) return null;
        return (
          <section className="mt-8 rounded-2xl border border-line p-5" aria-labelledby="buy-order-h">
            <h2 id="buy-order-h" className="text-[16px] font-bold tracking-[-0.02em]">{over ? "예산이 모자라면 이 순서로 사세요" : "한 번에 다 사기 부담되면 이 순서로"}</h2>
            <p className="mt-1 text-[13px] text-steel">피부에 미치는 영향이 큰 단계부터예요. 지금 쓰는 제품이 같은 단계에 있으면 다 쓸 때까지 그대로 써도 돼요.</p>
            <ol className="mt-4 space-y-3">
              {order.map((o) => (
                <li key={o.pick.product.id} className={`flex gap-3 ${o.withinBudget || budget >= 999999 ? "" : "opacity-60"}`}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lemon text-[12.5px] font-bold">{o.order}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
                      <span className="font-semibold">{categoryLabel[o.pick.product.category]} <span className="font-normal text-steel">{o.pick.product.brand} {o.pick.product.name}</span></span>
                      <span className="tabular-nums text-steel">누적 {won(o.cumulative)}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-steel">{o.why}</p>
                  </div>
                </li>
              ))}
            </ol>
            {over && budget < 999999 && (
              <p className="mt-4 text-[13px] text-steel">흐리게 표시된 단계부터 예산({won(budget)})을 넘어요. 앞 단계만으로 시작하고, 다 써갈 때 하나씩 더해도 충분해요.</p>
            )}
          </section>
        );
      })()}

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

      {answers.concerns.length > 0 && (
        <section className="mt-12" aria-labelledby="plan-h">
          <h2 id="plan-h" className="text-[19px] font-bold tracking-[-0.02em]">고민별로 이렇게 풀어가요</h2>
          <p className="mt-1 text-[13.5px] text-steel">화장품으로 할 수 있는 범위만 적었어요. 아래 &lsquo;이럴 땐&rsquo;에 해당하면 진료가 먼저예요.</p>
          <div className="mt-4 space-y-4">
            {answers.concerns.map((c) => {
              const pl = CONCERN_PLAN[c];
              const who = picks.filter((pk) => pk.product.concerns.includes(c));
              return (
                <article key={c} className="rounded-2xl border border-line p-5">
                  <h3 className="text-[16px] font-bold">{concernLabel[c]}: {pl.goal}</h3>
                  <p className="mt-2 text-[14px] leading-6">
                    <span className="font-semibold">맡는 성분</span> <span className="text-steel">{pl.ingredients}</span>
                  </p>
                  {who.length > 0 && (
                    <p className="mt-1 text-[14px] leading-6">
                      <span className="font-semibold">이 루틴에서는</span>{" "}
                      <span className="text-steel">{who.map((pk) => `${pk.product.brand} ${pk.product.name}`).join(", ")}</span>
                    </p>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[13px] font-semibold">쓰는 법</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13.5px] leading-6 text-steel">{pl.how.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">생활에서</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13.5px] leading-6 text-steel">{pl.habits.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-6"><span className="font-semibold">언제쯤</span> <span className="text-steel">{pl.when}</span></p>
                  <p className="mt-1 text-[13.5px] leading-6 text-rose"><span className="font-semibold">이럴 땐</span> {pl.stop}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {routine.special.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">가끔 더하면 좋은 것</h2>
          <p className="mt-1 text-[13.5px] text-steel">매일 할 필요는 없어요. 위 루틴에 익숙해진 다음, 고민이 신경 쓰이는 날 하나씩 더해 보세요. 합계엔 넣지 않았어요.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {routine.special.map((pk) => {
              const p = pk.product;
              const when = p.category === "patch" ? (/코팩|블랙헤드|돼지코/.test(p.fullName) ? "주 1회 정도" : "트러블 났을 때") : p.category === "pad" ? "주 2~3회 정도" : "주 1~2회 정도";
              return (
                <li key={p.id}>
                  <Link href={`/p/${p.id}/`} className="flex h-full gap-3 rounded-2xl border border-line p-4 hover:border-ink">
                    <ProductThumb p={p} size={64} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-lemon-ink">{categoryLabel[p.category]}, {when}</span>
                      <span className="mt-0.5 block text-[15px] font-bold leading-snug"><span className="font-medium text-steel">{p.brand}</span> {p.name}</span>
                      <FitLine p={p} className="mt-1.5" />
                      <span className="mt-1.5 block text-[13px] tabular-nums text-steel">{won(p.price)}{p.priceFrom ? "~" : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="sticky bottom-4 z-20 mt-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-[0_10px_30px_-12px_rgba(28,36,48,0.3)] backdrop-blur">
        <button type="button" onClick={save} className="btn-lemon flex-1">
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
