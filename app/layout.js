import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata = {
  title: 'トモヒガラ　不具合報告', // サイト名
  description: '脱出ゲーム「トモヒガラ」でのバグ報告用ページです・',
  // ▼▼▼ この icons の設定を追加（または修正）します ▼▼▼
  icons: {
    icon: '/favicon.png', // publicフォルダに置いたファイル名に合わせる
    // （もし 'favicon.png' を置いたなら '/favicon.png' と書く）
  }
  // ▲▲▲ ここまで ▲▲▲
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <LanguageSwitcher />
        {children}
      </body>
    </html>
  );
}


