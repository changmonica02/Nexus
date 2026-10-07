import type { Metadata } from "next";
import "./globals.css";
import ConfirmDialogHost from "../components/ConfirmDialog";

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
      <body className="h-full antialiased">{children}<ConfirmDialogHost/></body>
    </html>
  );
}
