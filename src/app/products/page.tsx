"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { GROUPS, type IngGroup } from "@/data/ingredients";
import { categoryLabel, concernLabel, products, textureLabel, type Category, type Concern, type Product, type SkinType } from "@/lib/model";
import { skinTypeLabel } from "@/lib/quiz";

const cats: (Category | "all")[] = ["all", "cleanser", "toner", "serum", "moisturizer", "allinone", "sun", "pad", "sheet", "pack", "patch"];
const concerns = Object.keys(concernLabel) as Concern[];
const skins: SkinType[] = ["oily", "combo", "dry", "normal"];
const textures: Product["texture"][] = ["light", "mid", "rich"];
const prices = [
  { v: "u10", label: "1만 원 미만", ok: (n: number) => n < 10000 },
  { v: "10-20", label: "1~2만 원", ok: (n: number) => n >= 10000 && n < 20000 },
  { v: "20-30", label: "2~3만 원", ok: (n: number) => n >= 20000 && n < 30000 },
  { v: "30+", label: "3만 원 이상", ok: (n: number) => n >= 30000 },
];
// 들어 있었으면 하는 성분(앞쪽 25번째 안에 있을 때만 인정)
const WANT: IngGroup[] = ["niacinamide", "cica", "panthenol", "ceramide", "hyaluronic", "bha", "retinoid", "vitc", "teatree", "zinc"];
// 빼고 싶은 성분
const AVOID: IngGroup[] = ["fragrance", "allergen", "alcohol", "essentialoil", "menthol"];
const SUN = [
  { v: "mineral", label: "무기자차" },
  { v: "chemical", label: "유기자차" },
  { v: "hybrid", label: "혼합자차" },
] as const;

type Sort = "rank" | "price" | "unit" | "gentle";
const sorts: { v: Sort; label: string }[] = [
  { v: "rank", label: "인기순" },
  { v: "price", label: "낮은 가격순" },
  { v: "unit", label: "용량 대비 가격순" },
  { v: "gentle", label: "순한 성분순" },
];

const priceOf = (p: Product) => p.salePrice ?? p.price;
const unit = (p: Product) => (priceOf(p) / Math.max(1, p.volume * p.units)) * (p.countUnit ? 1 : 10);
const hasEarly = (p: Product, g: IngGroup) => p.hits.some((h) => h.group === g && h.pos < 25);
const hasAvoid = (p: Product, g: IngGroup) => (g === "alcohol" ? p.hits.some((h) => h.group === "alcohol" && h.pos < 6) : p.groups.has(g));

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-bold">{title}</legend>
      {hint && <p className="mt-0.5 text-[12px] text-mist">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [con, setCon] = useState<Concern[]>([]);
  const [skin, setSkin] = useState<SkinType | null>(null);
  const [tex, setTex] = useState<Product["texture"][]>([]);
  const [price, setPrice] = useState<string[]>([]);
  const [want, setWant] = useState<IngGroup[]>([]);
  const [avoid, setAvoid] = useState<IngGroup[]>([]);
  const [sun, setSun] = useState<string[]>([]);
  const [gentle, setGentle] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [men, setMen] = useState(false);
  const [sort, setSort] = useState<Sort>("rank");
  const [open, setOpen] = useState(false);

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
        (tex.length === 0 || tex.includes(p.texture)) &&
        (price.length === 0 || prices.some((r) => price.includes(r.v) && r.ok(priceOf(p)))) &&
        want.every((g) => hasEarly(p, g)) &&
        avoid.every((g) => !hasAvoid(p, g)) &&
        (sun.length === 0 || (p.category === "sun" && !!p.sunFilter && sun.includes(p.sunFilter))) &&
        (!gentle || (p.irritation === 0 && p.activeStrong.length === 0)) &&
        (!functional || (!!p.functional && !/해당\s*없음|해당사항\s*없음|없음/.test(p.functional))) &&
        (!men || p.forMen) &&
        (!k || (p.brand + p.name + p.ingredients).replace(/\s/g, "").toLowerCase().includes(k))
    );
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      rank: (a, b) => a.rank - b.rank,
      price: (a, b) => priceOf(a) - priceOf(b),
      unit: (a, b) => unit(a) - unit(b),
      gentle: (a, b) => a.irritation - b.irritation || a.rank - b.rank,
    };
    return out.sort(by[sort]);
  }, [q, cat, con, skin, tex, price, want, avoid, sun, gentle, functional, men, sort]);

  const active = con.length + (skin ? 1 : 0) + tex.length + price.length + want.length + avoid.length + sun.length + (gentle ? 1 : 0) + (functional ? 1 : 0) + (men ? 1 : 0);
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-medium ${on ? "bg-lemon text-ink" : "bg-fog text-steel hover:text-ink"}`;
  const reset = () => {
    setQ("");
    setCat("all");
    setCon([]);
    setSkin(null);
    setTex([]);
    setPrice([]);
    setWant([]);
    setAvoid([]);
    setSun([]);
    setGentle(false);
    setFunctional(false);
    setMen(false);
  };

  return (
    <div className="page pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">제품 {products.length}개, 전성분까지 열어봤어요</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-steel">제형, 가격, 넣고 싶은 성분과 빼고 싶은 성분으로 좁혀 보세요. 성분 이름으로도 찾을 수 있어요.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="필터">
          <div>
            <label htmlFor="pq" className="text-[13px] font-bold">검색</label>
            <input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드, 제품명, 성분" className="mt-2 h-11 w-full rounded-xl border border-line px-4 text-[15px] outline-none placeholder:text-mist focus:border-lemon-deep" />
          </div>
          <div className="mt-5">
            <Group title="종류">
              {cats.map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>
                  {c === "all" ? "전체" : categoryLabel[c]}
                </button>
              ))}
            </Group>
          </div>

          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-5 flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-[14px] font-semibold lg:hidden">
            상세 필터{active > 0 ? ` ${active}개 적용` : ""}
            <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
          </button>

          <div className={`mt-5 space-y-6 ${open ? "block" : "hidden"} lg:block`}>
            <Group title="제형">
              {textures.map((t) => (
                <button key={t} type="button" aria-pressed={tex.includes(t)} onClick={() => setTex(toggle(tex, t))} className={chip(tex.includes(t))}>
                  {textureLabel[t].replace(" 제형", "")}
                </button>
              ))}
            </Group>
            <Group title="가격대" hint="올리브영 조회가 기준">
              {prices.map((r) => (
                <button key={r.v} type="button" aria-pressed={price.includes(r.v)} onClick={() => setPrice(toggle(price, r.v))} className={chip(price.includes(r.v))}>
                  {r.label}
                </button>
              ))}
            </Group>
            <Group title="피부 고민">
              {concerns.map((c) => (
                <button key={c} type="button" aria-pressed={con.includes(c)} onClick={() => setCon(toggle(con, c))} className={chip(con.includes(c))}>
                  {concernLabel[c]}
                </button>
              ))}
            </Group>
            <Group title="제조사 표기 피부">
              {skins.map((s) => (
                <button key={s} type="button" aria-pressed={skin === s} onClick={() => setSkin(skin === s ? null : s)} className={chip(skin === s)}>
                  {skinTypeLabel[s]}
                </button>
              ))}
            </Group>
            <Group title="들어 있으면 좋겠는 성분" hint="성분표 앞쪽(25번째 안)에 있는 제품만">
              {WANT.map((g) => (
                <button key={g} type="button" aria-pressed={want.includes(g)} onClick={() => setWant(toggle(want, g))} className={chip(want.includes(g))}>
                  {GROUPS[g].label}
                </button>
              ))}
            </Group>
            <Group title="빼고 싶은 성분">
              {AVOID.map((g) => (
                <button key={g} type="button" aria-pressed={avoid.includes(g)} onClick={() => setAvoid(toggle(avoid, g))} className={chip(avoid.includes(g))}>
                  {GROUPS[g].label}
                </button>
              ))}
            </Group>
            {(cat === "all" || cat === "sun") && (
              <Group title="자외선 차단 방식">
                {SUN.map((s) => (
                  <button key={s.v} type="button" aria-pressed={sun.includes(s.v)} onClick={() => setSun(toggle(sun, s.v))} className={chip(sun.includes(s.v))}>
                    {s.label}
                  </button>
                ))}
              </Group>
            )}
            <div className="space-y-2.5 text-[14px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={gentle} onChange={(e) => setGentle(e.target.checked)} className="h-4 w-4 accent-lemon-deep" />
                자극 가능 성분 없는 순한 제품만
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={functional} onChange={(e) => setFunctional(e.target.checked)} className="h-4 w-4 accent-lemon-deep" />
                기능성 화장품만
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={men} onChange={(e) => setMen(e.target.checked)} className="h-4 w-4 accent-lemon-deep" />
                남성 전용 제품만
              </label>
            </div>
            {active > 0 && (
              <button type="button" onClick={reset} className="text-[13px] font-semibold text-lemon-ink underline underline-offset-4">
                필터 모두 지우기
              </button>
            )}
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-steel" aria-live="polite">
              <b className="text-ink">{list.length}</b>개
            </p>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="sr-only">정렬</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-xl border border-line px-3">
                {sorts.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </label>
          </div>
          {list.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-14 text-center text-[15px] text-steel">
              조건에 맞는 제품이 없어요. 필터를 몇 개 빼 보세요.{" "}
              <button type="button" onClick={reset} className="font-semibold text-lemon-ink underline underline-offset-4">모두 지우기</button>
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
                        <span className="rounded bg-fog px-1.5 py-0.5 text-steel">{textureLabel[p.texture]}</span>
                        {p.concerns.slice(0, 3).map((c) => <span key={c} className="rounded bg-lemon-wash px-1.5 py-0.5 text-lemon-ink">{concernLabel[c]}</span>)}
                        {p.irritation >= 3 && <span className="rounded bg-amber-wash px-1.5 py-0.5 text-amber">자극 가능 성분</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[15px] font-bold tabular-nums">{priceOf(p).toLocaleString()}원</span>
                      <span className="block text-[12px] tabular-nums text-mist">{p.countUnit ? `1${p.countUnit}당` : "10ml당"} {Math.round(unit(p)).toLocaleString()}원</span>
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
