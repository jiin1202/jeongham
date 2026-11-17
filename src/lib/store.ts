"use client";
import type { Answers } from "./quiz";

export type Saved = {
  answers: Answers;
  ids: string[];
  start: Record<string, string>;
  checks: Record<string, { am?: boolean; pm?: boolean }>;
};

export type SkinLog = {
  day: string;
  overall: number; // 1~5
  trouble: number; // 0~3
  oil: number;
  dry: number;
  note?: string;
  photo?: string; // 로컬: dataURL, 클라우드: storage 경로
};

export type Feedback = Record<string, { rating: number; comment?: string }>;

const K = { ans: "jh.answers", saved: "jh.saved", mine: "jh.mine", logs: "jh.logs", fb: "jh.feedback", anon: "jh.anon", events: "jh.events", diag: "jh.diag" };

function read<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    window.dispatchEvent(new Event("jh-store"));
    return true;
  } catch {
    return false;
  }
}

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const loadAnswers = () => read<Answers>(K.ans);
export const saveAnswers = (a: Answers) => write(K.ans, a);

export const loadSaved = () => read<Saved>(K.saved);
export const saveSavedLocal = (s: Saved) => write(K.saved, s);
export const clearSavedLocal = () => {
  try {
    localStorage.removeItem(K.saved);
  } catch {}
};

export const loadMine = () => read<string[]>(K.mine) ?? [];
export const saveMine = (ids: string[]) => write(K.mine, ids);

export const loadLogs = () => read<SkinLog[]>(K.logs) ?? [];
export const saveLogsLocal = (l: SkinLog[]) => write(K.logs, l);

export const loadFeedback = () => read<Feedback>(K.fb) ?? {};
export const saveFeedbackLocal = (f: Feedback) => write(K.fb, f);

export function anonId() {
  let id = read<string>(K.anon);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    write(K.anon, id);
  }
  return id;
}

export type LocalEvent = { type: string; payload?: Record<string, unknown>; at: string };
export const loadLocalEvents = () => read<LocalEvent[]>(K.events) ?? [];
export const pushLocalEvent = (e: LocalEvent) => {
  const l = loadLocalEvents();
  l.push(e);
  write(K.events, l.slice(-500));
};

export const lastDiagKey = () => read<string>(K.diag);
export const setLastDiagKey = (k: string) => write(K.diag, k);
