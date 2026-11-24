import Link from "next/link";
import { RESEARCH_DATE, categoryLabel, dailyUse, products, type Category } from "@/lib/model";
import { GROUPS, type IngGroup } from "@/data/ingredients";
import { PX_SOURCES } from "@/data/px";

const rules = [
  { t: "피부 타입이 맞는가", d: "세안 30분 후 느낌으로 건성·지성·복합성·중성을 나누고, 제조사가 상세정보에 표기한 사용 대상 피부와 비교해요." },
  { t: "고민에 맞는 성분이 들었는가", d: "제품명 문구가 아니라 전성분을 읽어요. 트러블이면 살리실릭애씨드·티트리·징크, 건조면 히알루론산·세라마이드처럼 고민별 성분이 있는지, 성분표 앞쪽(함량이 많은 쪽)에 있는지 봐요." },
  { t: "자극이 겹치지 않는가", d: "향료, 알레르기 유발 향 성분, 앞쪽에 있는 에탄올, 에센셜오일을 자극 지수로 계산해요. 예민하다고 답하면 각질·레티노이드 성분이 강한 제품을 빼고, 그 외에도 루틴에 하나까지만 넣어요." },
  { t: "제형이 맞는가", d: "번들거리는 피부엔 가벼운 제형, 건조한 피부엔 보습감 있는 제형에 점수를 더해요. 선크림은 싫어하는 사용감을 피해요." },
  { t: "예산 안에 들어오는가", d: "단계별 상위 후보를 모두 조합해 보고, 예산 안에서 점수 합이 가장 높은 조합 하나를 골라요." },
];

export default function StandardPage() {
  const counts = products.reduce<Record<string, number>>((m, p) => ((m[p.category] = (m[p.category] ?? 0) + 1), m), {});
  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[42px]">정함은 이렇게 골라요</h1>
      <p className="mt-4 text-[16px] leading-8 text-steel">
        광고비를 받고 순위를 바꾸지 않아요. 구매 링크에 제휴 수수료가 붙더라도 점수 계산에는 들어가지 않아요. 아래 다섯 가지 기준과, 써본 사람들이 남긴 만족도만으로 점수를 매겨요.
      </p>

      <ol className="mt-10 space-y-6">
        {rules.map((r, i) => (
          <li key={r.t} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-lemon-deep text-[14px] font-bold text-lemon-ink">{i + 1}</span>
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
          올리브영 온라인몰의 판매 랭킹(스킨케어·클렌징·선케어·맨즈에딧·마스크팩)과 카테고리 목록에서 {RESEARCH_DATE}에 조회한 제품 {products.length}개예요.
          가격은 할인 전 정상가이고, 1+1이나 리필 같은 기획 구성 가격일 수 있어요. 각 제품의 &lsquo;화장품법에 따라 기재해야 하는 모든 성분&rsquo;, 용량, 제품 주요 사양(사용 대상 피부), 기능성 심사 여부를 상품 상세정보에서 그대로 가져와 분석했어요.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-steel">
          &lsquo;PX에서도 판매&rsquo; 표시는 기사와 사용 후기에서 PX(군마트) 판매가 확인된 브랜드에만 붙였어요(2026-11-24 조사). PX는 판매 목록과 가격이 공개되어 있지 않아 제품 단위로는 표시하지 않고, 가격도 시중 정가로만 보여드려요.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-steel">
          {PX_SOURCES.map((x) => (
            <li key={x.url}>
              <a href={x.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{x.title}</a>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
          {(Object.keys(counts) as Category[]).map((c) => (
            <span key={c} className="rounded-full bg-fog px-3 py-1.5">
              {categoryLabel[c]} {counts[c]}개
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">정함이 찾는 성분</h2>
        <p className="mt-3 text-[15px] leading-7 text-steel">전성분에서 아래 이름이 보이면 해당 묶음으로 분류해요.</p>
        <dl className="mt-5 divide-y divide-line border-y border-line text-[14px]">
          {(Object.keys(GROUPS) as IngGroup[]).map((k) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="font-semibold">
                <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${GROUPS[k].kind === "caution" ? "bg-amber" : GROUPS[k].kind === "uv" ? "bg-mist" : "bg-lemon-deep"}`} aria-hidden="true" />
                {GROUPS[k].label}
              </dt>
              <dd className="leading-6 text-steel">{GROUPS[k].note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">다 쓰는 날 계산</h2>
        <p className="mt-3 text-[15px] leading-7 text-steel">용량을 하루 사용량 추정치로 나눠요. 아침·저녁 두 번 쓰는 기준이고 선크림은 아침 한 번이에요.</p>
        <table className="mt-4 w-full text-[14px]">
          <tbody className="divide-y divide-line border-y border-line">
            {(Object.keys(dailyUse) as Category[]).map((c) => (
              <tr key={c}>
                <td className="py-2.5">{categoryLabel[c]}</td>
                <td className="py-2.5 text-right tabular-nums text-steel">{c === "pad" || c === "sheet" || c === "patch" ? `주 ${Math.round(dailyUse[c] * 7)}${c === "patch" ? "개" : "장"}` : c === "pack" ? `주 1~2회, 하루 평균 ${dailyUse[c]}g` : `하루 ${dailyUse[c]}ml(g)`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">나 같은 남자들의 4주 후기</h2>
        <p className="mt-3 text-[15px] leading-7 text-steel">
          정함에서 루틴을 정하고 3주 넘게 쓴 사람만 후기를 남길 수 있어요. 만족도(5점), 고민이 좋아졌는지, 다 쓰면 또 살지를 받아서 피부 타입별로 묶어요.
          같은 피부 타입이 3명 미만이면 숫자를 보여주지 않아요. 협찬받은 후기나 체험단 후기는 받지 않아요.
        </p>
      </section>

      <section className="mt-10 rounded-2xl bg-fog p-6">
        <h2 className="text-[16px] font-bold">한계</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-steel">
          <li>전성분은 함량 순서만 알려주고 정확한 농도는 알 수 없어요. 그래서 앞쪽 10번째 안에 있는지로 강도를 가늠해요.</li>
          <li>같은 성분이라도 사람마다 반응이 달라요. 새 제품은 귀 뒤나 턱선에 먼저 발라 보세요.</li>
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
