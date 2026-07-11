import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thiên Vũ — Personal Habit System",
  description: "Hệ thống theo dõi thói quen cá nhân của Thiên Vũ.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
