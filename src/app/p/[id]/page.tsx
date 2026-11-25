import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GROUPS } from "@/data/ingredients";
import { RESEARCH_DATE, advice, fitLine, byId, cautions, categoryLabel, keyBenefits, products, textureLabel } from "@/lib/model";
import FitLine from "@/components/FitLine";
import { pairsFor } from "@/lib/pairs";
import { daysToEmpty } from "@/lib/engine";
import ProductActions from "./ProductActions";
import PeerResults from "./PeerResults";
// 성분 분석 데이터만 근거로 만든 한 줄 요약(운영자 페이지에서 GPT 생성 + 과장 표현 검사)
import SUMMARY_RAW from "@/data/summaries.json";
const SUMMARY = SUMMARY_RAW as Record<string, string>;
import { oliveyoungUrl } from "@/lib/model";
import ProductThumb from "@/components/ProductThumb";
import { PX_BRANDS, pxNote } from "@/data/px";
import { brandHref } from "@/lib/brands";

export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = byId.get(params.id);
  if (!p) return {};
  return {
    title: `${p.brand} ${p.name} 전성분 분석 | 정함`,
    description: `${p.brand} ${p.name}의 전성분 ${p.ings.length}개 중 핵심 성분과 주의 성분, 대상 피부, 용량당 가격을 정리했어요.`,
  };
}

const won = (n: number) => `${n.toLocaleString()}원`;

export default function ProductPage({ params }: { params: { id: string } }) {
  const p = byId.get(params.id);
  if (!p) notFound();
  const price = p.price; // 정가 기준(판매처 할인가는 표시하지 않음)
  const totalVol = p.volume * p.units;
  const per10 = totalVol ? Math.round((price / totalVol) * (p.countUnit ? 1 : 10)) : null;
  const benefits = keyBenefits(p);
  const adv = advice(p);
  const fit = fitLine(p);
  const pairs = pairsFor(p);
  const warn = cautions(p);
  const posGroup = new Map<number, (typeof p.hits)[number]>();
  p.hits.forEach((h) => {
    if (!posGroup.has(h.pos) || GROUPS[h.group].kind === "caution") posGroup.set(h.pos, h);
  });
  const similar = products
    .filter((x) => x.id !== p.id && x.category === p.category && x.concerns.some((c) => p.concerns.includes(c)))
    .sort((a, b) => b.concerns.filter((c) => p.concerns.includes(c)).length - a.concerns.filter((c) => p.concerns.includes(c)).length || a.price - b.price)
    .slice(0, 4);

  return (
    <div className="page max-w-[1040px] pb-10 pt-8 sm:pt-12">
      <nav className="text-[13px] text-steel" aria-label="경로">
        <Link href="/products/" className="hover:text-ink">제품</Link>
        <span className="mx-1.5 text-mist">/</span>
        <Link href={`/products/?c=${p.category}`} className="hover:text-ink">{categoryLabel[p.category]}</Link>
      </nav>

      <header className="mt-4 grid gap-6 sm:grid-cols-[200px_1fr] sm:gap-8 lg:grid-cols-[240px_1fr_270px]">
        <ProductThumb p={p} priority className="mx-auto h-[220px] w-[220px] sm:mx-0 sm:h-[200px] sm:w-[200px] lg:h-[240px] lg:w-[240px]" />
        <div>
          <p className="text-[13px] font-semibold text-lemon-ink">{categoryLabel[p.category]}</p>
          <Link href={brandHref(p.brand)} className="mt-1 inline-block text-[15px] font-semibold text-steel underline-offset-4 hover:text-ink hover:underline">{p.brand} <span className="text-[13px] font-normal">브랜드 제품 모아보기</span></Link>
          <h1 className="mt-0.5 text-[28px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[34px]">{p.name}</h1>
          {SUMMARY[p.id] && <p className="mt-2 text-[16px] leading-7 text-steel">{SUMMARY[p.id]}</p>}
          <FitLine p={p} size="lg" className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
            <span className="rounded-full bg-fog px-3 py-1 text-steel">{textureLabel[p.texture]}</span>
            {p.fragranceFree && <span className="rounded-full bg-fog px-3 py-1 text-steel">향료 무첨가</span>}
            {p.forMen && <span className="rounded-full bg-fog px-3 py-1 text-steel">남성용</span>}
            {p.functional && !/해당\s*없음|해당사항\s*없음/.test(p.functional) && <span className="rounded-full bg-fog px-3 py-1 text-steel">기능성 화장품</span>}
            {PX_BRANDS.has(p.brand) && <span className="rounded-full bg-lemon-wash px-3 py-1 font-semibold text-lemon-ink" title={pxNote}>PX에서도 판매</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-line p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-[13px] text-steel">정가 ({RESEARCH_DATE} 조회)</p>
          <p className="mt-1 text-[26px] font-extrabold tabular-nums tracking-[-0.03em]">
            {won(price)}
            {p.priceFrom && <span className="text-[15px] font-semibold text-steel">~</span>}
          </p>
          {PX_BRANDS.has(p.brand) && <p className="mt-2 text-[12.5px] leading-5 text-steel">{pxNote}</p>}
          <dl className="mt-4 space-y-1.5 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-steel">용량</dt>
              <dd className="text-right">{p.volumeText || `${p.volume}ml`}{p.units > 1 && !/[xX×*]\s?\d|\d\s?\+\s?\d|\d\s?(개|입|ea)/i.test(p.volumeText) ? ` × ${p.units}` : ""}</dd>
            </div>
            {per10 && (
              <div className="flex justify-between gap-3">
                <dt className="text-steel">{p.countUnit ? `1${p.countUnit}당` : "10ml당"}</dt>
                <dd className="tabular-nums">{won(per10)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-steel">다 쓰는 데</dt>
              <dd>약 {daysToEmpty(p)}일</dd>
            </div>
          </dl>
          <ProductActions id={p.id} goodsNo={p.goodsNo} />
        </div>
      </header>

      <ProductActions id={p.id} goodsNo={p.goodsNo} fit />

      <section className="mt-8 overflow-hidden rounded-3xl border border-lemon-deep/30">
        <div className="bg-lemon px-6 py-5 text-ink sm:px-8">
          <p className="text-[13px] font-semibold text-ink/60">이런 피부에 맞아요</p>
          <p className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] sm:text-[26px]">{fit}</p>
        </div>
        <div className="grid gap-6 bg-white px-6 py-6 sm:grid-cols-3 sm:px-8">
          {[
            { t: "추천 대상", items: adv.good, tone: "text-lemon-ink" },
            { t: "이런 분은 주의", items: adv.careful.length ? adv.careful : ["크게 주의할 성분은 없어요"], tone: "text-amber" },
            { t: "이렇게 쓰세요", items: adv.howto, tone: "text-ink" },
          ].map((b) => (
            <div key={b.t}>
              <h2 className={`text-[14px] font-bold ${b.tone}`}>{b.t}</h2>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-6">
                {b.items.map((x) => (
                  <li key={x} className="relative pl-3.5 before:absolute before:left-0 before:top-[0.7em] before:h-1 before:w-1 before:rounded-full before:bg-current">{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <PeerResults id={p.id} />

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-fog px-5 py-4">
        <p className="text-[14px] leading-6 text-steel">사용 전후 사진이 담긴 실제 구매자 리뷰는 올리브영에서 볼 수 있어요. 정함은 리뷰 사진을 옮겨 오지 않아요(작성자의 사진이라서요).</p>
        <a href={`${oliveyoungUrl(p.goodsNo)}#review`} target="_blank" rel="noopener noreferrer" className="btn h-10 shrink-0 px-4 text-[14px]">올리브영 실제 리뷰 보기</a>
      </section>

      {pairs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">같이 쓰면 좋은 꿀조합</h2>
          <p className="mt-1 text-[13.5px] text-steel">피부과학회·임상 연구로 확인된 성분 궁합만 골랐어요. 광고·협찬 조합은 넣지 않아요.</p>
          <ul className="mt-5 grid gap-3 lg:grid-cols-3">
            {pairs.map((x) => (
              <li key={x.partner.id} className="flex flex-col rounded-2xl border border-line p-4">
                <p className="text-[13px] font-bold text-lemon-ink">{x.title}</p>
                <Link href={`/p/${x.partner.id}/`} className="mt-3 flex items-center gap-3 rounded-xl bg-fog/60 p-2.5 hover:bg-fog">
                  <ProductThumb p={x.partner} size={56} />
                  <span className="min-w-0">
                    <span className="block text-[12px] text-steel">{categoryLabel[x.partner.category]}, {x.partner.brand}</span>
                    <span className="block truncate text-[14.5px] font-semibold">{x.partner.name}</span>
                    <FitLine p={x.partner} className="mt-1" />
                  </span>
                </Link>
                <p className="mt-3 flex-1 text-[13.5px] leading-6 text-ink/80">{x.why}</p>
                <a href={x.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 text-[12px] text-mist underline underline-offset-2 hover:text-ink">
                  근거: {x.source.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">꼭 확인할 성분</h2>
        <p className="mt-1 text-[13.5px] text-steel">전성분 {p.ings.length}개 중 효과와 자극에 영향을 주는 것만 골랐어요. 순서가 앞일수록 많이 들어 있어요.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {benefits.slice(0, 4).map((h) => (
            <div key={h.group} className="rounded-2xl bg-lemon-wash/60 p-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-[15.5px] font-bold text-lemon-ink">{GROUPS[h.group].label}</span>
                <span className="shrink-0 text-[12px] font-semibold text-lemon-ink/70">{h.pos < 5 ? "주성분" : h.pos < 15 ? "많이 들어 있음" : "소량"}</span>
              </p>
              <p className="mt-1 text-[14px] leading-6 text-ink/80">{GROUPS[h.group].note}</p>
            </div>
          ))}
          {warn.map((h) => (
            <div key={h.group} className="rounded-2xl bg-amber-wash p-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-[15.5px] font-bold text-amber">{GROUPS[h.group].label}</span>
                <span className="shrink-0 text-[12px] font-semibold text-amber/80">주의</span>
              </p>
              <p className="mt-1 text-[14px] leading-6 text-ink/80">{GROUPS[h.group].note}</p>
            </div>
          ))}
          {p.category === "sun" && p.sunFilter && (
            <div className="rounded-2xl bg-fog p-4">
              <p className="text-[15.5px] font-bold">{p.sunFilter === "mineral" ? "무기자차" : p.sunFilter === "chemical" ? "유기자차" : "혼합자차"}</p>
              <p className="mt-1 text-[14px] leading-6 text-ink/80">{p.sunFilter === "chemical" ? "백탁이 적고 가벼운 편이지만 눈가에 닿으면 시릴 수 있어요." : p.sunFilter === "mineral" ? "눈 시림이 덜한 편이지만 백탁이 생길 수 있어요." : "두 방식을 섞어 백탁과 눈 시림을 줄인 타입이에요."}</p>
            </div>
          )}
          {benefits.length === 0 && warn.length === 0 && <p className="text-[14px] text-steel">정함 성분 사전에 있는 효능·주의 성분을 찾지 못했어요.</p>}
        </div>
        {benefits.length > 4 && (
          <p className="mt-3 text-[13px] text-steel">그 밖에 {benefits.slice(4).map((h) => GROUPS[h.group].label).join(", ")}도 들어 있어요.</p>
        )}

        <details className="group mt-6 rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14.5px] font-semibold">
            전성분 {p.ings.length}개 모두 보기
            <span className="text-steel transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-line px-5 py-4">
            <p className="text-[13px] text-steel">함량이 많은 순서예요. 1% 이하 성분은 순서가 바뀔 수 있어요. 색이 있는 칸이 위에서 설명한 성분이에요.</p>
            <ol className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
              {p.ings.map((ing, i) => {
                const h = posGroup.get(i);
                const kind = h ? GROUPS[h.group].kind : null;
                return (
                  <li key={i} title={h ? GROUPS[h.group].label : undefined} className={`rounded-md px-2 py-1 ${kind === "benefit" ? "bg-lemon-wash text-lemon-ink" : kind === "caution" ? "bg-amber-wash text-amber" : kind === "uv" ? "bg-fog font-medium" : "bg-fog/60 text-steel"}`}>
                    {ing}
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      </section>

      <section className="mt-12">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">상품 정보 고시</h2>
        <dl className="mt-4 divide-y divide-line border-y border-line text-[14px]">
          {[
            ["사용 대상 피부", p.spec || "표기 없음"],
            ["기능성 심사", p.functional || "표기 없음"],
            ["제조업자", p.maker || "표기 없음"],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
              <dt className="text-steel">{k}</dt>
              <dd className="leading-6">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12.5px] text-mist">올리브영 상품 상세정보의 화장품 정보 고시 내용을 {RESEARCH_DATE}에 옮겨 왔어요.</p>
      </section>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">비슷한 고민의 {categoryLabel[p.category]}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {similar.map((x) => (
              <li key={x.id}>
                <Link href={`/p/${x.id}/`} className="flex items-center gap-4 rounded-2xl border border-line p-3 hover:border-ink">
                  <ProductThumb p={x} size={64} />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-steel">{x.brand}</span>
                    <span className="block truncate text-[15px] font-semibold">{x.name}</span>
                    <FitLine p={x} className="mt-1" />
                    <span className="mt-1 block text-[13.5px] tabular-nums text-steel">{won(x.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
