"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { buyUrl, byId } from "@/lib/model";
import { scoreProduct } from "@/lib/engine";
import { loadAnswers, loadMine, saveMine } from "@/lib/store";
import { skinTypeLabel, skinTypeOf, type Answers } from "@/lib/quiz";
import { fetchRatings } from "@/lib/sync";
import { track } from "@/lib/track";


export default function ProductActions({ id, goodsNo, fit }: { id: string; goodsNo: string; fit?: boolean }) {
  const [a, setA] = useState<Answers | null>(null);
  const [mine, setMine] = useState<string[]>([]);
  const [rating, setRating] = useState<{ avg: number; n: number } | null>(null);

  useEffect(() => {
    setA(loadAnswers());
    setMine(loadMine());
    if (!fit) fetchRatings().then((r) => setRating(r[id] ?? null));
    if (fit) track("view_product", { id });
  }, [id, fit]);

  if (fit) {
    const p = byId.get(id)!;
    if (!a) {
      return (
        <p className="mt-6 rounded-2xl bg-fog px-5 py-4 text-[14px] text-steel">
          1분 진단을 하면 이 제품이 내 피부에 맞는지 바로 알려드려요.{" "}
          <Link href="/check/" className="font-semibold text-ink underline underline-offset-4">진단하기</Link>
        </p>
      );
    }
    const s = scoreProduct(p, a);
    const good = s && s.score >= 30 && s.warnings.length === 0;
    return (
      <div className={`mt-6 rounded-2xl px-5 py-4 text-[14px] leading-6 ${!s ? "bg-rose-wash" : good ? "bg-teal-wash" : "bg-amber-wash"}`}>
        <p className="font-bold">
          {skinTypeLabel[skinTypeOf(a)]} 피부 기준: {!s ? "추천에서 빼요" : good ? "잘 맞는 편이에요" : "써볼 만하지만 확인할 점이 있어요"}
        </p>
        {!s && <p className="text-steel">예민하다고 답해서 각질·레티노이드 성분이 강한 제품은 제외했어요.</p>}
        {s && (s.reasons.length > 0 || s.warnings.length > 0) && (
          <ul className="mt-1 text-steel">
            {s.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}
            {s.warnings.map((w) => <li key={w} className="text-amber">{w}</li>)}
          </ul>
        )}
      </div>
    );
  }

  const on = mine.includes(id);
  return (
    <div className="mt-5 space-y-2">
      {rating && rating.n >= 3 && (
        <p className="text-[13px] text-steel">써본 정함 사용자 {rating.n}명 만족도 <b className="text-ink">{rating.avg.toFixed(1)}</b>/5</p>
      )}
      <a href={buyUrl(goodsNo)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => track("click_buy", { id, from: "product" })} className="btn-primary h-11 w-full text-[14px]">
        올리브영에서 보기
      </a>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          const next = on ? mine.filter((x) => x !== id) : [...mine, id];
          setMine(next);
          saveMine(next);
        }}
        className={`btn h-11 w-full text-[14px] ${on ? "bg-teal-wash text-teal-deep" : "border border-line hover:border-ink"}`}
      >
        {on ? "쓰는 제품에 추가됨" : "지금 쓰는 제품에 추가"}
      </button>
      {on && <Link href="/mine/" className="block text-center text-[13px] text-steel underline underline-offset-4">같이 쓰는 제품과 검사하기</Link>}
    </div>
  );
}
