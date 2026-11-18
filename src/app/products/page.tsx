"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { categoryLabel, concernLabel, products, type Category, type Concern, type SkinType } from "@/lib/model";
import { skinTypeLabel } from "@/lib/quiz";

const cats: (Category | "all")[] = ["all", "cleanser", "toner", "serum", "moisturizer", "allinone", "sun"];
const concerns = Object.keys(concernLabel) as Concern[];
const skins: SkinType[] = ["oily", "combo", "dry", "normal"];
type Sort = "rank" | "price" | "unit" | "gentle";
const sorts: { v: Sort; label: string }[] = [
  { v: "rank", label: "인기순" },
  { v: "price", label: "낮은 가격순" },
  { v: "unit", label: "용량 대비 가격순" },
  { v: "gentle", label: "순한 성분순" },
];

const unit = (p: (typeof products)[number]) => ((p.salePrice ?? p.price) / Math.max(1, p.volume * p.units)) * 10;

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [con, setCon] = useState<Concern[]>([]);
  const [skin, setSkin] = useState<SkinType | null>(null);
  const [noFrag, setNoFrag] = useState(false);
  const [men, setMen] = useState(false);
  const [sort, setSort] = useState<Sort>("rank");

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("c") as Category | null;
    if (c && cats.includes(c)) setCat(c);
  }, []);

  const list = useMemo(() => {
    const k = q.trim().replace(/\s/g, "").toLowerCase();
    const out = products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        con.every((c) => p.concerns.includes(c)) &&
        (!skin || p.skin.includes(skin)) &&
        (!noFrag || p.fragranceFree) &&
        (!men || p.forMen) &&
        (!k || (p.brand + p.name + p.ingredients).replace(/\s/g, "").toLowerCase().includes(k))
    );
    const by: Record<Sort, (a: (typeof out)[number], b: (typeof out)[number]) => number> = {
      rank: (a, b) => a.rank - b.rank,
      price: (a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price),
      unit: (a, b) => unit(a) - unit(b),
      gentle: (a, b) => a.irritation - b.irritation || a.rank - b.rank,
    };
    return out.sort(by[sort]);
  }, [q, cat, con, skin, noFrag, men, sort]);

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-medium ${on ? "bg-teal-deep text-white" : "bg-fog text-steel hover:text-ink"}`;
  const reset = () => {
    setQ("");
    setCat("all");
    setCon([]);
    setSkin(null);
    setNoFrag(false);
    setMen(false);
  };

  return (
    <div className="page pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">제품 {products.length}개, 전성분까지 열어봤어요</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-steel">올리브영 스킨케어·클렌징·선케어·맨즈 랭킹에 오른 제품이에요. 성분 이름으로도 찾을 수 있어요.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6" aria-label="필터">
          <div>
            <label htmlFor="pq" className="text-[13px] font-semibold">검색</label>
            <input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드, 제품명, 성분" className="mt-2 h-11 w-full rounded-xl border border-line px-4 text-[15px] outline-none placeholder:text-mist focus:border-teal" />
          </div>
          <fieldset>
            <legend className="text-[13px] font-semibold">종류</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>
                  {c === "all" ? "전체" : categoryLabel[c]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold">고민 성분</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {concerns.map((c) => {
                const on = con.includes(c);
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => setCon(on ? con.filter((x) => x !== c) : [...con, c])} className={chip(on)}>
                    {concernLabel[c]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] font-semibold">제조사 표기 피부</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skins.map((s) => (
                <button key={s} type="button" aria-pressed={skin === s} onClick={() => setSkin(skin === s ? null : s)} className={chip(skin === s)}>
                  {skinTypeLabel[s]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2 text-[14px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={noFrag} onChange={(e) => setNoFrag(e.target.checked)} className="h-4 w-4 accent-teal" />
              향료 없는 제품만
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={men} onChange={(e) => setMen(e.target.checked)} className="h-4 w-4 accent-teal" />
              남성 전용 제품만
            </label>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-steel" aria-live="polite">{list.length}개</p>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="sr-only">정렬</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-xl border border-line px-3">
                {sorts.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </label>
          </div>
          {list.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-14 text-center text-[15px] text-steel">
              조건에 맞는 제품이 없어요.{" "}
              <button type="button" onClick={reset} className="font-semibold text-ink underline underline-offset-4">필터 초기화</button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {list.map((p) => (
                <li key={p.id}>
                  <Link href={`/p/${p.id}/`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 hover:bg-fog/50 sm:px-2">
                    <ProductThumb src={p.image} brand={p.brand} name={p.name} className="h-16 w-16 sm:h-20 sm:w-20" />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] text-steel">{categoryLabel[p.category]}, {p.brand}</span>
                      <span className="block truncate text-[15.5px] font-semibold">{p.name}</span>
                      <FitLine p={p} className="mt-1" />
                      <span className="mt-1 flex flex-wrap gap-1 text-[12px]">
                        {p.concerns.slice(0, 3).map((c) => <span key={c} className="rounded bg-teal-wash px-1.5 py-0.5 text-teal-deep">{concernLabel[c]}</span>)}
                        {p.irritation >= 3 && <span className="rounded bg-amber-wash px-1.5 py-0.5 text-amber">자극 가능 성분</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[15px] font-bold tabular-nums">{(p.salePrice ?? p.price).toLocaleString()}원</span>
                      <span className="block text-[12px] tabular-nums text-mist">10ml당 {Math.round(unit(p)).toLocaleString()}원</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
