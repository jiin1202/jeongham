import Link from "next/link";
import { RESEARCH_DATE, products } from "@/data/products";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-fog/60">
      <div className="page grid gap-8 py-12 sm:grid-cols-[1fr_auto]">
        <div className="max-w-md space-y-3">
          <Logo />
          <p className="text-[13px] leading-6 text-steel">
            제품 {products.length}개는 올리브영 온라인몰 랭킹에서 {RESEARCH_DATE}에 조회한 정보예요. 가격은 정상가 기준이며 실제 판매가와 다를 수 있어요.
            정함의 추천은 화장품 선택을 돕는 정보이고, 피부 질환의 진단이나 치료를 대신하지 않아요.
          </p>
        </div>
        <div className="flex gap-6 text-[13px] text-steel">
          <Link href="/standard" className="hover:text-ink">추천 기준</Link>
          <Link href="/mine" className="hover:text-ink">쓰는 제품 검사</Link>
          <Link href="/me" className="hover:text-ink">내 루틴</Link>
        </div>
      </div>
    </footer>
  );
}
