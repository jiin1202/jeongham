"use client";
import { useEffect, useState } from "react";
import { fetchPeer, type PeerRow } from "@/lib/sync";
import { loadAnswers } from "@/lib/store";
import { skinTypeLabel, skinTypeOf } from "@/lib/quiz";
import type { SkinType } from "@/lib/model";

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <p className="text-[24px] font-extrabold tabular-nums tracking-[-0.03em]">{v}</p>
      <p className="text-[12.5px] text-steel">{l}</p>
    </div>
  );
}

/** 같은 피부 타입 남성의 4주 후기 집계. 3명 미만이면 숫자를 보여주지 않는다 */
export default function PeerResults({ id }: { id: string }) {
  const [rows, setRows] = useState<PeerRow[] | null | undefined>(undefined);
  const [mine, setMine] = useState<SkinType | null>(null);

  useEffect(() => {
    const a = loadAnswers();
    if (a) setMine(skinTypeOf(a));
    fetchPeer(id).then(setRows);
  }, [id]);

  if (rows === undefined) return null;
  const own = rows?.find((r) => r.skin_type === mine);
  const all = rows?.find((r) => r.skin_type === "all");
  const show = own ?? all;

  return (
    <section className="mt-12" aria-labelledby="peer-h">
      <h2 id="peer-h" className="text-[19px] font-bold tracking-[-0.02em]">나 같은 남자들의 4주 후기</h2>
      {show ? (
        <div className="mt-4 rounded-2xl border border-line p-5">
          <p className="text-[13.5px] text-steel">
            {own ? `${skinTypeLabel[mine!]} 피부 ${own.n}명` : `정함 사용자 ${all!.n}명`}이 4주 넘게 써본 결과
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat v={show.avg_rating.toFixed(1)} l="만족도 (5점)" />
            <Stat v={`${show.better_pct}%`} l="고민이 좋아졌어요" />
            <Stat v={`${show.again_pct}%`} l="다 쓰면 또 살래요" />
          </div>
          {own && all && all.n !== own.n && <p className="mt-3 text-[12.5px] text-mist">전체 {all.n}명 기준 만족도 {all.avg_rating.toFixed(1)}</p>}
          <p className="mt-3 text-[12.5px] text-mist">정함에서 이 제품을 루틴에 넣고 3주 이상 쓴 사람만 집계해요. 3명 미만인 피부 타입은 숫자를 보여주지 않아요.</p>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-fog px-5 py-4 text-[14px] leading-6 text-steel">
          아직 4주 후기가 3개 미만이에요. 이 제품을 루틴에 넣고 4주 써보면 첫 후기를 남길 수 있어요.
          {mine && <> 남긴 후기는 {skinTypeLabel[mine]} 피부 남자들에게 먼저 보여줘요.</>}
        </p>
      )}
    </section>
  );
}
