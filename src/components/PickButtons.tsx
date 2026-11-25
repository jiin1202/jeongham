"use client";
// 찜(하트)과 비교함 담기 버튼. 제품 카드·상세에서 같이 쓴다.
import { useEffect, useState } from "react";
import { COMPARE_MAX, loadCompare, loadWish, saveCompare, saveWish } from "@/lib/store";
import { track } from "@/lib/track";

export function useLists() {
  const [wish, setWish] = useState<string[]>([]);
  const [cmp, setCmp] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => {
      setWish(loadWish());
      setCmp(loadCompare());
    };
    sync();
    window.addEventListener("jh-store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jh-store", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggleWish = (id: string) => {
    const on = wish.includes(id);
    saveWish(on ? wish.filter((x) => x !== id) : [id, ...wish]);
    if (!on) track("wish_add", { id });
  };
  /** 비교함이 꽉 찼으면 false */
  const toggleCompare = (id: string) => {
    const on = cmp.includes(id);
    if (!on && cmp.length >= COMPARE_MAX) return false;
    saveCompare(on ? cmp.filter((x) => x !== id) : [...cmp, id]);
    if (!on) track("compare_add", { id });
    return true;
  };
  return { wish, cmp, toggleWish, toggleCompare };
}

export default function PickButtons({ id, size = "sm" }: { id: string; size?: "sm" | "lg" }) {
  const { wish, cmp, toggleWish, toggleCompare } = useLists();
  const [full, setFull] = useState(false);
  const w = wish.includes(id), c = cmp.includes(id);
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  if (size === "lg") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={w} onClick={() => toggleWish(id)} className={`btn h-11 text-[14px] ${w ? "bg-lemon-wash text-lemon-ink" : "border border-line hover:border-ink"}`}>
          {w ? "♥ 찜함" : "♡ 찜하기"}
        </button>
        <button type="button" aria-pressed={c} onClick={() => setFull(!toggleCompare(id))} className={`btn h-11 text-[14px] ${c ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
          {c ? "비교함에 담김" : "비교함 담기"}
        </button>
        {full && <p role="status" className="col-span-2 text-[12.5px] text-amber">비교함은 {COMPARE_MAX}개까지예요. 하나를 빼고 담아 주세요.</p>}
      </div>
    );
  }
  return (
    <span className="flex gap-1">
      <button type="button" aria-pressed={w} aria-label={w ? "찜 취소" : "찜하기"} onClick={(e) => { stop(e); toggleWish(id); }} className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] ring-1 ${w ? "bg-lemon text-ink ring-lemon-deep" : "bg-white text-steel ring-line hover:text-ink"}`}>
        {w ? "♥" : "♡"}
      </button>
      <button type="button" aria-pressed={c} aria-label={c ? "비교함에서 빼기" : "비교함 담기"} title={full ? `비교함은 ${COMPARE_MAX}개까지예요` : "비교함 담기"} onClick={(e) => { stop(e); setFull(!toggleCompare(id)); }} className={`flex h-8 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ring-1 ${c ? "bg-ink text-white ring-ink" : full ? "bg-amber-wash text-amber ring-amber/40" : "bg-white text-steel ring-line hover:text-ink"}`}>
        {c ? "비교 ✓" : full ? "가득" : "+비교"}
      </button>
    </span>
  );
}
