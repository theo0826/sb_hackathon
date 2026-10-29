import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import "./polish.css";
import "./workspace.css";
import "./human-interface.css";
import "./minimal.css";
import "./patterns.css";
import "./motion-home.css";
import "./glass.css";
import "./workflow.css";
import "./glass-theme.css";
import "./design-studio.css";
import "./handdam-home.css";
import "./interactions.css";
import "./order-review.css";
import "./supplier-comparison.css";
import "./request-account.css";

export const metadata: Metadata = {
  title: { default: "한땀 — 우리다운 단체티의 시작", template: "%s | 한땀" },
  description: "성북구 주민의 모임과 지역의 제작을 연결하는 단체티 디자인 플랫폼. 동호회, 가족 행사, 이웃 모임의 옷을 만들어보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">본문 바로가기</a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
