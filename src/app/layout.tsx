import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import CompareBar from "@/components/CompareBar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "정함 – 비교는 끝, 루틴은 정함",
  description: "질문 8개에 답하면 2030 남성 피부에 맞는 스킨케어 루틴을 전성분 기준으로 하나로 정해드려요.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "정함", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://jeongham.vercel.app"),
  openGraph: { title: "정함 – 비교는 끝, 루틴은 정함", description: "질문 8개로 내 피부와 예산에 맞는 스킨케어 루틴을 정해요.", locale: "ko_KR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CompareBar />
        </AuthProvider>
      </body>
    </html>
  );
}
