"use client";
import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { usePaginationLanguage } from "../lib/LanguageContext";
const Navigation = createContext<null | (() => void)>(null);
const HeaderContext=createContext<{changed?:(present:boolean)=>void;actions?:ReactNode}>({});
export function WorkspaceNavigationProvider({
  open,
  children,
  onHeaderPresenceChange, actions,
}: {
  open: () => void;
  children: ReactNode;
  onHeaderPresenceChange?:(present:boolean)=>void;actions?:ReactNode;
}) {
  return <Navigation.Provider value={open}><HeaderContext.Provider value={{changed:onHeaderPresenceChange,actions}}>{children}</HeaderContext.Provider></Navigation.Provider>;
}
/** Inserted in existing title strips, never a second editor header. */
export function SidebarToggle() {
  const open = useContext(Navigation),
    { t } = usePaginationLanguage();
  const {changed}=useContext(HeaderContext);
  useLayoutEffect(()=>{changed?.(true);return()=>changed?.(false);},[changed]);
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

/** One title strip per page; the shell yields its generic header while this is mounted. */
export function PageHeader({title,onBack,backHref,backLabel,actions,backDisabled=false,globalActions=true,autoFocusBack=false}:{title:ReactNode;onBack?:()=>void;backHref?:string;backLabel?:string;actions?:ReactNode;backDisabled?:boolean;globalActions?:boolean;autoFocusBack?:boolean}){
 const context=useContext(HeaderContext),{t}=usePaginationLanguage();
 const control="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-zinc-500/10";
 const back=backLabel??t('ui.back');
 return <header data-page-header className="flex min-w-0 shrink-0 items-center gap-1 border-b border-[var(--color-border)] py-1 text-[var(--color-text)]"><SidebarToggle/>{backHref?<Link href={backHref} aria-label={back} className={control}><ArrowLeft size={20}/></Link>:onBack?<button type="button" onClick={onBack} autoFocus={autoFocusBack} disabled={backDisabled} aria-label={back} className={control}><ArrowLeft size={20}/></button>:null}<h1 className="min-w-0 flex-1 truncate text-base font-semibold" title={typeof title==='string'?title:undefined}>{title}</h1><div className="flex shrink-0 items-center gap-1">{actions}{globalActions&&context.actions}</div></header>;
}
