"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";

export default function LoginPage() {
  const { user, ready, signInGoogle, signInEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) {
    return (
      <div className="page max-w-[520px] py-20">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">로그인 준비 중이에요</h1>
        <p className="mt-3 leading-7 text-steel">지금은 로그인 없이 쓸 수 있어요. 진단 결과와 체크 기록은 이 브라우저에 저장돼요.</p>
        <Link href="/check/" className="btn-primary mt-8">1분 진단 시작</Link>
      </div>
    );
  }

  if (!ready) return <div className="page py-24 text-steel">확인하는 중…</div>;

  if (user) {
    return (
      <div className="page max-w-[520px] py-20">
        <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">로그인되어 있어요</h1>
        <p className="mt-3 text-steel">{user.email}</p>
        <p className="mt-4 text-[15px] leading-7 text-steel">루틴, 체크, 피부 기록, 만족도가 계정에 저장돼서 다른 기기에서도 이어서 볼 수 있어요.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/me/" className="btn-primary">내 루틴</Link>
          <button type="button" onClick={() => signOut()} className="btn-ghost">로그아웃</button>
        </div>
      </div>
    );
  }

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg({ ok: false, t: "이메일 주소 형식을 확인해 주세요." });
    setBusy(true);
    const err = await signInEmail(email);
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: `${email}로 로그인 링크를 보냈어요. 메일함에서 링크를 누르면 바로 로그인돼요.` });
  };

  return (
    <div className="page max-w-[440px] py-16 sm:py-20">
      <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">로그인</h1>
      <p className="mt-3 text-[15px] leading-7 text-steel">로그인하면 폰과 PC에서 같은 루틴을 보고, 아침·저녁 알림을 받을 수 있어요. 이 브라우저에 있던 기록은 계정으로 옮겨져요.</p>

      <button
        type="button"
        onClick={async () => {
          const err = await signInGoogle();
          if (err) setMsg({ ok: false, t: err });
        }}
        className="btn-ghost mt-8 h-12 w-full gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
        Google로 계속하기
      </button>

      <div className="my-6 flex items-center gap-3 text-[13px] text-mist">
        <span className="h-px flex-1 bg-line" />또는<span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendEmail} noValidate>
        <label htmlFor="em" className="text-[14px] font-semibold">이메일</label>
        <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 h-12 w-full rounded-xl border border-line px-4 text-[16px] outline-none placeholder:text-mist focus:border-teal" />
        <button type="submit" disabled={busy} className="btn-primary mt-3 h-12 w-full disabled:opacity-50">{busy ? "보내는 중…" : "로그인 링크 받기"}</button>
      </form>
      {msg && (
        <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-[14px] leading-6 ${msg.ok ? "bg-teal-wash text-teal-deep" : "bg-rose-wash text-rose"}`}>
          {msg.t}
        </p>
      )}
      <p className="mt-8 text-[12.5px] leading-5 text-mist">
        계속하면 <Link href="/privacy/" className="underline underline-offset-2">개인정보 처리방침</Link>에 동의하는 것으로 봐요. 피부 사진은 본인만 볼 수 있게 저장돼요.
      </p>
    </div>
  );
}
