"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type Row = { name: string; count: number; px: boolean };
const brandHref = (b: string) => `/brands/${encodeURIComponent(b)}/`;

export default function BrandList({ brands }: { brands: Row[] }) {
  const [q, setQ] = useState("");
  const [px, setPx] = useState(false);
  const list = useMemo(() => {
    const k = q.trim().replace(/\s/g, "").toLowerCase();
    return brands.filter((b) => (!k || b.name.replace(/\s/g, "").toLowerCase().includes(k)) && (!px || b.px));
  }, [q, px, brands]);
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label htmlFor="bq" className="sr-only">브랜드 검색</label>
        <input id="bq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드 이름, 예: 닥터지" className="h-12 w-full max-w-sm rounded-2xl border border-line bg-white px-5 text-[16px] outline-none placeholder:text-mist focus:border-lemon-deep" />
        <button type="button" aria-pressed={px} onClick={() => setPx(!px)} className={`rounded-full px-3.5 py-2 text-[13.5px] font-medium ${px ? "bg-lemon text-ink" : "bg-fog text-steel hover:text-ink"}`}>
          PX에서도 파는 브랜드만
        </button>
      </div>
      {list.length === 0 ? (
        <p className="mt-8 text-[15px] text-steel">찾는 브랜드가 없어요. 이름을 다르게 입력해 보세요.</p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.name}>
              <Link href={brandHref(b.name)} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3.5 hover:border-ink">
                <span className="min-w-0">
                  <span className="block truncate text-[15.5px] font-semibold">{b.name}</span>
                  {b.px && <span className="text-[12px] font-semibold text-lemon-ink">PX에서도 판매</span>}
                </span>
                <span className="shrink-0 text-[13.5px] tabular-nums text-steel">{b.count}개</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
