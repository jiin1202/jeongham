import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import FitLine from "@/components/FitLine";
import { products } from "@/lib/model";
import { buildRoutine } from "@/lib/engine";
import type { Answers } from "@/lib/quiz";

// 히어로 예시: 실제 엔진이 고른 복합성·트러블 루틴(빌드 시점 계산)
const SAMPLE: Answers = { feel: "tzone", concerns: ["trouble", "oil"], sensitive: "sometimes", shave: "few", current: "few", steps: "min", sunPain: "sticky", budget: 80000 };

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
            <div className={`h-2 rounded-full ${i === 0 ? "bg-lemon-deep" : "bg-mist/60"}`} style={{ width: `${r.v * 1.6}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const routine = buildRoutine(SAMPLE);
  const picked = routine.picks.map((x) => x.product);
  const wall = products.slice(0, 90);

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
            질문 8개만 답해주세요. 올리브영 인기템 {products.length}개 성분표는
            저희가 미리 다 읽어놨어요.
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

        <div aria-hidden="true" className="rounded-[28px] bg-lemon p-6 sm:p-8">
          <p className="text-[13px] font-semibold text-ink/65">이렇게 답하면</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {["이마·코만 번들거려요", "트러블·번들거림", "가끔 예민해요", "면도 2~3일에 한 번", "최소 단계로", "8만 원 이하"].map((a, i) => (
              <li
                key={a}
                className="pick-word rounded-full bg-white/75 px-3.5 py-1.5 text-[14px] font-medium text-ink ring-1 ring-ink/10"
                style={{ animationDelay: `${0.3 + i * 0.12}s` }}
              >
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[13px] font-semibold text-ink/65">정함이 이렇게 정해요</p>
          <div className="mt-3 rounded-2xl bg-white p-5 shadow-[0_16px_48px_-12px_rgba(120,90,0,0.28)]">
            <p className="text-[13px] text-steel">복합성 피부, 트러블·번들거림, 3단계 {routine.total.toLocaleString()}원</p>
            <ol className="mt-3 space-y-2.5">
              {picked.map((p, i) => (
                <li key={p.id} className="pick-word flex items-center gap-3" style={{ animationDelay: `${1.6 + i * 0.15}s` }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lemon-deep text-[12px] font-bold text-ink">
                    {i + 1}
                  </span>
                  <ProductThumb p={p} size={40} priority />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">
                      {p.brand} {p.name}
                    </span>
                    <FitLine p={p} className="mt-0.5" />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 만든 이유 */}
      <section className="relative overflow-hidden bg-lemon">
        <div aria-hidden="true" className="absolute inset-0 select-none">
          <div className="flex flex-wrap content-start gap-x-4 gap-y-2 p-6 text-[13px] leading-6 text-ink/20 sm:text-[15px]">
            {wall.map((p, i) => (
              <span key={p.id} className={i % 7 === 0 ? "text-ink/40" : ""}>
                {p.brand} {p.name}
              </span>
            ))}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,227,71,0.97)_0%,rgba(255,227,71,0.9)_38%,rgba(255,227,71,0.35)_75%,rgba(255,227,71,0)_100%)]" />
        </div>
        <div className="page relative py-28 text-center sm:py-36">
          <h2 className="mx-auto max-w-2xl text-[32px] font-extrabold leading-[1.2] tracking-[-0.045em] text-ink sm:text-[48px]">
            너무 많은 제품,
            <br />
            도대체 뭘 사야 할지 모르겠다면?
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[16px] leading-7 text-ink/65">
            올리브영 스킨케어 랭킹만 열어봐도 이래요. 이걸 언제 다 비교해요.
            그래서 저희가 대신 다 읽어봤어요.
          </p>
          <Link href="/check" className="mt-9 inline-flex h-14 items-center rounded-2xl bg-ink px-7 text-[16px] font-bold text-white transition-colors hover:bg-ink/85">
            1분 만에 정하기
          </Link>
        </div>
      </section>

      {/* 조사 근거 */}
      <section className="bg-lemon-wash/70">
        <div className="page grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[36px]">
              남자들이 스킨케어에서
              <br />
              막히는 지점은 &lsquo;선택&rsquo;이었어요
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-steel">
              20대 남자들한테 직접 물어봤어요. 매장 직원한테 묻기 민망하다는 사람은 6%뿐. 절반 가까이는 비교하다 지쳐서 못 고르고 있었어요.
            </p>
            <p className="mt-6 text-[12px] leading-5 text-mist">
              정함 자체 설문, 2026년 11월 16일부터 11월 20일(금)까지 진행, 20대 남성 대상 편의표본, 중간 집계 기준
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
            { t: `${products.length}개 제품을 대신 비교`, d: "전성분에서 고민에 맞는 성분과 자극 가능 성분을 찾고, 피부 타입·제형·예산까지 따져 단계마다 하나씩만 골라요." },
            { t: "효과 볼 때까지 4주 챙겨요", d: "주차별로 할 일만 알려드려요. 4주 뒤엔 나랑 같은 피부 타입 남자들이 실제로 써본 결과도 볼 수 있어요." },
          ].map((s, i) => (
            <li key={s.t} className="bg-white p-7 sm:p-8">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-lemon-deep text-[14px] font-bold text-lemon-ink">{i + 1}</span>
              <h3 className="mt-3 text-[19px] font-bold tracking-[-0.02em]">{s.t}</h3>
              <p className="mt-3 text-[15px] leading-7 text-steel">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4주 플랜 */}
      <section className="border-y border-line bg-fog">
        <div className="page grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[36px]">
              면접까지 4주 남았다면,
              <br />
              지금 시작하면 딱 맞아요
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-7 text-steel">
              트러블 케어는 최소 4주는 써봐야 알 수 있대요. 루틴을 정하고 날짜만 넣으면, 그날에 맞춰 주차별로 할 일을 챙겨드려요.
            </p>
            <Link href="/check" className="btn-primary mt-8">4주 루틴 정하기</Link>
          </div>
          <ol className="grid gap-2">
            {[
              ["1주차", "바르는 습관부터", "아침·저녁 체크, 첫 피부 사진"],
              ["2주차", "성분에 적응하기", "센 성분은 이틀에 한 번 저녁에만"],
              ["3주차", "필요하면 하나 더", "팩이나 패치를 주 1~2회"],
              ["4주차", "결과 확인", "첫 주 사진과 비교, 4주 후기"],
              ["D-7", "새 제품은 그만", "쓰던 그대로 가요"],
            ].map(([w, t, d], i) => (
              <li key={w} className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${i === 4 ? "bg-ink text-white" : "bg-white"}`}>
                <span className={`w-12 shrink-0 text-[13px] font-bold ${i === 4 ? "text-lemon" : "text-lemon-ink"}`}>{w}</span>
                <span>
                  <span className="block text-[15.5px] font-bold">{t}</span>
                  <span className={`block text-[13.5px] ${i === 4 ? "text-white/70" : "text-steel"}`}>{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="page pt-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-lemon px-8 py-12 text-ink sm:flex-row sm:items-center sm:px-12">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">오늘 밤 바를 것까지 1분이면 정해져요</h2>
            <p className="mt-2 text-[15px] text-ink/65">추천 기준은 모두 공개해요. 광고비 받고 순위를 바꾸지 않아요.</p>
          </div>
          <Link href="/check" className="btn h-14 shrink-0 bg-ink px-7 text-[16px] text-white hover:bg-ink/85">
            1분 진단 시작
          </Link>
        </div>
      </section>
    </>
  );
}
