import type { Metadata } from "next";
export const metadata: Metadata = { title: "개인정보 처리방침 | 정함" };

const rows: [string, string][] = [
  ["모으는 정보", "로그인 시 이메일 주소. 진단 답변(피부 느낌, 고민, 예민도, 면도 주기, 단계, 예산), 저장한 루틴과 체크 기록, 피부 기록과 사진(선택), 제품 만족도, 서비스 이용 기록(익명 ID 기준)."],
  ["4주 후기", "직접 보내기를 누른 경우에만 제품, 만족도, 고민 변화, 재구매 의향과 함께 피부 타입·첫 번째 고민·예민도·면도 주기를 익명 ID로 저장해요. 다른 사람에게는 같은 피부 타입 3명 이상이 모였을 때 평균과 비율로만 보여줘요."],
  ["쓰는 목적", "루틴 추천과 기록 보관, 기기 간 동기화, 알림 발송, 서비스 개선을 위한 통계(개인을 알아볼 수 없게 집계)."],
  ["보관 기간", "회원 탈퇴 또는 삭제 요청 시까지. 로그인하지 않은 경우 정보는 이용자의 브라우저에만 저장돼요."],
  ["피부 사진", "본인 계정에서만 열 수 있는 비공개 저장소에 보관하고, 추천이나 통계에 쓰지 않아요."],
  ["제3자 제공", "제공하지 않아요. 데이터 저장은 Supabase, 사이트 호스팅은 Vercel을 이용해요."],
  ["삭제 요청", "내 루틴 화면에서 루틴을 지울 수 있고, 계정 전체 삭제는 운영자에게 메일로 요청하면 처리해요."],
];

export default function Privacy() {
  return (
    <div className="page max-w-[720px] pb-10 pt-10 sm:pt-14">
      <h1 className="text-[32px] font-extrabold tracking-[-0.04em]">개인정보 처리방침</h1>
      <p className="mt-3 text-[14px] text-steel">시행일 2026년 11월 17일. 정함은 대학 과제로 만든 시범 서비스예요.</p>
      <dl className="mt-8 divide-y divide-line border-y border-line text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-6">
            <dt className="font-semibold">{k}</dt>
            <dd className="leading-7 text-steel">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
