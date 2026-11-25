"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { pullFromCloud } from "./sync";

type Ctx = {
  user: User | null;
  ready: boolean;
  signInGoogle: () => Promise<string | null>;
  signInEmail: (email: string) => Promise<string | null>;
  signInPassword: (email: string, password: string) => Promise<string | null>;
  setPassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  ready: true,
  signInGoogle: async () => "로그인을 쓸 수 없어요",
  signInEmail: async () => "로그인을 쓸 수 없어요",
  signInPassword: async () => "로그인을 쓸 수 없어요",
  setPassword: async () => "로그인을 쓸 수 없어요",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
      if (data.session?.user) pullFromCloud(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      setUser(session?.user ?? null);
      if (ev === "SIGNED_IN" && session?.user) pullFromCloud(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const redirect = () => `${location.origin}/me/`;

  const value: Ctx = {
    user,
    ready,
    signInGoogle: async () => {
      if (!supabase) return "지금은 로그인을 쓸 수 없어요.";
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect() } });
      return error ? "구글 로그인을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요." : null;
    },
    signInEmail: async (email) => {
      if (!supabase) return "지금은 로그인을 쓸 수 없어요.";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
      if (!error) return null;
      // 무료 메일 발송은 시간당 횟수 제한이 있어 자주 누르면 막힌다
      if (error.status === 429 || /rate|seconds|too many/i.test(error.message)) return "메일을 너무 자주 요청했어요. 방금 받은 메일이 있으면 그걸 쓰고, 없으면 잠시 뒤 다시 시도해 주세요.";
      return "메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.";
    },
    // 메일 링크가 다른 브라우저에서 열리는 경우를 위해: 한 번 로그인한 뒤 비밀번호를 정해 두면 어디서든 바로 로그인
    signInPassword: async (email, password) => {
      if (!supabase) return "지금은 로그인을 쓸 수 없어요.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? "이메일이나 비밀번호가 맞지 않아요. 비밀번호를 아직 안 정했다면 메일 로그인 후 정해 주세요." : null;
    },
    setPassword: async (password) => {
      if (!supabase) return "지금은 로그인을 쓸 수 없어요.";
      const { error } = await supabase.auth.updateUser({ password });
      return error ? `비밀번호를 정하지 못했어요. (${error.message.slice(0, 60)})` : null;
    },
    signOut: async () => {
      await supabase?.auth.signOut();
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
