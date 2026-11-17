import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page max-w-[520px] py-24">
      <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">찾는 페이지가 없어요</h1>
      <p className="mt-3 text-steel">주소가 바뀌었거나 판매가 끝난 제품일 수 있어요.</p>
      <div className="mt-8 flex gap-2">
        <Link href="/products/" className="btn-primary">제품 둘러보기</Link>
        <Link href="/" className="btn-ghost">홈으로</Link>
      </div>
    </div>
  );
}
