import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sistem Kunci Proses",
  description: "Database Inventaris Alat Maintenance",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: ['/logo.png'],
    apple: ['/logo.png'], // Buat nampilin logo kalau di-save ke layar depan iPhone
  },
};
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
