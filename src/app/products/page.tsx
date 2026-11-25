"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { GROUPS, type IngGroup } from "@/data/ingredients";
import { categoryLabel, concernLabel, keyBenefits, products, textureLabel, type Category, type Concern, type Product, type SkinType } from "@/lib/model";
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

const priceOf = (p: Product) => p.price; // 정가 기준
const unit = (p: Product) => (priceOf(p) / Math.max(1, p.volume * p.units)) * (p.countUnit ? 1 : 10);
const hasEarly = (p: Product, g: IngGroup) => p.hits.some((h) => h.group === g && h.pos < 25);
const hasAvoid = (p: Product, g: IngGroup) => (g === "alcohol" ? p.hits.some((h) => h.group === "alcohol" && h.pos < 6) : p.groups.has(g));

const PER_PAGE = 24;
const SUN_LABEL: Record<string, string> = { mineral: "무기자차", chemical: "유기자차", hybrid: "혼합자차" };

/** 카드에 보여줄 한눈 정보: 핵심 성분 최대 3개(성분표 앞쪽 15번째 안), 순함·주의 표시 */
function glance(p: Product) {
  const ings = keyBenefits(p).filter((h) => h.pos < 15).slice(0, 3).map((h) => GROUPS[h.group].label.replace(/\(.*\)/, ""));
  const gentle = p.irritation === 0 && p.activeStrong.length === 0;
  const flags: { t: string; tone: "good" | "warn" | "plain" }[] = [];
  if (p.category === "sun" && p.sunFilter) flags.push({ t: SUN_LABEL[p.sunFilter], tone: "plain" });
  if (gentle) flags.push({ t: "순한 편", tone: "good" });
  else if (p.irritation >= 3) flags.push({ t: "자극 가능 성분", tone: "warn" });
  if (p.fragranceFree) flags.push({ t: "무향", tone: "good" });
  if (p.activeStrong.includes("retinoid")) flags.push({ t: "저녁 전용", tone: "warn" });
  else if (p.activeStrong.length) flags.push({ t: "각질 케어", tone: "warn" });
  return { ings, flags };
}

function Pager({ page, pages, go }: { page: number; pages: number; go: (n: number) => void }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  const btn = "flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-[14px] font-semibold";
  return (
    <nav aria-label="페이지" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" onClick={() => go(page - 1)} disabled={page === 1} className={`${btn} bg-fog text-steel disabled:opacity-40`}>이전</button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-mist">…</span>}
          <button type="button" onClick={() => go(n)} aria-current={n === page ? "page" : undefined} className={`${btn} ${n === page ? "bg-ink text-white" : "bg-fog text-steel hover:text-ink"}`}>{n}</button>
        </span>
      ))}
      <button type="button" onClick={() => go(page + 1)} disabled={page === pages} className={`${btn} bg-fog text-steel disabled:opacity-40`}>다음</button>
    </nav>
  );
}

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
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

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

  // 필터·정렬이 바뀌면 첫 페이지로
  useEffect(() => setPage(1), [list]);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const go = (n: number) => {
    setPage(Math.min(pages, Math.max(1, n)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            <Group title="가격대" hint="정가 기준">
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
          <div ref={topRef} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-steel" aria-live="polite">
              <b className="text-ink">{list.length}</b>개{pages > 1 && ` 중 ${(page - 1) * PER_PAGE + 1}~${Math.min(page * PER_PAGE, list.length)}`}
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
            <>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {shown.map((p) => {
                const g = glance(p);
                return (
                  <li key={p.id}>
                    <Link href={`/p/${p.id}/`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-ink">
                      <span className="relative block bg-fog/70 p-4">
                        <ProductThumb p={p} className="mx-auto h-28 w-28 sm:h-36 sm:w-36" />
                        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1 text-[11px] font-semibold">
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-ink ring-1 ring-line">{categoryLabel[p.category]}</span>
                          {p.forMen && <span className="rounded-md bg-ink px-1.5 py-0.5 text-white">남성용</span>}
                          {!!p.functional && !/해당\s*없음|해당사항\s*없음|없음/.test(p.functional) && <span className="rounded-md bg-lemon px-1.5 py-0.5 text-ink">기능성</span>}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col p-3.5 sm:p-4">
                        <span className="text-[12.5px] text-steel">{p.brand}</span>
                        <span className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[14.5px] font-semibold leading-[1.3]">{p.name}</span>
                        <FitLine p={p} className="mt-2 self-start" />
                        {p.concerns.length > 0 && (
                          <span className="mt-2.5 block text-[12px] text-steel">
                            <span className="font-semibold text-ink">효과</span> {p.concerns.slice(0, 3).map((c) => concernLabel[c]).join(" · ")}
                          </span>
                        )}
                        {g.ings.length > 0 && (
                          <span className="mt-1 block text-[12px] text-steel">
                            <span className="font-semibold text-ink">핵심 성분</span> {g.ings.join(" · ")}
                          </span>
                        )}
                        <span className="mt-2 flex flex-wrap gap-1 text-[11.5px] font-medium">
                          <span className="rounded bg-fog px-1.5 py-0.5 text-steel">{textureLabel[p.texture]}</span>
                          {g.flags.map((f) => (
                            <span key={f.t} className={`rounded px-1.5 py-0.5 ${f.tone === "good" ? "bg-lemon-wash text-lemon-ink" : f.tone === "warn" ? "bg-amber-wash text-amber" : "bg-fog text-steel"}`}>{f.t}</span>
                          ))}
                        </span>
                        <span className="mt-auto flex items-baseline justify-between gap-2 pt-3">
                          <span className="text-[16px] font-bold tabular-nums">{priceOf(p).toLocaleString()}원</span>
                          <span className="text-[11.5px] tabular-nums text-mist">{p.countUnit ? `1${p.countUnit}당` : "10ml당"} {Math.round(unit(p)).toLocaleString()}원</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} pages={pages} go={go} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
