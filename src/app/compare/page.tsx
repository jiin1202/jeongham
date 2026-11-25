"use client";
// 비교하기: 최대 3개를 같은 기준으로 나란히. 항목마다 더 나은 쪽에 표시하고, 내 진단이 있으면 '내 피부엔?'까지.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { useLists } from "@/components/PickButtons";
import { buyUrl, byId, cautions, categoryLabel, concernLabel, keyBenefits, textureLabel, type Product } from "@/lib/model";
import { GROUPS } from "@/data/ingredients";
import { daysToEmpty, scoreProduct } from "@/lib/engine";
import { cheaperAlternatives, unitPrice } from "@/lib/alternatives";
import { loadAnswers, saveCompare } from "@/lib/store";
import type { Answers } from "@/lib/quiz";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";
import { track } from "@/lib/track";

const SUN: Record<string, string> = { mineral: "무기자차", chemical: "유기자차", hybrid: "혼합자차" };
const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

export default function ComparePage() {
  const { cmp, toggleCompare } = useLists();
  const [a, setA] = useState<Answers | null>(null);
  useEffect(() => {
    setA(loadAnswers());
    track("compare_view");
  }, []);
  const items = useMemo(() => cmp.map((id) => byId.get(id)).filter(Boolean) as Product[], [cmp]);

  if (!items.length) {
    return (
      <div className="page max-w-[640px] py-16">
        <h1 className="text-[32px] font-extrabold tracking-[-0.04em]">비교함이 비어 있어요</h1>
        <p className="mt-3 text-[15px] leading-7 text-steel">제품 목록이나 상세 페이지에서 &lsquo;+비교&rsquo;를 눌러 최대 3개까지 담아 보세요. 같은 기준으로 나란히 보여드려요.</p>
        <Link href="/products/" className="btn-primary mt-8">제품 보러 가기</Link>
      </div>
    );
  }

  const unit = (p: Product) => unitPrice(p) * (p.countUnit ? 1 : 10);
  const best = {
    unit: items.length > 1 ? items.reduce((x, y) => (unit(y) < unit(x) ? y : x)).id : "",
    gentle: items.length > 1 ? items.reduce((x, y) => (y.irritation < x.irritation ? y : x)).id : "",
    days: items.length > 1 ? items.reduce((x, y) => (daysToEmpty(y) > daysToEmpty(x) ? y : x)).id : "",
  };
  const fit = (p: Product) => (a ? scoreProduct(p, a) : null);
  const fitBest = a && items.length > 1 ? items.reduce((x, y) => ((fit(y)?.score ?? -1) > (fit(x)?.score ?? -1) ? y : x)).id : "";
  const mixedCats = new Set(items.map((p) => p.category)).size > 1;

  const Badge = ({ on, t }: { on: boolean; t: string }) => (on ? <span className="ml-1.5 rounded bg-lemon px-1.5 py-0.5 text-[11px] font-bold text-ink">{t}</span> : null);
  const rows: { k: string; cell: (p: Product) => React.ReactNode }[] = [
    {
      k: a ? `내 피부엔? (${skinTypeLabel[skinTypeOf(a)]})` : "내 피부엔?",
      cell: (p) => {
        if (!a) return <Link href="/check/" className="text-[13px] font-semibold underline underline-offset-4">진단하면 알려드려요</Link>;
        const s = fit(p);
        if (!s) return <span className="text-rose">예민하다고 답해서 추천에서 빼요</span>;
        const good = s.score >= 30 && s.warnings.length === 0;
        return (
          <span>
            <b className={good ? "text-lemon-ink" : "text-amber"}>{good ? "잘 맞는 편" : "확인할 점 있음"}</b>
            <Badge on={p.id === fitBest} t="가장 잘 맞음" />
            {s.reasons[0] && <span className="mt-1 block text-[12.5px] text-steel">{s.reasons[0]}</span>}
            {s.warnings[0] && <span className="mt-1 block text-[12.5px] text-amber">{s.warnings[0]}</span>}
          </span>
        );
      },
    },
    { k: "이런 피부에", cell: (p) => <FitLine p={p} /> },
    { k: "효과", cell: (p) => p.concerns.slice(0, 3).map((c) => concernLabel[c]).join(" · ") || "-" },
    { k: "핵심 성분", cell: (p) => keyBenefits(p).filter((h) => h.pos < 15).slice(0, 3).map((h) => GROUPS[h.group].label).join(" · ") || "-" },
    { k: "주의 성분", cell: (p) => (cautions(p).length ? <span className="text-amber">{cautions(p).map((h) => GROUPS[h.group].label).join(" · ")}</span> : <span className="text-lemon-ink">없음</span>) },
    { k: "순함", cell: (p) => <span>{p.irritation === 0 && p.activeStrong.length === 0 ? "순한 편" : p.irritation >= 3 ? "자극 가능 성분 있음" : "보통"}<Badge on={p.id === best.gentle} t="가장 순함" /></span> },
    { k: "제형", cell: (p) => textureLabel[p.texture] },
    ...(items.some((p) => p.category === "sun") ? [{ k: "자외선 차단", cell: (p: Product) => (p.sunFilter ? SUN[p.sunFilter] : "-") }] : []),
    { k: "정가", cell: (p) => <b className="tabular-nums">{won(p.price)}</b> },
    { k: "용량 대비", cell: (p) => <span className="tabular-nums">{p.countUnit ? `1${p.countUnit}당` : "10ml당"} {won(unit(p))}<Badge on={p.id === best.unit} t="가장 저렴" /></span> },
    { k: "다 쓰는 데", cell: (p) => <span>약 {daysToEmpty(p)}일<Badge on={p.id === best.days} t="가장 오래" /></span> },
  ];

  return (
    <div className="page pb-16 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold tracking-[-0.04em] sm:text-[38px]">비교하기</h1>
      <p className="mt-2 text-[15px] text-steel">같은 기준으로 나란히 놓고, 항목마다 더 나은 쪽에 노란 표시를 했어요.</p>
      {mixedCats && <p className="mt-3 rounded-xl bg-amber-wash px-4 py-2.5 text-[13.5px] text-amber">종류가 다른 제품이 섞여 있어요. 같은 종류끼리 비교해야 정확해요.</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[14px]">
          <thead>
            <tr>
              <th className="w-[120px]" />
              {items.map((p) => (
                <th key={p.id} className="px-3 pb-4 align-top font-normal">
                  <Link href={`/p/${p.id}/`} className="block">
                    <ProductThumb p={p} className="h-24 w-24" />
                    <span className="mt-2 block text-[12.5px] text-steel">{categoryLabel[p.category]}, {p.brand}</span>
                    <span className="block text-[15px] font-bold leading-snug">{p.name}</span>
                  </Link>
                  <button type="button" onClick={() => toggleCompare(p.id)} className="mt-2 text-[12.5px] text-steel underline underline-offset-2 hover:text-ink">빼기</button>
                </th>
              ))}
              {items.length < 3 && (
                <th className="px-3 pb-4 align-top">
                  <Link href={`/products/?c=${items[0].category}`} className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-line text-[13px] font-semibold text-steel hover:border-ink hover:text-ink">+ 담기</Link>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <th scope="row" className="border-t border-line py-3 pr-3 align-top text-[13px] font-semibold text-steel">{r.k}</th>
                {items.map((p) => <td key={p.id} className="border-t border-line px-3 py-3 align-top">{r.cell(p)}</td>)}
                {items.length < 3 && <td className="border-t border-line" />}
              </tr>
            ))}
            <tr>
              <th />
              {items.map((p) => (
                <td key={p.id} className="px-3 pt-4">
                  <a href={buyUrl(p.goodsNo)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => track("click_buy", { id: p.id, from: "compare" })} className="btn-primary h-10 w-full px-3 text-[13px]">올리브영에서 보기</a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {items.map((p) => {
        const alts = cheaperAlternatives(p, 2);
        if (!alts.length) return null;
        return (
          <section key={p.id} className="mt-10">
            <h2 className="text-[17px] font-bold">{p.name}보다 싼 대안</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {alts.map((x) => (
                <li key={x.p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <ProductThumb p={x.p} className="h-14 w-14" />
                  <Link href={`/p/${x.p.id}/`} className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-steel">{x.p.brand}</span>
                    <span className="block truncate font-semibold">{x.p.name}</span>
                    <span className="block text-[12.5px] text-steel">겹치는 성분 {x.shared.map((g) => GROUPS[g].label).join(" · ")}, 용량 대비 {Math.round(x.save * 100)}% 저렴</span>
                  </Link>
                  {!cmp.includes(x.p.id) && cmp.length < 3 && (
                    <button type="button" onClick={() => toggleCompare(x.p.id)} className="btn h-9 shrink-0 px-3 text-[12.5px]">+비교</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button type="button" onClick={() => saveCompare([])} className="mt-10 text-[13px] text-steel underline underline-offset-4 hover:text-ink">비교함 비우기</button>
    </div>
  );
}
