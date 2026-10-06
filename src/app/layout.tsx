import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "ChronoLedger",
  description: "게임 일정 및 지출 관리 매니저",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-900 text-white min-h-screen">
        {/* AuthProvider로 감싸기 */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}