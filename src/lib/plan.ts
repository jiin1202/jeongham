import type { Saved, SkinLog, Feedback } from "./store";
import type { Product } from "./model";
import { categoryLabel } from "./model";

export const DAY = 86400000;
const parse = (s: string) => new Date(s + "T00:00:00");
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** done이 없으면 체크할 수 없는 안내(팁) */
export type Task = { text: string; done?: boolean; href?: string };
export type Week = { n: 1 | 2 | 3 | 4; title: string; from: string; to: string; tasks: Task[]; note?: string };

/** 루틴 시작일부터 4주. 체크·피부 기록·후기로 진행 여부를 계산한다 */
export function buildPlan(s: Saved, items: Product[], special: Product[], logs: SkinLog[], fb: Feedback, todayKey: string) {
  const startKey = Object.values(s.start).sort()[0] ?? todayKey;
  const start = parse(startKey);
  const daysIn = Math.floor((parse(todayKey).getTime() - start.getTime()) / DAY);
  const range = (w: number) => {
    const from = new Date(start.getTime() + (w - 1) * 7 * DAY);
    const to = new Date(from.getTime() + 6 * DAY);
    return { from: key(from), to: key(to) };
  };
  const checkedDays = (from: string, to: string) =>
    Object.entries(s.checks).filter(([d, c]) => d >= from && d <= to && (c.am || c.pm)).length;
  const logged = (from: string, to: string) => logs.some((l) => l.day >= from && l.day <= to);

  const active = items.find((p) => p.activeStrong.length > 0 && p.category !== "cleanser");
  const sun = items.find((p) => p.category === "sun");
  const trouble = s.answers.concerns.includes("trouble");

  const weeks: Week[] = [1, 2, 3, 4].map((n) => {
    const { from, to } = range(n);
    const habit: Task = { text: "일주일에 5일 이상 체크하기", done: checkedDays(from, to) >= 5 };
    const log: Task = { text: n === 1 ? "첫 피부 기록 남기기 (4주 뒤 비교할 기준)" : "피부 기록 1번", done: logged(from, to), href: "/log/" };
    if (n === 1)
      return {
        n: 1, from, to, title: "바르는 습관부터",
        tasks: [habit, log, ...(sun ? [{ text: "선크림은 손가락 두 마디만큼" }] : [])],
        note: "처음 쓰는 제품이 여러 개면 하루 이틀 간격으로 하나씩 더해야, 뭐가 안 맞는지 알 수 있어요.",
      };
    if (n === 2)
      return {
        n: 2, from, to, title: active ? "성분에 적응하기" : "따가운 데 없는지 보기",
        tasks: [
          active
            ? { text: `${active.name}은 이틀에 한 번, 저녁에만`, href: `/p/${active.id}/` }
            : { text: "바르고 따갑거나 붉어지면 그 제품만 하루 쉬기" },
          habit,
          log,
        ],
      };
    if (n === 3)
      return {
        n: 3, from, to, title: special.length ? "필요하면 하나 더" : "꾸준히 가기",
        tasks: [
          ...(special[0] ? [{ text: `${categoryLabel[special[0].category]} 주 1~2회 더해 보기`, href: `/p/${special[0].id}/` }] : []),
          habit,
          log,
        ],
      };
    const reviewed = items.filter((p) => fb[p.id]?.change).length;
    return {
      n: 4, from, to, title: "4주 결과 확인",
      tasks: [
        { text: "첫 주 기록과 비교하기", done: logged(from, to), href: "/log/" },
        { text: `제품별 4주 후기 남기기 (${reviewed}/${items.length})`, done: reviewed === items.length && items.length > 0 },
        habit,
      ],
      note: trouble ? "트러블 케어 제품은 최소 4주는 써봐야 효과를 판단할 수 있어요(미국피부과학회 AAD)." : undefined,
    };
  });

  const current = Math.min(4, Math.max(1, Math.floor(daysIn / 7) + 1)) as 1 | 2 | 3 | 4;
  let goal: { label: string; dLeft: number; freeze: boolean } | null = null;
  if (s.goal?.date) {
    const dLeft = Math.round((parse(s.goal.date).getTime() - parse(todayKey).getTime()) / DAY);
    goal = { label: s.goal.label, dLeft, freeze: dLeft >= 0 && dLeft <= 7 };
  }
  return { weeks, current, daysIn, done: daysIn >= 28, goal };
}
