"use client";
import { createContext, useContext, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePaginationLanguage } from "../lib/LanguageContext";
const Navigation = createContext<null | (() => void)>(null);
export function WorkspaceNavigationProvider({
  open,
  children,
}: {
  open: () => void;
  children: ReactNode;
}) {
  return <Navigation.Provider value={open}>{children}</Navigation.Provider>;
}
/** Inserted in existing title strips, never a second editor header. */
export function SidebarToggle() {
  const open = useContext(Navigation),
    { t } = usePaginationLanguage();
  return open ? (
    <button
      type="button"
      onClick={open}
      aria-label={t("ui.navigation")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--color-text)] hover:bg-zinc-500/10"
    >
      <Menu size={20} strokeWidth={1.75} />
    </button>
  ) : null;
}
