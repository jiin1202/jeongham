"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, cloudEnabled } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/track";

// 붙여넣을 때 "Public Key:" 같은 머리말·공백·따옴표가 섞여도 키 부분(base64url 80자 이상)만 쓴다
const VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").match(/[A-Za-z0-9_-]{80,}/)?.[0] ?? "";

function b64ToBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "off" | "on" | "denied" | "busy";

type Props = { amHour?: number; pmHour?: number; embedded?: boolean };

/** embedded: 알림 설정 패널 안에서 시간은 바깥에서 받아 쓰고, 여닫기 버튼 없이 보여준다 */
export default function PushSettings({ amHour, pmHour, embedded }: Props = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<State>("busy");
  const [open, setOpen] = useState(!!embedded);
  const [am, setAm] = useState(8);
  const [pm, setPm] = useState(22);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (amHour !== undefined) setAm(amHour);
    if (pmHour !== undefined) setPm(pmHour);
  }, [amHour, pmHour]);

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
    // 어느 단계에서 실패했는지 사용자에게 알려준다(권한 → 등록 → 구독 → 저장)
    let step = "권한 요청";
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        if (perm !== "denied") setMsg("알림 권한을 허용해야 켤 수 있어요.");
        return;
      }
      step = "알림 준비";
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      step = "구독";
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
      step = "저장";
      const j = sub.toJSON();
      const { error } = await supabase.from("push_subs").upsert({ endpoint: sub.endpoint, user_id: user.id, keys: j.keys, am_hour: am, pm_hour: pm });
      if (error) throw error;
      track("push_on");
      setState("on");
      setMsg("알림을 켰어요.");
    } catch (e) {
      setState("off");
      const why = String((e as { message?: string })?.message ?? e).slice(0, 80);
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      setMsg(`알림을 켜지 못했어요(${step} 단계: ${why}).${ios ? " 아이폰은 Safari 공유 버튼에서 '홈 화면에 추가'한 뒤 다시 시도해 주세요." : ""}`);
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
      {!embedded && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn-ghost">
          {state === "on" ? "알림 켜짐" : "아침·저녁 알림 받기"}
        </button>
      )}
      {open && (
        <div className={embedded ? "text-[14px]" : "mt-3 rounded-2xl border border-line p-5 text-[14px]"}>
          {!user ? (
            <p className="text-steel">
              알림은 로그인해야 받을 수 있어요. 어느 기기로 보낼지 알아야 해서요.{" "}
              <Link href="/login/" className="font-semibold text-ink underline underline-offset-4">로그인</Link>
            </p>
          ) : state === "denied" ? (
            <p className="text-steel">브라우저 설정에서 이 사이트의 알림이 막혀 있어요. 사이트 설정에서 알림을 허용한 뒤 다시 눌러주세요.</p>
          ) : (
            <>
              <p className="text-steel">{embedded && "위에서 고른 시간(정각 기준)에 보내요. "}체크를 안 한 날에만 보내요. 그리고 저녁에 코치가 기록을 보고 며칠 빠졌거나, 따가웠거나, 제품이 다 떨어져 가면 먼저 한 번 연락해요. 하루 한 번을 넘기지 않아요. 아이폰은 Safari에서 “홈 화면에 추가”한 뒤 켜야 와요.</p>
              {!embedded && <div className="mt-4 flex flex-wrap items-center gap-3">
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
              </div>}
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
