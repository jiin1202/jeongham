// 루틴을 휴대폰 캘린더 일정으로 만든다(.ics / 구글 캘린더 링크).
// 알림은 사용자 캘린더 앱이 띄우므로 서버·로그인·푸시 구독이 필요 없다.
import { categoryLabel, type Category, type Product } from "./model";
import { daysToEmpty } from "./engine";

export type Times = { am: string | null; pm: string | null }; // "HH:MM" 또는 null(안 받음)

const ORDER: Partial<Record<Category, number>> = { cleanser: 0, pad: 1, toner: 2, serum: 3, moisturizer: 4, allinone: 4, sun: 5 };
const DAILY = new Set(Object.keys(ORDER));
const DAY = 86400000;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const parse = (k: string) => new Date(k + "T00:00:00");
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const hm = (t: string) => t.replace(":", "") + "00";
const plusMin = (t: string, m: number) => {
  const [h, mm] = t.split(":").map(Number);
  const x = h * 60 + mm + m;
  return `${pad(Math.floor(x / 60) % 24)}:${pad(x % 60)}`;
};

/** 아침·저녁에 바를 순서. 레티노이드는 저녁만, 선크림은 아침만 */
export function stepsFor(items: Product[], when: "am" | "pm") {
  return items
    .filter((p) => DAILY.has(p.category))
    .filter((p) => (when === "am" ? !p.activeStrong.includes("retinoid") : p.category !== "sun"))
    .sort((a, b) => (ORDER[a.category] ?? 9) - (ORDER[b.category] ?? 9))
    .map((p, i) => `${i + 1}. ${categoryLabel[p.category]} - ${p.brand} ${p.name}`);
}

type Ev = { uid: string; title: string; date: Date; time: string; minutes: number; detail: string; rrule?: string };

export function buildEvents(items: Product[], startKey: string, todayKey: string, t: Times, site: string): Ev[] {
  const start = parse(startKey);
  const today = parse(todayKey);
  const from = start > today ? start : today;
  // 이미 지난 날짜는 넣지 않고, 남은 4주(최소 1주)만 넣는다
  const left = Math.max(7, 28 - Math.round((from.getTime() - start.getTime()) / DAY));
  const link = `${site}/me/`;
  const evs: Ev[] = [];
  const routine = (when: "am" | "pm", time: string) => {
    const steps = stepsFor(items, when);
    if (!steps.length) return;
    evs.push({
      uid: `routine-${when}`,
      title: when === "am" ? "정함 · 아침 루틴" : "정함 · 저녁 루틴",
      date: from, time, minutes: 10, rrule: `FREQ=DAILY;COUNT=${left}`,
      detail: `${steps.join("\n")}\n\n바르고 체크하기: ${link}`,
    });
  };
  if (t.am) routine("am", t.am);
  if (t.pm) routine("pm", t.pm);
  const at = t.pm ?? t.am ?? "21:00";
  const milestone = (day: number, title: string, detail: string) =>
    addDays(start, day) >= today && evs.push({ uid: `day${day}`, title, date: addDays(start, day), time: at, minutes: 15, detail: `${detail}\n\n${link}` });
  milestone(6, "정함 · 첫 주 피부 기록", "첫 주 끝. 피부 상태를 한 번 기록해 두면 4주 뒤 비교할 수 있어요.");
  milestone(13, "정함 · 2주 점검", "따갑거나 붉어진 제품이 있었는지, 트러블이 늘었는지 기록하고 코치에게 물어보세요.");
  milestone(27, "정함 · 4주 후기", "4주 동안 고민이 나아졌는지 남기고, 계속 쓸 제품과 바꿀 제품을 정해요.");
  for (const p of items) {
    const d = daysToEmpty(p) - 5;
    if (d < 7 || d > 120 || addDays(start, d) < today) continue;
    evs.push({
      uid: `reorder-${p.id}`, title: `정함 · ${p.name} 곧 떨어져요`, date: addDays(start, d), time: at, minutes: 10,
      detail: `${p.brand} ${p.name}이(가) 5일 정도 남았을 거예요. 다시 살지, 바꿀지 정해 주세요.\n\n${site}/p/${p.id}/`,
    });
  }
  return evs;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
// 75옥텟 줄 접기(멀티바이트 글자를 자르지 않게 글자 단위로)
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const VTZ = ["BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE"];

export function toIcs(evs: Ev[], stamp = new Date()) {
  const now = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}00Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jeongham//routine//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:정함 루틴", ...VTZ];
  for (const e of evs) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}-${ymd(e.date)}@jeongham`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Asia/Seoul:${ymd(e.date)}T${hm(e.time)}`,
      `DTEND;TZID=Asia/Seoul:${ymd(e.date)}T${hm(plusMin(e.time, e.minutes))}`,
      ...(e.rrule ? [`RRULE:${e.rrule}`] : []),
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.detail)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** 구글 캘린더 '일정 추가' 링크(반복 일정 1개) */
export function googleLink(e: Ev) {
  const d = ymd(e.date);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${d}T${hm(e.time)}/${d}T${hm(plusMin(e.time, e.minutes))}`,
    ctz: "Asia/Seoul",
    details: e.detail,
  });
  if (e.rrule) q.set("recur", `RRULE:${e.rrule}`);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
