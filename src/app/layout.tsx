import type { Metadata } from "next";
import "./globals.css";
import WorkspaceRoot from "../components/WorkspaceRoot";
import ConfirmDialogHost from "../components/ConfirmDialog";
import PWARegister from "../components/PWARegister";

export const metadata: Metadata = {
  title: "Nexus",
  description: "Local-first, cross-platform knowledge workspace",
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="h-full antialiased"><WorkspaceRoot>{children}</WorkspaceRoot><ConfirmDialogHost/><PWARegister/></body>
    </html>
  );
}
