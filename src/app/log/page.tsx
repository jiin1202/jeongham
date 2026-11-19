"use client";
/* eslint-disable @next/next/no-img-element -- 사용자 사진(blob/서명 URL)이라 next/image 최적화 대상이 아님 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadLogs, today, type SkinLog } from "@/lib/store";
import { photoUrl, saveLog } from "@/lib/sync";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";

const LEVEL = ["없음", "조금", "보통", "심함"];
const OVERALL = ["", "나빠요", "별로예요", "보통이에요", "좋아요", "아주 좋아요"];

async function resize(file: File, max = 720): Promise<Blob> {
  const img = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * r);
  c.height = Math.round(img.height * r);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/jpeg", 0.75));
}
const toDataUrl = (b: Blob) => new Promise<string>((res) => { const f = new FileReader(); f.onload = () => res(f.result as string); f.readAsDataURL(b); });

function Scale({ label, value, onChange, n }: { label: string; value: number; onChange: (v: number) => void; n: string[] }) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {n.map((t, i) =>
          t ? (
            <button key={t} type="button" aria-pressed={value === i} onClick={() => onChange(i)} className={`rounded-lg px-3 py-2 text-[14px] font-medium ${value === i ? "bg-lemon text-ink" : "bg-fog text-steel hover:text-ink"}`}>
              {t}
            </button>
          ) : null
        )}
      </div>
    </fieldset>
  );
}

function Photo({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { photoUrl(path).then(setSrc); }, [path]);
  return src ? <img src={src} alt={alt} className="aspect-[3/4] w-full rounded-xl object-cover" /> : <div className="aspect-[3/4] w-full rounded-xl bg-fog" />;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function LogPage() {
  const { user } = useAuth();
  const t = today();
  const [logs, setLogs] = useState<SkinLog[]>([]);
  const [f, setF] = useState<SkinLog>({ day: t, overall: 3, trouble: 0, oil: 0, dry: 0 });
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => {
      const l = loadLogs();
      setLogs(l);
      const cur = l.find((x) => x.day === t);
      if (cur) setF(cur);
    };
    load();
    window.addEventListener("jh-store", load);
    return () => window.removeEventListener("jh-store", load);
  }, [t]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    try {
      const b = await resize(fl);
      setFile(b);
      setPreview(URL.createObjectURL(b));
    } catch {
      setMsg({ ok: false, t: "사진을 불러오지 못했어요. JPG나 PNG 사진으로 다시 골라주세요." });
    }
  };

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    let log: SkinLog = { ...f, day: t };
    const cloud = cloudEnabled && !!user;
    if (file && !cloud) log = { ...log, photo: await toDataUrl(file) };
    const ok = await saveLog(log, cloud && file ? file : undefined);
    setBusy(false);
    track("skin_log", { photo: !!file });
    setFile(null);
    setPreview(null);
    setMsg(ok ? { ok: true, t: "오늘 피부를 기록했어요." } : { ok: false, t: "브라우저 저장 공간이 가득 찼어요. 로그인하면 사진을 계정에 저장할 수 있어요." });
  };

  const cmp = useMemo(() => {
    if (logs.length < 2) return null;
    const first = logs.slice(0, Math.min(3, Math.floor(logs.length / 2)));
    const last = logs.slice(-Math.min(3, Math.ceil(logs.length / 2)));
    const k = (xs: SkinLog[], key: "overall" | "trouble" | "oil" | "dry") => avg(xs.map((x) => x[key]));
    const photos = logs.filter((l) => l.photo);
    return {
      days: Math.round((Date.parse(logs[logs.length - 1].day) - Date.parse(logs[0].day)) / 864e5),
      rows: [
        { label: "전체 컨디션", a: k(first, "overall"), b: k(last, "overall"), up: true, max: 5 },
        { label: "트러블", a: k(first, "trouble"), b: k(last, "trouble"), up: false, max: 3 },
        { label: "번들거림", a: k(first, "oil"), b: k(last, "oil"), up: false, max: 3 },
        { label: "건조함", a: k(first, "dry"), b: k(last, "dry"), up: false, max: 3 },
      ],
      before: photos[0],
      after: photos.length > 1 ? photos[photos.length - 1] : null,
    };
  }, [logs]);

  const W = 560, H = 120;
  const pts = logs.slice(-30);
  const path = pts.map((l, i) => `${i ? "L" : "M"}${(i / Math.max(1, pts.length - 1)) * (W - 20) + 10},${H - 10 - ((l.overall - 1) / 4) * (H - 20)}`).join(" ");

  return (
    <div className="page max-w-[760px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[34px] font-extrabold tracking-[-0.04em] sm:text-[40px]">오늘 피부 기록</h1>
      <p className="mt-3 text-[15px] leading-7 text-steel">하루 10초면 돼요. 2주쯤 쌓이면 루틴이 피부에 맞는지 숫자와 사진으로 비교해 드려요.</p>

      <section className="mt-8 space-y-6 rounded-3xl border border-line p-6 sm:p-8">
        <Scale label="오늘 피부 컨디션" value={f.overall} onChange={(v) => setF({ ...f, overall: v })} n={OVERALL} />
        <Scale label="트러블" value={f.trouble} onChange={(v) => setF({ ...f, trouble: v })} n={LEVEL} />
        <Scale label="번들거림" value={f.oil} onChange={(v) => setF({ ...f, oil: v })} n={LEVEL} />
        <Scale label="건조함·당김" value={f.dry} onChange={(v) => setF({ ...f, dry: v })} n={LEVEL} />
        <div>
          <label htmlFor="note" className="text-[14px] font-semibold">메모 <span className="font-normal text-mist">(선택)</span></label>
          <input id="note" value={f.note ?? ""} maxLength={120} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="예: 면도 후 따가움, 새 선크림 시작" className="mt-2 h-11 w-full rounded-xl border border-line px-4 text-[15px] outline-none placeholder:text-mist focus:border-lemon-deep" />
        </div>
        <div>
          <p className="text-[14px] font-semibold">사진 <span className="font-normal text-mist">(선택)</span></p>
          <p className="mt-1 text-[13px] text-steel">같은 장소, 같은 조명에서 정면으로 찍으면 비교가 정확해요. {cloudEnabled && user ? "사진은 본인 계정에서만 볼 수 있어요." : "사진은 이 브라우저에만 저장돼요."}</p>
          <input ref={inp} type="file" accept="image/*" capture="user" onChange={pick} className="sr-only" id="ph" />
          <div className="mt-3 flex items-center gap-3">
            <label htmlFor="ph" className="btn-ghost h-10 cursor-pointer px-4 text-[14px]">{preview ? "다시 찍기" : "사진 추가"}</label>
            {preview && <img src={preview} alt="오늘 찍은 사진 미리보기" className="h-16 w-12 rounded-lg object-cover" />}
          </div>
        </div>
        <button type="button" onClick={submit} disabled={busy} className="btn-primary h-12 w-full disabled:opacity-50">{busy ? "저장하는 중…" : logs.some((l) => l.day === t) ? "오늘 기록 고치기" : "기록하기"}</button>
        {msg && <p role="status" className={`rounded-xl px-4 py-3 text-[14px] ${msg.ok ? "bg-lemon-wash text-lemon-ink" : "bg-rose-wash text-rose"}`}>{msg.t}</p>}
      </section>

      {logs.length === 0 ? (
        <p className="mt-10 text-[14px] text-steel">아직 기록이 없어요. 오늘이 첫 기록이에요.</p>
      ) : (
        <>
          {pts.length >= 2 && <section className="mt-12">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">컨디션 흐름</h2>
            <p className="mt-1 text-[13.5px] text-steel">최근 {pts.length}번 기록, 위로 갈수록 좋아요.</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`최근 피부 컨디션, 마지막 기록 ${OVERALL[pts[pts.length - 1].overall]}`}>
              {[1, 3, 5].map((v) => <line key={v} x1="10" x2={W - 10} y1={H - 10 - ((v - 1) / 4) * (H - 20)} y2={H - 10 - ((v - 1) / 4) * (H - 20)} stroke="#DCE1E7" strokeDasharray="3 4" />)}
              {pts.length > 1 && <path d={path} fill="none" stroke="#E8B800" strokeWidth="2.5" strokeLinejoin="round" />}
              {pts.map((l, i) => <circle key={l.day} cx={(i / Math.max(1, pts.length - 1)) * (W - 20) + 10} cy={H - 10 - ((l.overall - 1) / 4) * (H - 20)} r="3.5" fill="#E8B800" />)}
            </svg>
          </section>}

          {cmp && (
            <section className="mt-12">
              <h2 className="text-[20px] font-bold tracking-[-0.02em]">처음과 지금 ({cmp.days}일 사이)</h2>
              {cmp.days < 14 && <p className="mt-1 text-[13.5px] text-steel">피부 변화는 보통 2~4주는 지나야 보여요. 조금 더 기록해 보세요.</p>}
              <ul className="mt-4 divide-y divide-line border-y border-line text-[14.5px]">
                {cmp.rows.map((r) => {
                  const d = r.b - r.a;
                  const better = r.up ? d > 0.2 : d < -0.2;
                  const worse = r.up ? d < -0.2 : d > 0.2;
                  return (
                    <li key={r.label} className="flex items-center justify-between py-3">
                      <span>{r.label}</span>
                      <span className="tabular-nums">
                        {r.a.toFixed(1)} → <b>{r.b.toFixed(1)}</b>
                        <span className={`ml-3 text-[13px] font-semibold ${better ? "text-lemon-ink" : worse ? "text-rose" : "text-mist"}`}>{better ? "나아졌어요" : worse ? "나빠졌어요" : "비슷해요"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {cmp.before && cmp.after && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <figure>
                    <Photo path={cmp.before.photo!} alt={`${cmp.before.day} 피부 사진`} />
                    <figcaption className="mt-1.5 text-[13px] text-steel">{cmp.before.day}</figcaption>
                  </figure>
                  <figure>
                    <Photo path={cmp.after.photo!} alt={`${cmp.after.day} 피부 사진`} />
                    <figcaption className="mt-1.5 text-[13px] text-steel">{cmp.after.day}</figcaption>
                  </figure>
                </div>
              )}
              {cmp.rows[1].b - cmp.rows[1].a > 0.5 && cmp.days >= 14 && (
                <p className="mt-5 rounded-xl bg-amber-wash px-4 py-3 text-[14px] leading-6">
                  트러블이 늘었어요. 최근 새로 쓴 제품이 있다면 잠시 빼고 지켜보세요. 계속되면 피부과 진료를 받아보세요.
                </p>
              )}
            </section>
          )}

          <section className="mt-12">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">기록</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line text-[14px]">
              {[...logs].reverse().slice(0, 30).map((l) => (
                <li key={l.day} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span className="font-semibold tabular-nums">{l.day}</span>
                  <span className="text-steel">{OVERALL[l.overall]}, 트러블 {LEVEL[l.trouble]}, 번들 {LEVEL[l.oil]}, 건조 {LEVEL[l.dry]}{l.photo ? ", 사진" : ""}</span>
                  {l.note && <span className="w-full text-[13px] text-mist">{l.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <Link href="/me/" className="btn-ghost mt-10">내 루틴으로</Link>
    </div>
  );
}
