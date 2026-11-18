import { fitLine, type Product } from "@/lib/model";

// 제품 종류 아래 붙는 한 줄 특성: "건조한 여드름성 피부"
export default function FitLine({ p, size = "sm", className = "" }: { p: Product; size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md bg-teal-wash font-semibold text-teal-deep ${
        lg ? "px-3 py-1.5 text-[15px]" : "px-2 py-0.5 text-[12.5px]"
      } ${className}`}
    >
      <svg width={lg ? 14 : 11} height={lg ? 14 : 11} viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
        <path d="M2 6.3l2.4 2.4L10 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="truncate">{fitLine(p)}</span>
    </span>
  );
}
