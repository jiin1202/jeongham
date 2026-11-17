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
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  ready: true,
  signInGoogle: async () => "로그인을 쓸 수 없어요",
  signInEmail: async () => "로그인을 쓸 수 없어요",
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
      return error ? "메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요." : null;
    },
    signOut: async () => {
      await supabase?.auth.signOut();
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
