"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, cloudEnabled } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/track";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "off" | "on" | "denied" | "busy";

export default function PushSettings() {
  const { user } = useAuth();
  const [state, setState] = useState<State>("busy");
  const [open, setOpen] = useState(false);
  const [am, setAm] = useState(8);
  const [pm, setPm] = useState(22);
  const [msg, setMsg] = useState<string | null>(null);

  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  useEffect(() => {
    if (!supported || !VAPID || !cloudEnabled) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
      if (sub && supabase) {
        const { data } = await supabase.from("push_subs").select("am_hour,pm_hour").eq("endpoint", sub.endpoint).maybeSingle();
        if (data) {
          setAm(data.am_hour);
          setPm(data.pm_hour);
        }
      }
    });
  }, [supported, user]);

  if (state === "unsupported") return null;

  const enable = async () => {
    setMsg(null);
    if (!user || !supabase) return;
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
      const j = sub.toJSON();
      const { error } = await supabase.from("push_subs").upsert({ endpoint: sub.endpoint, user_id: user.id, keys: j.keys, am_hour: am, pm_hour: pm });
      if (error) throw error;
      track("push_on");
      setState("on");
      setMsg("알림을 켰어요.");
    } catch {
      setState("off");
      setMsg("알림을 켜지 못했어요. 아이폰은 Safari 공유 버튼에서 '홈 화면에 추가'한 뒤 다시 시도해 주세요.");
    }
  };

  const saveHours = async () => {
    if (!supabase) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const { error } = await supabase.from("push_subs").update({ am_hour: am, pm_hour: pm }).eq("endpoint", sub.endpoint);
    setMsg(error ? "시간을 저장하지 못했어요. 다시 시도해 주세요." : "알림 시간을 저장했어요.");
  };

  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase?.from("push_subs").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    track("push_off");
    setState("off");
    setMsg("알림을 껐어요.");
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn-ghost">
        {state === "on" ? "알림 켜짐" : "아침·저녁 알림 받기"}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-line p-5 text-[14px]">
          {!user ? (
            <p className="text-steel">
              알림은 로그인해야 받을 수 있어요. 어느 기기로 보낼지 알아야 해서요.{" "}
              <Link href="/login/" className="font-semibold text-ink underline underline-offset-4">로그인</Link>
            </p>
          ) : state === "denied" ? (
            <p className="text-steel">브라우저 설정에서 이 사이트의 알림이 막혀 있어요. 사이트 설정에서 알림을 허용한 뒤 다시 눌러주세요.</p>
          ) : (
            <>
              <p className="text-steel">체크를 안 한 날에만 보내요. 그리고 저녁에 코치가 기록을 보고 며칠 빠졌거나, 따가웠거나, 제품이 다 떨어져 가면 먼저 한 번 연락해요. 하루 한 번을 넘기지 않아요. 아이폰은 Safari에서 '홈 화면에 추가'한 뒤 켜야 와요.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  아침
                  <select value={am} onChange={(e) => setAm(+e.target.value)} className="rounded-lg border border-line px-2 py-1.5">
                    {hours.filter((h) => h >= 5 && h <= 12).map((h) => <option key={h} value={h}>{h}시</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  저녁
                  <select value={pm} onChange={(e) => setPm(+e.target.value)} className="rounded-lg border border-line px-2 py-1.5">
                    {hours.filter((h) => h >= 18).map((h) => <option key={h} value={h}>{h}시</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {state === "on" ? (
                  <>
                    <button type="button" onClick={saveHours} className="btn-primary h-10 px-4 text-[14px]">시간 저장</button>
                    <button type="button" onClick={disable} className="btn h-10 px-4 text-[14px] text-steel hover:text-rose">알림 끄기</button>
                  </>
                ) : (
                  <button type="button" onClick={enable} disabled={state === "busy"} className="btn-primary h-10 px-4 text-[14px] disabled:opacity-50">알림 켜기</button>
                )}
              </div>
            </>
          )}
          {msg && <p role="status" className="mt-3 text-[13px] text-steel">{msg}</p>}
        </div>
      )}
    </div>
  );
}
