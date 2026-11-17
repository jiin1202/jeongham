"use client";
import type { Answers } from "./quiz";

export type Saved = {
  answers: Answers;
  ids: string[]; // 저장한 루틴 제품
  start: Record<string, string>; // 제품별 사용 시작일 YYYY-MM-DD
  checks: Record<string, { am?: boolean; pm?: boolean }>;
};

const K_ANS = "jh.answers";
const K_SAVED = "jh.saved";
const K_MINE = "jh.mine";

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
  } catch {
    /* 저장 불가 환경(시크릿 모드 등)에서는 무시 */
  }
}

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const loadAnswers = () => read<Answers>(K_ANS);
export const saveAnswers = (a: Answers) => write(K_ANS, a);

export const loadSaved = () => read<Saved>(K_SAVED);
export const saveSaved = (s: Saved) => write(K_SAVED, s);
export const clearSaved = () => {
  try {
    localStorage.removeItem(K_SAVED);
  } catch {}
};

export const loadMine = () => read<string[]>(K_MINE) ?? [];
export const saveMine = (ids: string[]) => write(K_MINE, ids);
