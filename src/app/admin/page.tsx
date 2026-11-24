"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, cloudEnabled } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { loadLocalEvents } from "@/lib/store";
import { byId, concernLabel, type Concern, type SkinType } from "@/lib/model";
import { skinTypeLabel } from "@/lib/quiz";

type Stats = {
  diagnoses: number;
  users: number;
  routines: number;
  skin: Record<string, number>;
  concerns: Record<string, number>;
  plans: Record<string, number>;
  budget: Record<string, number>;
  events: Record<string, number>;
  topPicks: { id: string; n: number }[];
  buyClicks: { id: string; n: number }[];
  ratings: { id: string; avg: number; n: number }[];
  daily: { d: string; n: number }[];
  checkRate: number | null;
};

const planLabel: Record<string, string> = { min: "3단계", basic: "4단계", full: "5단계" };
const budgetLabel: Record<string, string> = { "50000": "5만 원", "80000": "8만 원", "120000": "12만 원", "999999": "상관없음" };

function Dist({ title, data, label }: { title: string; data: Record<string, number>; label: (k: string) => string }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="rounded-2xl border border-line p-5">
      <h3 className="text-[15px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-mist">아직 데이터가 없어요.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between text-[13.5px]">
                <span>{label(k)}</span>
                <span className="tabular-nums text-steel">{v} ({Math.round((v / total) * 100)}%)</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-fog">
                <div className="h-1.5 rounded-full bg-lemon-deep" style={{ width: `${(v / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 코치 자율 실행 시험: 매일 저녁 크론과 같은 코드를 운영자 본인에게만 지금 실행
function AutoRunTest() {
  const [busy, setBusy] = useState<"" | "dry" | "send">("");
  const [out, setOut] = useState<string>("");
  const run = async (dry: boolean) => {
    if (!supabase) return;
    setBusy(dry ? "dry" : "send");
    setOut("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setOut("이 브라우저에 로그인 세션이 없어요. 로그아웃 후 다시 로그인해 주세요."); return; }
      const r = await fetch("/api/cron/coach/", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ dry }) });
      const j = await r.json();
      if (!r.ok) { setOut(j.error ?? "실행하지 못했어요."); return; }
      if (j.note) { setOut(j.note); return; }
      const sm = (j.samples ?? [])[0] as { triggers?: string[]; message?: string; actions?: string[] } | undefined;
      if (!sm) { setOut("판단할 루틴이 없어요. 루틴을 저장했는지 확인해 주세요."); return; }
      const why = sm.triggers?.length ? `연락할 이유: ${sm.triggers.join(", ")}` : "연락할 이유 없음";
      setOut(`${why}\n알림 문구: ${sm.message ?? "-"}${dry ? "\n(판단만 했어요. 알림은 보내지 않았어요.)" : j.pushed ? "\n알림을 보냈어요. 휴대폰이나 브라우저 알림을 확인해 주세요." : "\n알림을 보내지 못했어요. 알림이 켜져 있는지 확인해 주세요."}`);
    } catch {
      setOut("네트워크 오류로 실행하지 못했어요.");
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="mt-10 rounded-2xl border border-line p-5">
      <h2 className="text-[17px] font-bold tracking-[-0.02em]">코치 자율 실행 시험</h2>
      <p className="mt-1 text-[13.5px] text-steel">매일 저녁 8시에 도는 것과 같은 판단을 지금 내 계정에만 돌려봐요. 이미 보낸 이유도 다시 판단해요.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} onClick={() => run(true)} className="rounded-full border border-line px-4 py-2 text-[14px] font-semibold disabled:opacity-50">{busy === "dry" ? "판단하는 중…" : "판단만 해보기"}</button>
        <button type="button" disabled={!!busy} onClick={() => run(false)} className="rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">{busy === "send" ? "보내는 중…" : "나에게 알림 보내기"}</button>
      </div>
      {out && <p className="mt-4 whitespace-pre-line rounded-xl bg-fog p-4 text-[13.5px]">{out}</p>}
    </section>
  );
}

function localStats(): Stats {
  const ev = loadLocalEvents();
  const events: Record<string, number> = {};
  ev.forEach((e) => (events[e.type] = (events[e.type] ?? 0) + 1));
  const buys: Record<string, number> = {};
  ev.filter((e) => e.type === "click_buy").forEach((e) => {
    const id = String(e.payload?.id ?? "");
    buys[id] = (buys[id] ?? 0) + 1;
  });
  const skin: Record<string, number> = {};
  ev.filter((e) => e.type === "finish_check").forEach((e) => {
    const s = String(e.payload?.skin ?? "");
    skin[s] = (skin[s] ?? 0) + 1;
  });
  return {
    diagnoses: events.finish_check ?? 0,
    users: 1,
    routines: events.save_routine ?? 0,
    skin,
    concerns: {},
    plans: {},
    budget: {},
    events,
    topPicks: [],
    buyClicks: Object.entries(buys).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n),
    ratings: [],
    daily: [],
    checkRate: null,
  };
}

export default function AdminPage() {
  const { user, ready } = useAuth();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const local = !cloudEnabled;

  useEffect(() => {
    if (local) return setS(localStats());
    if (!ready || !user || !supabase) return;
    supabase.rpc("admin_stats").then(({ data, error }) => {
      if (error) setErr("운영자 계정만 볼 수 있어요. Supabase의 admins 표에 이 계정 이메일을 추가해 주세요.");
      else setS(data as Stats);
    });
  }, [ready, user, local]);

  if (!local && ready && !user) {
    return (
      <div className="page max-w-[520px] py-20">
        <h1 className="text-[28px] font-extrabold tracking-[-0.035em]">운영자 대시보드</h1>
        <p className="mt-3 text-steel">운영자 계정으로 로그인해 주세요.</p>
        <Link href="/login/" className="btn-primary mt-6">로그인</Link>
      </div>
    );
  }
  if (err) return <div className="page max-w-[520px] py-20 text-steel">{err}</div>;
  if (!s) return <div className="page py-24 text-steel">불러오는 중…</div>;

  const e = s.events;
  const funnel = [
    { k: "start_check", label: "진단 시작" },
    { k: "finish_check", label: "진단 완료" },
    { k: "save_routine", label: "루틴 저장" },
    { k: "check", label: "루틴 체크" },
    { k: "click_buy", label: "구매 클릭" },
  ];
  const top = Math.max(1, e.start_check ?? 0, e.finish_check ?? 0);
  const name = (id: string) => {
    const p = byId.get(id);
    return p ? `${p.brand} ${p.name}` : id;
  };

  return (
    <div className="page pb-10 pt-10 sm:pt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">운영자 대시보드</h1>
        {local && <span className="rounded-full bg-amber-wash px-3 py-1 text-[13px] font-semibold text-amber">로컬 모드: 이 브라우저 기록만 보여요</span>}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["진단 완료", s.diagnoses],
          ["가입자", s.users],
          ["저장된 루틴", s.routines],
          ["14일 체크율", s.checkRate == null ? "–" : `${Math.round(s.checkRate * 100)}%`],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl bg-fog p-5">
            <dt className="text-[13px] text-steel">{k}</dt>
            <dd className="mt-1 text-[28px] font-extrabold tabular-nums tracking-[-0.03em]">{v}</dd>
          </div>
        ))}
      </dl>

      {!local && <AutoRunTest />}

      <section className="mt-10">
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">이용 흐름</h2>
        <ol className="mt-4 space-y-3">
          {funnel.map((f) => {
            const v = e[f.k] ?? 0;
            return (
              <li key={f.k} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 text-[14px]">
                <span>{f.label}</span>
                <div className="h-3 rounded-full bg-fog">
                  <div className="h-3 rounded-full bg-ink" style={{ width: `${Math.min(100, (v / top) * 100)}%` }} />
                </div>
                <span className="text-right tabular-nums text-steel">{v}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12.5px] text-mist">이벤트 횟수 기준이에요. 체크·구매 클릭은 한 사람이 여러 번 할 수 있어요.</p>
      </section>

      {s.daily.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">최근 30일 진단</h2>
          <div className="mt-4 flex h-28 items-end gap-1">
            {s.daily.map((d) => {
              const m = Math.max(...s.daily.map((x) => x.n));
              return <div key={d.d} title={`${d.d} ${d.n}건`} className="flex-1 rounded-t bg-lemon-deep" style={{ height: `${(d.n / m) * 100}%` }} />;
            })}
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dist title="피부 타입" data={s.skin} label={(k) => skinTypeLabel[k as SkinType] ?? k} />
        <Dist title="고민" data={s.concerns} label={(k) => concernLabel[k as Concern] ?? k} />
        <Dist title="원하는 단계" data={s.plans} label={(k) => planLabel[k] ?? k} />
        <Dist title="예산" data={s.budget} label={(k) => budgetLabel[k] ?? k} />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-3">
        {[
          { t: "가장 많이 추천된 제품", rows: s.topPicks.map((x) => ({ id: x.id, v: `${x.n}회` })) },
          { t: "구매 클릭이 많은 제품", rows: s.buyClicks.map((x) => ({ id: x.id, v: `${x.n}회` })) },
          { t: "만족도", rows: s.ratings.map((x) => ({ id: x.id, v: `${Number(x.avg).toFixed(1)}점 (${x.n})` })) },
        ].map((b) => (
          <div key={b.t}>
            <h2 className="text-[16px] font-bold">{b.t}</h2>
            {b.rows.length === 0 ? (
              <p className="mt-3 text-[13px] text-mist">아직 데이터가 없어요.</p>
            ) : (
              <ol className="mt-3 divide-y divide-line border-y border-line text-[13.5px]">
                {b.rows.map((r, i) => (
                  <li key={r.id + i} className="flex justify-between gap-3 py-2.5">
                    <Link href={`/p/${r.id}/`} className="truncate hover:underline">{name(r.id)}</Link>
                    <span className="shrink-0 tabular-nums text-steel">{r.v}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
