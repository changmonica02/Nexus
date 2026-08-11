import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus",
  description: "Local-first, cross-platform knowledge workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
