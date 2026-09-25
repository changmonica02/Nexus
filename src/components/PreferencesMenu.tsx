"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";
import SettingsDialog from "./SettingsDialog";

export interface PreferencesProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}
export default function PreferencesMenu(props: PreferencesProps) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"theme" | "language" | "backup" | null>(null);
  const [settings, setSettings] = useState(false);
  const [position, setPosition] = useState({ left: 8, bottom: 8, width: 180, detailWidth: 220 });
  const anchor = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); setPanel(null); anchor.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const width = window.innerWidth < 480 ? 140 : 180;
      const detailWidth = Math.min(240, window.innerWidth - width - 24);
      const maxLeft = window.innerWidth - width - (panel ? detailWidth + 8 : 0) - 8;
      setPosition({ left: Math.max(8, Math.min(rect.right - width, maxLeft)), bottom: Math.min(window.innerHeight - 220, Math.max(8, window.innerHeight - rect.top + 8)), width, detailWidth });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, panel]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popup.current?.contains(target) && !anchor.current?.contains(target)) { setOpen(false); setPanel(null); }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (panel) setPanel(null); else close(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); };
  }, [open, panel]);
  const buttonClass = "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zinc-500/10";
  const surface = { backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" };
  return <>
    <button ref={anchor} type="button" title={t("preferences.title")} aria-label="偏好" aria-expanded={open} onClick={() => { setPanel(null); setOpen(!open); }} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-zinc-500/10" style={surface}>⚙</button>
    {open && createPortal(<div ref={popup} role="dialog" aria-label="偏好選單" className="fixed z-[1100] flex items-end gap-2" style={{ left: position.left, bottom: Math.max(8, position.bottom) }}>
      <div className="rounded-xl border p-1.5 shadow-xl" style={{ ...surface, width: position.width }}>
        <div className="px-3 py-2 text-xs font-semibold opacity-60">{t("preferences.title")}</div>
        <button type="button" className={buttonClass} aria-expanded={panel === "theme"} onClick={() => setPanel("theme")} onKeyDown={(e) => { if (e.key === "ArrowRight") setPanel("theme"); }}><span>主題</span><span>›</span></button>
        <button type="button" className={buttonClass} aria-expanded={panel === "language"} onClick={() => setPanel("language")} onKeyDown={(e) => { if (e.key === "ArrowRight") setPanel("language"); }}><span>語言</span><span>›</span></button>
        <button type="button" className={buttonClass} onClick={() => { setOpen(false); setPanel(null); setSettings(true); }}>設定</button>
        <button type="button" className={buttonClass} aria-expanded={panel === "backup"} onClick={() => setPanel("backup")}><span>備份</span><span>›</span></button>
      </div>
      {panel && <div aria-label={panel === "theme" ? "主題選項" : panel === "language" ? "語言選項" : "備份選項"} role="region" className="max-h-[70dvh] overflow-y-auto rounded-xl border p-2 shadow-xl" style={{ ...surface, width: position.detailWidth }}>
        <div className="px-3 py-2 text-xs font-semibold opacity-60">{panel === "theme" ? "主題" : panel === "language" ? "語言" : "備份"}</div>
        {panel === "theme" && ([['light', '淺色'], ['dark', '深色']] as const).map(([value, label]) => <button key={value} type="button" className={buttonClass} aria-pressed={props.theme === value} onClick={() => props.onThemeChange(value)}><span>{label}</span>{props.theme === value && <span>✓</span>}</button>)}
        {panel === "language" && SUPPORTED_LANGUAGES.map((option) => <button key={option.value} type="button" className={buttonClass} aria-pressed={language === option.value} onClick={() => setLanguage(option.value)}><span>{option.label}</span>{language === option.value && <span>✓</span>}</button>)}
        {panel === "backup" && <><button type="button" className={buttonClass} onClick={() => { close(); props.onExportBackup(); }}>匯出備份</button><button type="button" className={buttonClass} onClick={() => { close(); props.onImportBackup(); }}>匯入備份</button></>}
      </div>}
    </div>, document.body)}
    {settings && <SettingsDialog {...props} onClose={() => { setSettings(false); anchor.current?.focus(); }} />}
  </>;
}
