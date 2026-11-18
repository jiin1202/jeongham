"use client";
/* eslint-disable @next/next/no-img-element -- 외부 판매처 썸네일(이미 400px로 최적화됨)이라 next/image 최적화를 쓰지 않음 */
import { useState } from "react";

type Props = {
  src?: string;
  brand: string;
  name: string;
  /** 정사각형 한 변(px). 반응형이 필요하면 className으로 덮어쓰기 */
  size?: number;
  className?: string;
  priority?: boolean;
};

// 제품 사진은 흰 배경 패키지 컷이 대부분이라 흰 카드 + 얇은 테두리에 여백을 두고 contain으로 배치
export default function ProductThumb({ src, brand, name, size = 72, className = "", priority }: Props) {
  const [failed, setFailed] = useState(false);
  const box = `relative shrink-0 overflow-hidden rounded-xl border border-line bg-white ${className}`;
  const style = className.includes("w-") ? undefined : { width: size, height: size };

  if (!src || failed) {
    return (
      <div className={`${box} flex items-center justify-center bg-fog`} style={style} aria-hidden="true">
        <span className="px-1 text-center text-[11px] font-semibold leading-tight text-mist">{brand}</span>
      </div>
    );
  }
  return (
    <div className={box} style={style}>
      <img
        src={src}
        alt={`${brand} ${name} 제품 사진`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-contain p-[6%]"
      />
    </div>
  );
}
