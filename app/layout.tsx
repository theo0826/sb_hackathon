import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import "./polish.css";
import "./workspace.css";
import "./human-interface.css";

export const metadata: Metadata = {
  title: { default: "성북핏 — 우리다운 반티의 시작", template: "%s | 성북핏" },
  description: "대학의 아이디어와 성북의 제작을 연결하는 반티 디자인 플랫폼. 우리다운 반티를 만들어보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">본문 바로가기</a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
