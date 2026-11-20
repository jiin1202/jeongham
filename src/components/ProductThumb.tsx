import type { Category } from "@/lib/model";

type Item = { id: string; brand: string; name: string; fullName: string; category: Category };
type Props = {
  p: Item;
  /** 정사각형 한 변(px). 반응형이 필요하면 className으로 덮어쓰기 */
  size?: number;
  className?: string;
  priority?: boolean;
};

// 판매처 사진은 기획 구성·문구·모델 컷이 섞여 있어, 종류별 용기 모양 일러스트로 통일한다.
type Shape = "tube" | "bottle" | "dropper" | "pump" | "jar" | "stick" | "tub" | "pouch" | "patch";

function shapeOf(p: Item): Shape {
  const n = p.fullName;
  switch (p.category) {
    case "cleanser":
      return /오일|워터|밀크/.test(n) && !/폼/.test(n) ? "pump" : /밤/.test(n) ? "jar" : "tube";
    case "toner":
      return "bottle";
    case "serum":
      return /토너|부스터/.test(n) ? "bottle" : "dropper";
    case "moisturizer":
      return /로션|에멀전|플루이드/.test(n) ? "pump" : /튜브|젤 크림|수딩젤/.test(n) ? "tube" : "jar";
    case "allinone":
      return "pump";
    case "sun":
      return /스틱/.test(n) ? "stick" : "tube";
    case "pad":
      return "tub";
    case "sheet":
      return "pouch";
    case "pack":
      return /버블|튜브|워시오프/.test(n) ? "tube" : "jar";
    case "patch":
      return /코팩|코 팩|블랙헤드|돼지코/.test(n) ? "pouch" : "patch";
  }
}

const PALETTE: [string, string][] = [
  ["#FFF1A8", "#E8B800"],
  ["#D9F0E4", "#4FAE80"],
  ["#DEEBFA", "#5F8FCB"],
  ["#FCE3D8", "#DD8461"],
  ["#EAE3F7", "#8F78C8"],
  ["#EFE9DD", "#A88F63"],
  ["#E6EAEF", "#6F7D8E"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function Label({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
  const t = text.length > 9 ? text.slice(0, 8) + "…" : text;
  const fs = t.length <= 3 ? 7.5 : t.length <= 5 ? 6.5 : 5.2;
  return (
    <text x={x + w / 2} y={y} textAnchor="middle" fontSize={fs} fontWeight={700} fill="#1C2430" letterSpacing="-0.02em">
      {t}
    </text>
  );
}

function Art({ shape, body, accent, brand }: { shape: Shape; body: string; accent: string; brand: string }) {
  const stroke = { stroke: "#1C2430", strokeOpacity: 0.12, strokeWidth: 0.8 };
  switch (shape) {
    case "tube":
      return (
        <g>
          <path d="M33 16 h34 l-3 54 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 z" fill={body} {...stroke} />
          <rect x="31" y="12" width="38" height="6" rx="1.5" fill={accent} />
          <rect x="40" y="74" width="20" height="12" rx="3" fill={accent} />
          <rect x="38" y="36" width="24" height="1.4" rx="0.7" fill={accent} opacity="0.6" />
          <Label x={36} y={48} w={28} text={brand} />
        </g>
      );
    case "bottle":
      return (
        <g>
          <rect x="42" y="10" width="16" height="12" rx="2.5" fill={accent} />
          <rect x="45" y="21" width="10" height="5" fill={body} {...stroke} />
          <rect x="31" y="25" width="38" height="63" rx="7" fill={body} {...stroke} />
          <rect x="35" y="44" width="30" height="22" rx="3" fill="#fff" opacity="0.75" />
          <Label x={35} y={58} w={30} text={brand} />
        </g>
      );
    case "dropper":
      return (
        <g>
          <ellipse cx="50" cy="15" rx="6" ry="7" fill={accent} />
          <rect x="43" y="20" width="14" height="10" rx="2" fill="#1C2430" opacity="0.8" />
          <rect x="34" y="30" width="32" height="56" rx="8" fill={body} {...stroke} />
          <rect x="38" y="48" width="24" height="20" rx="3" fill="#fff" opacity="0.75" />
          <Label x={38} y={61} w={24} text={brand} />
        </g>
      );
    case "pump":
      return (
        <g>
          <path d="M50 8 h14 v4 h-10" fill="none" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="46" y="10" width="8" height="12" rx="1.5" fill={accent} />
          <rect x="41" y="21" width="18" height="7" rx="2" fill={accent} />
          <rect x="31" y="27" width="38" height="61" rx="8" fill={body} {...stroke} />
          <rect x="35" y="46" width="30" height="21" rx="3" fill="#fff" opacity="0.75" />
          <Label x={35} y={59} w={30} text={brand} />
        </g>
      );
    case "jar":
      return (
        <g>
          <rect x="22" y="34" width="56" height="13" rx="4" fill={accent} />
          <rect x="24" y="45" width="52" height="35" rx="7" fill={body} {...stroke} />
          <rect x="29" y="55" width="42" height="16" rx="3" fill="#fff" opacity="0.75" />
          <Label x={29} y={65.5} w={42} text={brand} />
        </g>
      );
    case "stick":
      return (
        <g>
          <rect x="37" y="10" width="26" height="30" rx="6" fill={accent} />
          <rect x="37" y="38" width="26" height="50" rx="6" fill={body} {...stroke} />
          <Label x={37} y={62} w={26} text={brand} />
        </g>
      );
    case "tub":
      return (
        <g>
          <rect x="18" y="38" width="64" height="14" rx="6" fill={accent} />
          <rect x="21" y="50" width="58" height="28" rx="8" fill={body} {...stroke} />
          <ellipse cx="50" cy="45" rx="14" ry="3" fill="#fff" opacity="0.55" />
          <Label x={21} y={67} w={58} text={brand} />
        </g>
      );
    case "pouch":
      return (
        <g>
          <path d="M26 16 l4 -3 4 3 4 -3 4 3 4 -3 4 3 4 -3 4 3 4 -3 4 3 4 -3 4 3 v68 l-4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 z" fill={body} {...stroke} />
          <circle cx="50" cy="40" r="11" fill={accent} opacity="0.85" />
          <rect x="31" y="58" width="38" height="14" rx="3" fill="#fff" opacity="0.75" />
          <Label x={31} y={67.5} w={38} text={brand} />
        </g>
      );
    case "patch":
      return (
        <g>
          <rect x="20" y="20" width="60" height="62" rx="8" fill={body} {...stroke} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={33 + c * 17} cy={34 + r * 13} r={r === 2 ? 0 : 5 - (r + c) % 2} fill={accent} opacity={0.85} />),
          )}
          <rect x="25" y="62" width="50" height="13" rx="3" fill="#fff" opacity="0.75" />
          <Label x={25} y={71} w={50} text={brand} />
        </g>
      );
  }
}

export default function ProductThumb({ p, size = 72, className = "" }: Props) {
  const [body, accent] = PALETTE[hash(p.brand) % PALETTE.length];
  const style = className.includes("w-") ? undefined : { width: size, height: size };
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl border border-line bg-[#F7F8FA] ${className}`} style={style}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label={`${p.brand} ${p.name}`}>
        <g transform="translate(50 50) scale(1.06) translate(-50 -50)">
          <Art shape={shapeOf(p)} body={body} accent={accent} brand={p.brand} />
        </g>
      </svg>
    </div>
  );
}
