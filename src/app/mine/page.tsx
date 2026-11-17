"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { byId, categoryLabel, products, type Category, type Product } from "@/lib/model";
import { checkProducts } from "@/lib/engine";
import { loadAnswers, loadMine, saveMine } from "@/lib/store";
import { skinTypeLabel, skinTypeOf, type Answers } from "@/lib/quiz";

const cats: (Category | "all")[] = ["all", "cleanser", "toner", "serum", "moisturizer", "allinone", "sun"];

export default function MinePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [ids, setIds] = useState<string[]>([]);
  const [a, setA] = useState<Answers | null>(null);

  useEffect(() => {
    setIds(loadMine());
    setA(loadAnswers());
  }, []);

  const setAndSave = (next: string[]) => {
    setIds(next);
    saveMine(next);
  };

  const list = useMemo(() => {
    const k = q.trim().replace(/\s/g, "").toLowerCase();
    return products.filter(
      (p) => (cat === "all" || p.category === cat) && (!k || (p.brand + p.name).replace(/\s/g, "").toLowerCase().includes(k))
    );
  }, [q, cat]);

  const mine = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const results = checkProducts(mine, a);
  const color = { good: "text-teal-deep bg-teal-wash", caution: "text-amber bg-amber-wash", bad: "text-rose bg-rose-wash" } as const;

  return (
    <div className="page grid gap-12 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1fr_1fr]">
      <section>
        <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">지금 쓰는 제품, 맞게 쓰고 있을까요?</h1>
        <p className="mt-3 text-[15px] leading-7 text-steel">
          쓰는 제품을 고르면 피부 타입과 맞는지, 같이 쓰면 자극이 겹치는지 알려드려요.
          {a ? ` 진단 결과(${skinTypeLabel[skinTypeOf(a)]} 피부) 기준으로 봐요.` : ""}
        </p>
        {!a && (
          <p className="mt-4 rounded-xl bg-fog px-4 py-3 text-[14px] text-steel">
            진단을 먼저 하면 내 피부 기준으로 더 정확하게 볼 수 있어요.{" "}
            <Link href="/check" className="font-semibold text-ink underline underline-offset-4">
              진단하기
            </Link>
          </p>
        )}

        <label htmlFor="search" className="sr-only">
          제품 검색
        </label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="브랜드나 제품명, 예: 토리든"
          className="mt-8 h-14 w-full rounded-2xl border border-line bg-white px-5 text-[16px] outline-none placeholder:text-mist focus:border-teal"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${cat === c ? "bg-ink text-white" : "bg-fog text-steel hover:text-ink"}`}
            >
              {c === "all" ? "전체" : categoryLabel[c]}
            </button>
          ))}
        </div>

        <ul className="mt-4 max-h-[440px] divide-y divide-line overflow-auto rounded-2xl border border-line">
          {list.length === 0 && (
            <li className="px-5 py-6 text-[14px] text-steel">
              찾는 제품이 없어요. 지금은 올리브영 인기 제품 {products.length}개만 검사할 수 있어요.
            </li>
          )}
          {list.map((p) => {
            const on = ids.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAndSave(on ? ids.filter((x) => x !== p.id) : [...ids, p.id])}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-fog/60"
                >
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-steel">
                      {categoryLabel[p.category]}, {p.brand}
                    </span>
                    <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                  </span>
                  <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${on ? "bg-teal text-white" : "border border-line text-ink"}`}>
                    {on ? "쓰는 중" : "추가"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="lg:pt-2">
        <div className="lg:sticky lg:top-24">
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">검사 결과 {mine.length > 0 && <span className="text-steel">({mine.length}개)</span>}</h2>
          {mine.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-steel">
              왼쪽에서 지금 쓰는 제품을 추가해 보세요.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {mine.map((p, i) => {
                const r = results[i];
                return (
                  <li key={p.id} className="rounded-2xl border border-line p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12.5px] text-steel">
                          {categoryLabel[p.category]}, {p.brand}
                        </p>
                        <Link href={`/p/${p.id}/`} className="text-[16px] font-bold hover:underline">{p.name}</Link>
                      </div>
                      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-bold ${color[r.level]}`}>{r.title}</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-[14px] leading-6 text-steel">
                      {r.detail.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => setAndSave(ids.filter((x) => x !== p.id))} className="mt-3 text-[13px] text-mist hover:text-ink">
                      목록에서 빼기
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[12.5px] leading-5 text-mist">
            판단은 각 제품의 전성분과 일반적인 사용 가이드를 기준으로 해요. 따갑거나 붉어지면 사용을 멈추고 전문의와 상담하세요.
          </p>
        </div>
      </section>
    </div>
  );
}
