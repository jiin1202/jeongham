import Link from "next/link";
import { RESEARCH_DATE, categoryLabel, dailyUse, products, type Category } from "@/data/products";

const rules = [
  { t: "피부 타입이 맞는가", d: "세안 30분 후 느낌으로 건성·지성·복합성·중성을 나누고, 맞지 않는 제형은 크게 감점해요." },
  { t: "고민을 다루는 제품인가", d: "트러블, 모공, 번들거림, 건조, 예민함, 흔적, 탄력 중 고른 고민을 제품이 내세우는지 봐요." },
  { t: "자극이 겹치지 않는가", d: "자주 따갑다고 답했거나 예민함이 고민이면 각질 제거·레티놀 소구 제품을 빼요. 그런 제품은 루틴에 하나까지만 넣어요." },
  { t: "제형이 맞는가", d: "번들거리는 피부엔 가벼운 제형, 건조한 피부엔 보습감 있는 제형에 점수를 더해요. 선크림은 싫어하는 사용감을 피해요." },
  { t: "예산 안에 들어오는가", d: "단계별 상위 후보를 모두 조합해 보고, 예산 안에서 점수 합이 가장 높은 조합 하나를 골라요." },
];

export default function StandardPage() {
  const counts = products.reduce<Record<string, number>>((m, p) => ((m[p.category] = (m[p.category] ?? 0) + 1), m), {});
  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[42px]">정함은 이렇게 골라요</h1>
      <p className="mt-4 text-[16px] leading-8 text-steel">
        광고비를 받고 순위를 바꾸지 않아요. 지금은 제휴 수수료도 받지 않아요. 아래 다섯 가지 기준만으로 점수를 매겨요.
      </p>

      <ol className="mt-10 space-y-6">
        {rules.map((r, i) => (
          <li key={r.t} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-teal text-[14px] font-bold text-teal">{i + 1}</span>
            <div>
              <h2 className="text-[18px] font-bold">{r.t}</h2>
              <p className="mt-1 text-[15px] leading-7 text-steel">{r.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">데이터 출처</h2>
        <p className="mt-3 text-[15px] leading-7 text-steel">
          올리브영 온라인몰의 스킨케어·클렌징·선케어·맨즈에딧 판매 랭킹에서 {RESEARCH_DATE}에 조회한 제품 {products.length}개예요.
          가격은 할인 전 정상가이고, 1+1이나 리필 같은 기획 구성 가격일 수 있어요. 효능 분류는 제품명과 브랜드가 내세운 문구를 기준으로 했어요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
          {(Object.keys(counts) as Category[]).map((c) => (
            <span key={c} className="rounded-full bg-fog px-3 py-1.5">
              {categoryLabel[c]} {counts[c]}개
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">다 쓰는 날 계산</h2>
        <p className="mt-3 text-[15px] leading-7 text-steel">용량을 하루 사용량 추정치로 나눠요. 아침·저녁 두 번 쓰는 기준이고 선크림은 아침 한 번이에요.</p>
        <table className="mt-4 w-full text-[14px]">
          <tbody className="divide-y divide-line border-y border-line">
            {(Object.keys(dailyUse) as Category[]).map((c) => (
              <tr key={c}>
                <td className="py-2.5">{categoryLabel[c]}</td>
                <td className="py-2.5 text-right tabular-nums text-steel">하루 {dailyUse[c]}ml(g)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10 rounded-2xl bg-fog p-6">
        <h2 className="text-[16px] font-bold">한계</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-steel">
          <li>전성분을 분석하지 않고 제품 소구 문구로 분류했어요. 개인에 따라 맞지 않을 수 있어요.</li>
          <li>올리브영 인기 제품 중심이라 모든 브랜드를 다루지 않아요.</li>
          <li>피부 질환이 의심되면 화장품보다 피부과 진료가 먼저예요.</li>
        </ul>
      </section>

      <Link href="/check" className="btn-primary mt-10">
        내 루틴 정하기
      </Link>
    </div>
  );
}
