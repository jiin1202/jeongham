import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GROUPS } from "@/data/ingredients";
import { RESEARCH_DATE, byId, cautions, categoryLabel, concernLabel, keyBenefits, products } from "@/lib/model";
import { daysToEmpty } from "@/lib/engine";
import ProductActions from "./ProductActions";
import ProductThumb from "@/components/ProductThumb";

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
  const price = p.salePrice ?? p.price;
  const totalVol = p.volume * p.units;
  const per10 = totalVol ? Math.round((price / totalVol) * 10) : null;
  const benefits = keyBenefits(p);
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
        <ProductThumb src={p.image} brand={p.brand} name={p.name} priority className="mx-auto h-[220px] w-[220px] sm:mx-0 sm:h-[200px] sm:w-[200px] lg:h-[240px] lg:w-[240px]" />
        <div>
          <p className="text-[15px] font-semibold text-steel">{p.brand}</p>
          <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[36px]">{p.name}</h1>
          <div className="mt-4 flex flex-wrap gap-1.5 text-[13px]">
            {p.concerns.map((c) => (
              <span key={c} className="rounded-full bg-teal-wash px-3 py-1 font-medium text-teal-deep">{concernLabel[c]}</span>
            ))}
            {p.fragranceFree && <span className="rounded-full bg-fog px-3 py-1 text-steel">향료 무첨가</span>}
            {p.forMen && <span className="rounded-full bg-fog px-3 py-1 text-steel">남성용</span>}
            {p.functional && !/해당\s*없음|해당사항\s*없음/.test(p.functional) && <span className="rounded-full bg-fog px-3 py-1 text-steel">기능성 화장품</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-line p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-[13px] text-steel">조회가 ({RESEARCH_DATE})</p>
          <p className="mt-1 text-[26px] font-extrabold tabular-nums tracking-[-0.03em]">
            {won(price)}
            {p.priceFrom && <span className="text-[15px] font-semibold text-steel">~</span>}
          </p>
          {p.salePrice && p.salePrice < p.price && <p className="text-[13px] text-mist line-through">{won(p.price)}</p>}
          <dl className="mt-4 space-y-1.5 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-steel">용량</dt>
              <dd className="text-right">{p.volumeText || `${p.volume}ml`}{p.units > 1 && !/[xX×*]\s?\d|\d\s?\+\s?\d|\d\s?(개|입|ea)/i.test(p.volumeText) ? ` × ${p.units}` : ""}</dd>
            </div>
            {per10 && (
              <div className="flex justify-between gap-3">
                <dt className="text-steel">10ml당</dt>
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

      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">들어 있는 핵심 성분</h2>
          {benefits.length === 0 ? (
            <p className="mt-3 text-[14px] text-steel">정함 성분 사전에 있는 효능 성분은 찾지 못했어요.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {benefits.map((h) => (
                <li key={h.group}>
                  <p className="text-[15px] font-semibold">
                    {GROUPS[h.group].label}
                    <span className="ml-2 text-[12.5px] font-normal text-steel">{h.pos + 1}번째 · {h.ing}</span>
                  </p>
                  <p className="mt-0.5 text-[14px] leading-6 text-steel">{GROUPS[h.group].note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">예민하면 확인할 성분</h2>
          {warn.length === 0 ? (
            <p className="mt-3 text-[14px] leading-6 text-steel">향료, 알레르기 유발 향 성분, 앞쪽 에탄올, 에센셜 오일, 멘톨이 없어요.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {warn.map((h) => (
                <li key={h.group}>
                  <p className="text-[15px] font-semibold">
                    {GROUPS[h.group].label}
                    <span className="ml-2 text-[12.5px] font-normal text-steel">{h.pos + 1}번째 · {h.ing}</span>
                  </p>
                  <p className="mt-0.5 text-[14px] leading-6 text-steel">{GROUPS[h.group].note}</p>
                </li>
              ))}
            </ul>
          )}
          {p.category === "sun" && p.sunFilter && (
            <p className="mt-5 rounded-xl bg-fog px-4 py-3 text-[14px] leading-6">
              자외선 차단 방식: <b>{p.sunFilter === "mineral" ? "무기자차" : p.sunFilter === "chemical" ? "유기자차" : "혼합자차"}</b>
              <span className="block text-steel">{p.sunFilter === "chemical" ? "백탁이 적고 가벼운 편이지만 눈가에 닿으면 시릴 수 있어요." : p.sunFilter === "mineral" ? "눈 시림이 덜한 편이지만 백탁이 생길 수 있어요." : "두 방식을 섞어 백탁과 눈 시림을 줄인 타입이에요."}</span>
            </p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">전성분 {p.ings.length}개</h2>
        <p className="mt-1 text-[13.5px] text-steel">함량이 많은 순서예요. 1% 이하 성분은 순서가 바뀔 수 있어요.</p>
        <ol className="mt-4 flex flex-wrap gap-1.5 text-[13.5px]">
          {p.ings.map((ing, i) => {
            const h = posGroup.get(i);
            const kind = h ? GROUPS[h.group].kind : null;
            return (
              <li
                key={i}
                title={h ? GROUPS[h.group].label : undefined}
                className={`rounded-md px-2 py-1 ${kind === "benefit" ? "bg-teal-wash text-teal-deep" : kind === "caution" ? "bg-amber-wash text-amber" : kind === "uv" ? "bg-fog font-medium" : "bg-fog/60 text-steel"}`}
              >
                {ing}
              </li>
            );
          })}
        </ol>
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
                  <ProductThumb src={x.image} brand={x.brand} name={x.name} size={64} />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-steel">{x.brand}</span>
                    <span className="block truncate text-[15px] font-semibold">{x.name}</span>
                    <span className="mt-1 block text-[13.5px] tabular-nums text-steel">{won(x.salePrice ?? x.price)}</span>
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
