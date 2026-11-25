"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";

const nav = [
  { href: "/products", label: "제품" },
  { href: "/brands", label: "브랜드" },
  { href: "/counsel", label: "고민 상담" },
  { href: "/mine", label: "쓰는 제품 검사" },
  { href: "/guide", label: "가이드" },
  { href: "/me", label: "내 루틴" },
  { href: "/saved", label: "찜·비교" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="6" fill="none" stroke="#1C2430" strokeWidth="2" />
        <path d="M6 11.5l3.2 3.2L16 7.8" fill="none" stroke="#E8B800" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[19px] font-extrabold tracking-[-0.04em]">정함</span>
    </span>
  );
}

export default function Header() {
  const path = usePathname();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur">
      <div className="page flex h-16 items-center justify-between">
        <Link href="/" aria-label="정함 홈">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`hidden rounded-lg px-3 py-2 sm:block ${
                path?.startsWith(n.href) ? "bg-lemon-wash text-lemon-ink font-semibold" : "text-steel hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
          {cloudEnabled && (
            <Link href="/login" className={`rounded-lg px-3 py-2 ${path?.startsWith("/login") ? "font-semibold text-ink" : "text-steel hover:text-ink"}`}>
              {user ? "계정" : "로그인"}
            </Link>
          )}
          <Link href="/check" className="ml-1 rounded-lg bg-lemon px-3.5 py-2 font-semibold text-ink hover:bg-lemon-deep">
            진단하기
          </Link>
        </nav>
      </div>
      <nav className="page flex gap-1 overflow-x-auto pb-2 text-[13px] sm:hidden">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`shrink-0 rounded-full px-3 py-1.5 ${path?.startsWith(n.href) ? "bg-lemon-wash text-lemon-ink font-semibold" : "text-steel"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
