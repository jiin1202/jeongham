import Link from "next/link";
import type { Metadata } from "next";
import { guides } from "@/data/guides";

export const metadata: Metadata = { title: "스킨케어 가이드 | 정함", description: "남자 스킨케어 순서, 면도 후 관리, 선크림 고르는 법, 트러블 성분, 레티놀 입문까지 근거와 함께 정리했어요." };

export default function GuideIndex() {
  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">스킨케어 가이드</h1>
      <p className="mt-3 text-[15px] leading-7 text-steel">피부과학회와 식약처 자료를 근거로, 꼭 필요한 것만 짧게 정리했어요.</p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}/`} className="group block py-6">
              <h2 className="text-[19px] font-bold tracking-[-0.02em] group-hover:underline">{g.title}</h2>
              <p className="mt-1.5 text-[15px] leading-7 text-steel">{g.summary}</p>
              <p className="mt-2 text-[13px] text-mist">{g.minutes}분 읽기</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
