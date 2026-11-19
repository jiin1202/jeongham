import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guideBySlug, guides } from "@/data/guides";

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ slug: g.slug }));
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = guideBySlug.get(params.slug);
  return g ? { title: `${g.title} | 정함`, description: g.summary } : {};
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = guideBySlug.get(params.slug);
  if (!g) notFound();
  const others = guides.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <article className="page max-w-[680px] pb-10 pt-10 sm:pt-14">
      <Link href="/guide/" className="text-[13px] text-steel hover:text-ink">가이드</Link>
      <h1 className="mt-3 text-[32px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[38px]">{g.title}</h1>
      <p className="mt-4 text-[17px] leading-8 text-steel">{g.summary}</p>
      <div className="mt-10 space-y-8 text-[16px] leading-8">
        {g.body.map((b, i) => (
          <section key={i}>
            {b.h && <h2 className="mb-2 text-[20px] font-bold tracking-[-0.02em]">{b.h}</h2>}
            {b.p && <p>{b.p}</p>}
            {b.list && (
              <ul className="mt-1 space-y-2">
                {b.list.map((l) => (
                  <li key={l} className="relative pl-5 before:absolute before:left-0 before:top-[0.8em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-lemon-deep">{l}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {g.cta && <Link href={g.cta.href} className="btn-primary mt-12">{g.cta.label}</Link>}
      <section className="mt-12 border-t border-line pt-6">
        <h2 className="text-[14px] font-bold">출처 (2026년 11월 17일 확인)</h2>
        <ul className="mt-2 space-y-1 text-[13.5px] text-steel">
          {g.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">{s.title}</a></li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] text-mist">이 글은 일반적인 정보이고 진료를 대신하지 않아요.</p>
      </section>
      <section className="mt-12">
        <h2 className="text-[16px] font-bold">다른 가이드</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          {others.map((o) => <li key={o.slug}><Link href={`/guide/${o.slug}/`} className="hover:underline">{o.title}</Link></li>)}
        </ul>
      </section>
    </article>
  );
}
