"use client";
// 화면 아래 비교함 바: 담은 제품이 있으면 어디서든 보인다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLists } from "./PickButtons";
import { COMPARE_MAX, saveCompare } from "@/lib/store";

export default function CompareBar() {
  const { cmp } = useLists();
  const path = usePathname();
  if (!cmp.length || path?.startsWith("/compare")) return null;
  return (
    <>
    {/* 바가 마지막 내용을 가리지 않게 같은 높이만큼 비워 둔다 */}
    <div aria-hidden="true" className="h-20" />
    <div className="fixed inset-x-0 bottom-3 z-40 px-3">
      <div className="mx-auto flex max-w-[640px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]">
        <p className="min-w-0 flex-1 truncate text-[13.5px]">
          비교함에 {cmp.length}개 담았어요{cmp.length < COMPARE_MAX ? ` (최대 ${COMPARE_MAX}개)` : ""}
        </p>
        <button type="button" onClick={() => saveCompare([])} className="shrink-0 text-[12.5px] text-white/70 hover:text-white">비우기</button>
        <Link href="/compare/" className="shrink-0 rounded-xl bg-lemon px-3.5 py-2 text-[13.5px] font-bold text-ink">{cmp.length < 2 ? "하나 더 담기" : "비교하기"}</Link>
      </div>
    </div>
    </>
  );
}
