import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "브랜드·제휴 안내 | 정함", description: "정함의 수익 구조와 브랜드 협업 원칙(준비 중)" };

const PLANS = [
  {
    t: "구매 제휴 링크",
    now: "준비됨",
    d: "추천 결과·비교·재구매 알림의 구매 버튼을 제휴 링크로 바꿔요. 환경변수 하나로 켜지게 만들어 뒀어요.",
    rule: "제휴 여부는 추천 점수에 넣지 않아요. 수수료가 높은 제품을 위로 올리지 않아요.",
  },
  {
    t: "남성 체험단 매칭",
    now: "향후 계획",
    d: "브랜드가 신제품을 맡기면, 피부 타입·고민이 맞는 정함 사용자에게만 체험을 제안해요. 체험 후기는 4주 후기와 같은 양식으로 받아요.",
    rule: "'체험 제품' 표시를 붙이고, 일반 후기 집계와 섞지 않아요.",
  },
  {
    t: "익명 피부 데이터 리포트",
    now: "향후 계획",
    d: "20대 남성의 피부 타입별 고민, 많이 비교한 제품, 4주 뒤 만족도를 개인을 알 수 없는 집계로만 브랜드에 제공해요.",
    rule: "개인 단위 데이터, 사진, 상담 내용은 제공하지 않아요. 표본이 적은 칸은 공개하지 않아요.",
  },
  {
    t: "프리미엄(선택)",
    now: "향후 계획",
    d: "무제한 고민 상담, 4주 사진 비교 리포트, 재구매 최저가 알림처럼 계속 쓰는 사람에게 필요한 기능만 유료로 검토해요.",
    rule: "1분 진단, 추천, 비교, 루틴 체크는 계속 무료예요.",
  },
];

export default function PartnersPage() {
  return (
    <div className="page max-w-[760px] pb-16 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[38px]">브랜드·제휴 안내</h1>
      <p className="mt-3 text-[16px] leading-7 text-steel">정함은 판매처와 브랜드에서 중립적인 추천을 지키면서 수익을 내려고 해요. 아래는 지금 준비된 것과 앞으로의 계획이에요.</p>
      <ul className="mt-8 space-y-4">
        {PLANS.map((x) => (
          <li key={x.t} className="rounded-2xl border border-line p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[18px] font-bold">{x.t}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${x.now === "준비됨" ? "bg-lemon text-ink" : "bg-fog text-steel"}`}>{x.now}</span>
            </div>
            <p className="mt-2 text-[15px] leading-7">{x.d}</p>
            <p className="mt-2 text-[13.5px] text-steel">원칙: {x.rule}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[14px] text-steel">
        추천 점수를 어떻게 매기는지는 <Link href="/standard/" className="font-semibold text-ink underline underline-offset-4">추천 기준</Link>에 모두 공개해 두었어요.
      </p>
    </div>
  );
}
