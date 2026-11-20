import { NextResponse, type NextRequest } from "next/server";

// 공개 주소(production)는 정식 오픈 전까지 '준비 중' 화면만 보여준다. 미리보기(preview) 배포는 영향 없음.
const HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>정함 | 준비 중</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Pretendard,system-ui,sans-serif;background:#FFF8D6;color:#1C2430">
<div style="text-align:center;padding:24px"><h1 style="font-size:28px;margin:0 0 8px">정함은 오픈 준비 중이에요</h1><p style="margin:0;color:#5C6878">곧 만나요.</p></div></body></html>`;

export function middleware(_req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(HTML, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  }
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };
