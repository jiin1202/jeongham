import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { brands, productsOf } from "@/lib/brands";
import { categoryLabel, concernLabel, type Category } from "@/lib/model";
import { PX_BRANDS, pxNote } from "@/data/px";

const ORDER: Category[] = ["cleanser", "toner", "pad", "serum", "moisturizer", "allinone", "sun", "sheet", "pack", "patch"];
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export function generateStaticParams() {
  return brands.map((b) => ({ name: b.name }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const name = decode(params.name);
  return { title: `${name} 제품 모아보기 | 정함`, description: `${name} 제품을 종류별로 모아 전성분, 대상 피부, 정가를 정리했어요.` };
}

export default function BrandPage({ params }: { params: { name: string } }) {
  const name = decode(params.name);
  const list = productsOf(name);
  if (!list.length) notFound();
  const groups = ORDER.map((c) => ({ c, items: list.filter((p) => p.category === c) })).filter((g) => g.items.length);
  const prices = list.map((p) => p.price);
  return (
    <div className="page pb-10 pt-10 sm:pt-14">
      <Link href="/brands/" className="text-[14px] text-steel hover:text-ink">브랜드 전체</Link>
      <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">{name}</h1>
      <p className="mt-3 text-[15px] leading-7 text-steel">
        제품 {list.length}개, 정가 {Math.min(...prices).toLocaleString()}원~{Math.max(...prices).toLocaleString()}원
        {groups.length > 1 ? `. ${groups.map((g) => `${categoryLabel[g.c]} ${g.items.length}`).join(", ")}` : ""}
      </p>
      {PX_BRANDS.has(name) && <p className="mt-3 rounded-xl bg-lemon-wash px-4 py-3 text-[14px] text-lemon-ink">{pxNote}</p>}

      <nav aria-label="종류로 이동" className="mt-6 flex flex-wrap gap-1.5">
        {groups.map((g) => (
          <a key={g.c} href={`#${g.c}`} className="rounded-full bg-fog px-3 py-1.5 text-[13px] font-medium text-steel hover:text-ink">{categoryLabel[g.c]} {g.items.length}</a>
        ))}
      </nav>

      {groups.map((g) => (
        <section key={g.c} id={g.c} className="mt-10 scroll-mt-24">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">{categoryLabel[g.c]}</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {g.items.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}/`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 hover:bg-fog/50">
                  <ProductThumb p={p} className="h-16 w-16 sm:h-20 sm:w-20" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15.5px] font-semibold">{p.name}</span>
                    <FitLine p={p} className="mt-1" />
                    <span className="mt-1 flex flex-wrap gap-1 text-[12px]">
                      {p.forMen && <span className="rounded bg-fog px-1.5 py-0.5 text-steel">남성용</span>}
                      {p.concerns.slice(0, 3).map((c) => <span key={c} className="rounded bg-lemon-wash px-1.5 py-0.5 text-lemon-ink">{concernLabel[c]}</span>)}
                      {p.irritation >= 3 && <span className="rounded bg-amber-wash px-1.5 py-0.5 text-amber">자극 가능 성분</span>}
                    </span>
                  </span>
                  <span className="text-right text-[15px] font-bold tabular-nums">{p.price.toLocaleString()}원{p.priceFrom ? "~" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
