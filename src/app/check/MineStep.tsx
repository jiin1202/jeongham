"use client";
// 진단 중간 단계: 지금 쓰는 제품을 바르는 순서대로 고른다(선택).
// 목록에 있는 제품은 성분까지, 없는 제품은 종류만으로 피드백한다.
import { useMemo, useState } from "react";
import { byId, categoryLabel, products, type Category } from "@/lib/model";
import type { MineItem } from "@/lib/quiz";

const KINDS: Category[] = ["cleanser", "toner", "pad", "serum", "moisturizer", "allinone", "sun"];

export default function MineStep({ initial, onDone, onSkip }: { initial: MineItem[]; onDone: (items: MineItem[]) => void; onSkip: () => void }) {
  const [items, setItems] = useState<MineItem[]>(initial);
  const [q, setQ] = useState("");
  const [manual, setManual] = useState(false);

  const hits = useMemo(() => {
    const k = q.trim().replace(/\s/g, "").toLowerCase();
    if (k.length < 2) return [];
    return products.filter((p) => KINDS.includes(p.category) && (p.brand + p.name).replace(/\s/g, "").toLowerCase().includes(k)).slice(0, 8);
  }, [q]);

  const add = (it: MineItem) => {
    if (items.length >= 8) return;
    setItems([...items, it]);
    setQ("");
    setManual(false);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const remove = (i: number) => setItems(items.filter((_, x) => x !== i));
  const nameOf = (it: MineItem) => {
    const p = it.id ? byId.get(it.id) : null;
    return p ? `${p.brand} ${p.name}` : it.label || `${categoryLabel[it.cat]} (이름 모름)`;
  };

  return (
    <div>
      <h1 className="mt-10 text-[28px] font-extrabold leading-snug tracking-[-0.035em] sm:text-[34px]">지금 바르는 걸 순서대로 알려주세요</h1>
      <p className="mt-2 text-[15px] text-steel">세안부터 마지막까지. 지금 방식에서 괜찮은 건 그대로 두고, 안 맞는 것만 바꾸자고 말씀드릴게요.</p>

      {items.length > 0 && (
        <ol className="mt-6 space-y-2" aria-label="지금 바르는 순서">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lemon text-[12.5px] font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-steel">{categoryLabel[it.cat]}</span>
                <span className="block truncate text-[15px] font-semibold">{nameOf(it)}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg px-2 py-1 text-[13px] text-steel hover:text-ink disabled:opacity-30" aria-label={`${i + 1}번을 위로`}>위로</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded-lg px-2 py-1 text-[13px] text-steel hover:text-ink disabled:opacity-30" aria-label={`${i + 1}번을 아래로`}>아래로</button>
                <button type="button" onClick={() => remove(i)} className="rounded-lg px-2 py-1 text-[13px] text-rose" aria-label={`${i + 1}번 빼기`}>빼기</button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {items.length < 8 && (
        <div className="mt-6">
          <label htmlFor="mine-search" className="text-[14px] font-semibold">{items.length ? "다음에 바르는 것" : "가장 먼저 바르는 것(보통 세안제)"}</label>
          <input
            id="mine-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="브랜드나 제품명, 예: 닥터지"
            className="mt-2 h-14 w-full rounded-2xl border border-line bg-white px-5 text-[16px] outline-none placeholder:text-mist focus:border-lemon-deep"
          />
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
              {hits.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => add({ id: p.id, cat: p.category })} className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left hover:bg-fog">
                    <span className="min-w-0 truncate text-[14.5px]"><span className="text-steel">{p.brand}</span> {p.name}</span>
                    <span className="shrink-0 text-[12.5px] text-steel">{categoryLabel[p.category]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && hits.length === 0 && <p className="mt-2 text-[13.5px] text-steel">목록에 없는 제품이에요. 아래에서 종류만 골라도 돼요.</p>}
          <button type="button" onClick={() => setManual(!manual)} className="mt-3 text-[14px] font-semibold text-ink underline underline-offset-4" aria-expanded={manual}>
            목록에 없어요, 종류만 고를게요
          </button>
          {manual && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {KINDS.map((c) => (
                <button key={c} type="button" onClick={() => add({ cat: c, label: q.trim() || undefined })} className="rounded-full bg-fog px-3 py-1.5 text-[13.5px] font-medium hover:bg-lemon-wash">
                  {categoryLabel[c]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <button type="button" onClick={() => onDone(items)} disabled={items.length === 0} className="btn-primary w-full disabled:opacity-40">
          {items.length ? `이 순서로 다음 (${items.length}개)` : "제품을 하나 이상 골라주세요"}
        </button>
        <button type="button" onClick={onSkip} className="btn-ghost w-full">건너뛰기</button>
      </div>
    </div>
  );
}
