"use client";
/* eslint-disable @next/next/no-img-element -- Supabase 공개 저장소의 이미 압축된 webp라 next/image 최적화를 쓰지 않음 */
import { useState, type ReactNode } from "react";
import { mediaUrl, VISUALS } from "@/data/visuals";

type Props = { name: string; className?: string; imgClassName?: string; priority?: boolean; fallback?: ReactNode; caption?: string };

// AI로 만든 사이트 이미지. 아직 안 만들었거나 못 불러오면 fallback(없으면 아무것도) 보여준다.
export default function AiPhoto({ name, className = "", imgClassName = "", priority, fallback = null, caption }: Props) {
  const [failed, setFailed] = useState(false);
  const v = VISUALS.find((x) => x.name === name);
  if (failed || !v) return <>{fallback}</>;
  return (
    <figure className={`relative overflow-hidden ${className}`}>
      <img src={mediaUrl(name)} alt={v.alt} loading={priority ? "eager" : "lazy"} onError={() => setFailed(true)} className={`h-full w-full object-cover ${imgClassName}`} />
      <span className="absolute bottom-2 right-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10.5px] font-medium text-white/90">AI로 만든 이미지</span>
      {caption && <figcaption className="mt-2 text-[13.5px] text-steel">{caption}</figcaption>}
    </figure>
  );
}
