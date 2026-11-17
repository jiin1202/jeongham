import type { Concern, SkinType } from "./model";

export type Answers = {
  feel?: "tight" | "tzone" | "allshine" | "fine";
  concerns: Concern[];
  sensitive?: "often" | "sometimes" | "rarely";
  shave?: "daily" | "few" | "rare";
  current?: "none" | "aio" | "few" | "many";
  steps?: "min" | "basic" | "full";
  sunPain?: "sticky" | "white" | "eyes" | "never";
  budget?: 50000 | 80000 | 120000 | 999999;
};

export type Option<V> = { value: V; label: string; hint?: string };

export type Question =
  | { key: "feel"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["feel"]>>[] }
  | { key: "concerns"; title: string; sub?: string; type: "multi"; max: number; options: Option<Concern>[] }
  | { key: "sensitive"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["sensitive"]>>[] }
  | { key: "shave"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["shave"]>>[] }
  | { key: "current"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["current"]>>[] }
  | { key: "steps"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["steps"]>>[] }
  | { key: "sunPain"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["sunPain"]>>[] }
  | { key: "budget"; title: string; sub?: string; type: "single"; options: Option<NonNullable<Answers["budget"]>>[] };

export const questions: Question[] = [
  {
    key: "feel",
    type: "single",
    title: "세안하고 30분 뒤, 피부는 어때요?",
    sub: "아무것도 안 바른 상태 기준",
    options: [
      { value: "tight", label: "당기고 건조해요" },
      { value: "tzone", label: "이마·코만 번들거려요" },
      { value: "allshine", label: "얼굴 전체가 번들거려요" },
      { value: "fine", label: "딱히 느낌 없어요" },
    ],
  },
  {
    key: "concerns",
    type: "multi",
    max: 2,
    title: "요즘 제일 신경 쓰이는 건?",
    sub: "최대 2개",
    options: [
      { value: "trouble", label: "트러블·여드름" },
      { value: "pore", label: "모공·블랙헤드" },
      { value: "oil", label: "번들거림" },
      { value: "dry", label: "건조·각질" },
      { value: "redness", label: "붉은기·예민함" },
      { value: "tone", label: "트러블 흔적·칙칙함" },
      { value: "aging", label: "탄력·잔주름" },
    ],
  },
  {
    key: "sensitive",
    type: "single",
    title: "새 제품 쓰면 따갑거나 뭐가 올라온 적 있어요?",
    options: [
      { value: "often", label: "자주 그래요" },
      { value: "sometimes", label: "가끔요" },
      { value: "rarely", label: "거의 없어요" },
    ],
  },
  {
    key: "shave",
    type: "single",
    title: "면도는 얼마나 자주 해요?",
    options: [
      { value: "daily", label: "거의 매일" },
      { value: "few", label: "2~3일에 한 번" },
      { value: "rare", label: "거의 안 해요" },
    ],
  },
  {
    key: "current",
    type: "single",
    title: "지금은 몇 개 바르고 있어요?",
    options: [
      { value: "none", label: "아무것도 안 발라요" },
      { value: "aio", label: "올인원 하나" },
      { value: "few", label: "2~3개" },
      { value: "many", label: "4개 이상" },
    ],
  },
  {
    key: "steps",
    type: "single",
    title: "루틴은 몇 단계가 좋아요?",
    options: [
      { value: "min", label: "최소로", hint: "세안 · 올인원 · 선크림" },
      { value: "basic", label: "기본으로", hint: "세안 · 토너 · 보습 · 선크림" },
      { value: "full", label: "제대로", hint: "세안 · 토너 · 세럼 · 보습 · 선크림" },
    ],
  },
  {
    key: "sunPain",
    type: "single",
    title: "선크림 쓸 때 제일 싫은 건?",
    options: [
      { value: "sticky", label: "끈적이고 번들거림" },
      { value: "white", label: "얼굴이 하얗게 뜨는 것" },
      { value: "eyes", label: "눈이 시린 것" },
      { value: "never", label: "안 써봤어요" },
    ],
  },
  {
    key: "budget",
    type: "single",
    title: "루틴 전체에 쓸 예산은?",
    sub: "올리브영 정상가 합계 기준, 기획 구성 포함",
    options: [
      { value: 50000, label: "5만 원 이하" },
      { value: 80000, label: "8만 원 이하" },
      { value: 120000, label: "12만 원 이하" },
      { value: 999999, label: "상관없어요" },
    ],
  },
];

export function skinTypeOf(a: Answers): SkinType {
  switch (a.feel) {
    case "tight":
      return "dry";
    case "tzone":
      return "combo";
    case "allshine":
      return "oily";
    default:
      return "normal";
  }
}

export const skinTypeLabel: Record<SkinType, string> = {
  dry: "건성",
  oily: "지성",
  combo: "복합성",
  normal: "중성",
};

export const concernLabel: Record<Concern, string> = {
  trouble: "트러블",
  pore: "모공",
  oil: "번들거림",
  dry: "건조",
  redness: "예민·붉은기",
  tone: "흔적·톤",
  aging: "탄력",
};

export function isComplete(a: Answers) {
  return questions.every((q) => {
    if (q.type === "multi") return a.concerns.length > 0;
    return a[q.key] !== undefined;
  });
}
