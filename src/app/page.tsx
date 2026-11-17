import Link from "next/link";
import { products } from "@/data/products";

const PICKED = ["c4", "m3", "u2"]; // 히어로 예시: 복합성·트러블 루틴

const survey = [
  { label: "제품이 너무 많아 비교가 어렵다", v: 48 },
  { label: "내 피부 타입을 모르겠다", v: 32 },
  { label: "뭘 사야 할지 모르겠다", v: 29 },
];
const quit = [
  { label: "귀찮아서", v: 32 },
  { label: "다 쓰고 다시 사기 애매해서", v: 19 },
  { label: "피부에 안 맞아서", v: 19 },
];

function Bars({ rows }: { rows: { label: string; v: number }[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[15px]">
            <span className={i === 0 ? "font-semibold" : "text-steel"}>{r.label}</span>
            <span className={`tabular-nums ${i === 0 ? "font-bold" : "text-steel"}`}>{r.v}%</span>
          </div>
          <div className="h-2 rounded-full bg-fog">
            <div className={`h-2 rounded-full ${i === 0 ? "bg-teal" : "bg-mist/60"}`} style={{ width: `${r.v * 1.6}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const noise = products.filter((p) => !PICKED.includes(p.id)).slice(0, 30);
  const picked = PICKED.map((id) => products.find((p) => p.id === id)!);

  return (
    <>
      {/* Hero */}
      <section className="page grid gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <h1 className="text-[46px] font-extrabold leading-[1.06] tracking-[-0.05em] sm:text-[72px]">
            비교는 끝.
            <br />
            루틴은 정함.
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-8 text-steel">
            질문 8개에 답하면 올리브영 인기 제품 {products.length}개 중에서
            내 피부와 예산에 맞는 조합을 하나로 정해드려요.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/check" className="btn-primary h-14 px-7 text-[16px]">
              1분 진단 시작
            </Link>
            <Link href="/mine" className="btn-ghost h-14 px-6">
              지금 쓰는 제품 검사
            </Link>
          </div>
          <p className="mt-5 text-[13px] text-mist">로그인 없이, 무료로 쓸 수 있어요.</p>
        </div>

        <div aria-hidden="true" className="relative overflow-hidden rounded-[28px] border border-line bg-fog/50 p-6 sm:p-8">
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[13px] leading-6 text-ink sm:text-[14px]">
            {noise.map((p, i) => (
              <span key={p.id} className="noise-word" style={{ animationDelay: `${0.4 + (i % 9) * 0.06}s` }}>
                {p.brand} {p.name}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white p-5 shadow-[0_12px_40px_-12px_rgba(28,36,48,0.28)] sm:inset-x-8 sm:bottom-8">
            <p className="text-[13px] text-steel">복합성 피부, 트러블 고민, 8만 원 이하</p>
            <ol className="mt-3 space-y-2.5">
              {picked.map((p, i) => (
                <li key={p.id} className="pick-word flex items-center gap-3" style={{ animationDelay: `${1.6 + i * 0.15}s` }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="truncate text-[15px] font-semibold">
                    {p.brand} {p.name}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="h-[230px] sm:h-[190px]" />
        </div>
      </section>

      {/* 조사 근거 */}
      <section className="border-y border-line bg-fog/50">
        <div className="page grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[36px]">
              남자들이 스킨케어에서
              <br />
              막히는 지점은 &lsquo;선택&rsquo;이었어요
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-steel">
              20대 남성 31명에게 직접 물었어요. 매장에서 묻기 민망하다는 답은 6%뿐이었고, 절반 가까이가 비교하다 지친다고 했어요.
            </p>
            <p className="mt-6 text-[12px] leading-5 text-mist">
              정함 자체 설문, 2026년 11월 16~17일, 20대 남성 31명(편의표본)
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="mb-5 text-[15px] font-bold">스킨케어할 때 가장 막막한 점</h3>
              <Bars rows={survey} />
            </div>
            <div>
              <h3 className="mb-5 text-[15px] font-bold">쓰다가 그만둔 이유</h3>
              <Bars rows={quit} />
            </div>
          </div>
        </div>
      </section>

      {/* 작동 방식 */}
      <section className="page py-20">
        <h2 className="text-[30px] font-extrabold tracking-[-0.035em] sm:text-[36px]">정함이 하는 일</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
          {[
            { t: "질문 8개로 피부 파악", d: "세안 후 느낌, 고민, 예민도, 면도 주기, 원하는 단계와 예산까지 탭 몇 번으로 답해요." },
            { t: `${products.length}개 제품을 대신 비교`, d: "피부 타입, 고민, 자극 가능성, 제형, 예산을 따져 단계마다 하나씩만 골라요." },
            { t: "다 쓸 때까지 챙겨요", d: "아침·저녁 체크와 용량 기준 소진 예정일로 재구매 시점을 알려드려요." },
          ].map((s, i) => (
            <li key={s.t} className="bg-white p-7 sm:p-8">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal text-[14px] font-bold text-teal">{i + 1}</span>
              <h3 className="mt-3 text-[19px] font-bold tracking-[-0.02em]">{s.t}</h3>
              <p className="mt-3 text-[15px] leading-7 text-steel">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="page">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-ink px-8 py-12 text-white sm:flex-row sm:items-center sm:px-12">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">오늘 밤 바를 것까지 1분이면 정해져요</h2>
            <p className="mt-2 text-[15px] text-white/60">추천 기준은 모두 공개해요. 광고비 받고 순위를 바꾸지 않아요.</p>
          </div>
          <Link href="/check" className="btn h-14 shrink-0 bg-teal px-7 text-[16px] text-white hover:bg-teal-deep">
            1분 진단 시작
          </Link>
        </div>
      </section>
    </>
  );
}
