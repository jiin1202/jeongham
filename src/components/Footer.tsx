import Link from "next/link";
import { RESEARCH_DATE, products } from "@/lib/model";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-fog/60">
      <div className="page grid gap-8 py-12 sm:grid-cols-[1fr_auto]">
        <div className="max-w-md space-y-3">
          <Logo />
          <p className="text-[13px] leading-6 text-steel">
            제품 {products.length}개의 가격·용량·전성분은 올리브영 온라인몰에서 {RESEARCH_DATE}에 조회한 정보예요. 가격은 바뀔 수 있어 구매 전 판매처에서 확인해 주세요.
            정함의 추천은 화장품 선택을 돕는 정보이고, 피부 질환의 진단이나 치료를 대신하지 않아요.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-steel">
          <Link href="/products" className="hover:text-ink">제품 둘러보기</Link>
          <Link href="/standard" className="hover:text-ink">추천 기준</Link>
          <Link href="/mine" className="hover:text-ink">쓰는 제품 검사</Link>
          <Link href="/guide" className="hover:text-ink">스킨케어 가이드</Link>
          <Link href="/me" className="hover:text-ink">내 루틴</Link>
          <Link href="/partners" className="hover:text-ink">브랜드·제휴</Link>
          <Link href="/privacy" className="hover:text-ink">개인정보 처리방침</Link>
        </div>
      </div>
    </footer>
  );
}
