"use client";
// 찜한 제품: 종류별로 모아 보고, 비교함에 담거나 내 루틴의 같은 종류 제품과 바꾼다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { useLists } from "@/components/PickButtons";
import { byId, categoryLabel, type Category, type Product } from "@/lib/model";
import { loadSaved, saveCompare, today, type Saved } from "@/lib/store";
import { saveSaved } from "@/lib/sync";
import { cheaperAlternatives } from "@/lib/alternatives";
import { track } from "@/lib/track";

export default function SavedPage() {
  const { wish, cmp, toggleWish, toggleCompare } = useLists();
  const [routine, setRoutine] = useState<Saved | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setRoutine(loadSaved()), []);

  const items = useMemo(() => wish.map((id) => byId.get(id)).filter(Boolean) as Product[], [wish]);
  const groups = useMemo(() => {
    const m = new Map<Category, Product[]>();
    for (const p of items) m.set(p.category, [...(m.get(p.category) ?? []), p]);
    return Array.from(m.entries());
  }, [items]);

  const inRoutine = (p: Product) => routine?.ids.find((id) => byId.get(id)?.category === p.category);
  const putInRoutine = async (p: Product) => {
    if (!routine) return;
    const old = inRoutine(p);
    const ids = old ? routine.ids.map((x) => (x === old ? p.id : x)) : [...routine.ids, p.id];
    const start = { ...routine.start, [p.id]: today() };
    if (old) delete start[old];
    const next = { ...routine, ids, start };
    await saveSaved(next);
    setRoutine(next);
    track("wish_to_routine", { id: p.id, replaced: old ?? null });
    setMsg(old ? `${byId.get(old)?.name} 대신 ${p.name}을(를) 루틴에 넣었어요.` : `${p.name}을(를) 루틴에 더했어요.`);
  };

  return (
    <div className="page max-w-[860px] pb-16 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold tracking-[-0.04em] sm:text-[38px]">찜한 제품</h1>
      <p className="mt-2 text-[15px] text-steel">이 기기에 저장돼요. 같은 종류끼리 비교함에 담아 보고, 고른 건 내 루틴에 바로 넣을 수 있어요.</p>
      {msg && (
        <p role="status" className="mt-4 rounded-xl bg-lemon-wash px-4 py-3 text-[14px]">
          {msg} <Link href="/me/" className="font-semibold underline underline-offset-4">내 루틴 보기</Link>
        </p>
      )}

      {!items.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-14 text-center text-steel">
          아직 찜한 제품이 없어요. 제품 카드의 ♡를 눌러 보세요.
          <div><Link href="/products/" className="btn-primary mt-6">제품 보러 가기</Link></div>
        </div>
      ) : (
        groups.map(([cat, list]) => (
          <section key={cat} className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-bold">{categoryLabel[cat]} <span className="text-[14px] font-normal text-steel">{list.length}개</span></h2>
              {list.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    saveCompare(list.slice(0, 3).map((p) => p.id));
                    location.href = "/compare/";
                  }}
                  className="text-[13.5px] font-semibold text-lemon-ink underline underline-offset-4"
                >
                  {categoryLabel[cat]}끼리 비교하기
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-3">
              {list.map((p) => {
                const old = inRoutine(p);
                const alt = cheaperAlternatives(p, 1)[0];
                return (
                  <li key={p.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-start gap-4">
                      <ProductThumb p={p} className="h-20 w-20" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/p/${p.id}/`} className="block">
                          <span className="block text-[12.5px] text-steel">{p.brand}</span>
                          <span className="block font-semibold">{p.name}</span>
                        </Link>
                        <FitLine p={p} className="mt-1.5" />
                        <p className="mt-1.5 text-[14px] font-bold tabular-nums">{p.price.toLocaleString()}원</p>
                        {alt && (
                          <p className="mt-1 text-[12.5px] text-steel">
                            비슷한데 더 싼 것: <Link href={`/p/${alt.p.id}/`} className="underline underline-offset-2">{alt.p.brand} {alt.p.name}</Link> (용량 대비 {Math.round(alt.save * 100)}% 저렴)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => toggleCompare(p.id)} className={`btn h-9 px-3 text-[13px] ${cmp.includes(p.id) ? "bg-ink text-white" : ""}`}>{cmp.includes(p.id) ? "비교함에 담김" : "+비교"}</button>
                      {routine ? (
                        old === p.id ? (
                          <span className="flex h-9 items-center px-2 text-[13px] text-lemon-ink">내 루틴에 있어요</span>
                        ) : (
                          <button type="button" onClick={() => putInRoutine(p)} className="btn-primary h-9 px-3 text-[13px]">
                            {old ? `루틴의 ${byId.get(old)?.name.slice(0, 12)} 대신 쓰기` : "내 루틴에 넣기"}
                          </button>
                        )
                      ) : (
                        <Link href="/check/" className="btn h-9 px-3 text-[13px]">진단하고 루틴 만들기</Link>
                      )}
                      <button type="button" onClick={() => toggleWish(p.id)} className="h-9 px-2 text-[13px] text-steel hover:text-rose">찜 해제</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
