"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PreferencesProps } from "./PreferencesMenu";
import { useLanguage } from "../lib/LanguageContext";
import { SUPPORTED_LANGUAGES, type Language } from "../lib/i18n";
import { DEFAULT_FEATURE_ITEMS, getStoredFeatureOrderMode, setStoredFeatureOrderMode, getStoredCustomFeatureOrder, setStoredCustomFeatureOrder, type FeatureOrderMode } from "../lib/featurePreferences";
import DataSourcesAndCopyright from "./DataSourcesAndCopyright";
import {getSchedulePolicy,setSchedulePolicy,type SchedulePolicy} from '../features/study/studyReliability';
import StudyPreferences from "../features/study/components/StudyPreferences";
import HelpGuide from "./HelpGuide";

const sections = ["一般", "字卡與學習", "功能與導覽", "使用建議", "使用說明", "資料與備份", "關於 Nexus"] as const;
export default function SettingsDialog({ theme, onThemeChange, onExportBackup, onImportBackup, onClose }: PreferencesProps & { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const [section, setSection] = useState<typeof sections[number]>("一般");
  const [schedulePolicy,updateSchedulePolicy]=useState(getSchedulePolicy);
  const [showSources,setShowSources]=useState(false);
  const [orderMode, setOrderMode] = useState(getStoredFeatureOrderMode);
  const [order, setOrder] = useState(getStoredCustomFeatureOrder);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const update = () => { setOrderMode(getStoredFeatureOrderMode()); setOrder(getStoredCustomFeatureOrder()); };
    window.addEventListener("nexus-feature-order-changed", update);
    return () => { dialog?.close(); window.removeEventListener("nexus-feature-order-changed", update); };
  }, []);
  const changeMode = (mode: FeatureOrderMode) => { setOrderMode(mode); setStoredFeatureOrderMode(mode); };
  const move = (index: number, step: number) => {
    const next = [...order];
    const target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setStoredCustomFeatureOrder(next);
  };
  const control = "rounded-lg border bg-transparent px-3 py-2 text-sm";
  return createPortal(<dialog ref={ref} aria-labelledby="settings-title" onCancel={onClose} className="m-auto h-[min(720px,90dvh)] max-h-[90dvh] w-[min(880px,94vw)] max-w-none overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}><h2 id="settings-title" className="text-lg font-semibold">{t("settings.title")}</h2><button autoFocus type="button" aria-label={t("settings.close")} onClick={onClose} className="rounded-lg px-3 py-1 text-xl hover:bg-zinc-500/10">×</button></header>
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav aria-label={t("settings.categories")} className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>{sections.map((name) => <button key={name} type="button" onClick={() => setSection(name)} aria-current={section === name ? "page" : undefined} className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm hover:bg-zinc-500/10" style={{ backgroundColor: section === name ? "var(--color-border)" : undefined }}>{t(`settings.${name}`)}</button>)}</nav>
        <section aria-label={section} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <h3 className="mb-5 text-lg font-semibold">{t(`settings.${section}`)}</h3>
          {section === "一般" && <div className="space-y-6 text-sm">
            <label className="flex flex-wrap items-center justify-between gap-3">{t("preferences.theme")}<select aria-label={t("preferences.theme")} className={control} value={theme} onChange={(e) => onThemeChange(e.target.value as "light" | "dark")}><option value="light">{t("preferences.theme.light")}</option><option value="dark">{t("preferences.theme.dark")}</option></select></label>
            <label className="flex flex-wrap items-center justify-between gap-3">{t("preferences.language")}<select aria-label={t("preferences.language")} className={control} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>{SUPPORTED_LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <p className="text-xs leading-6 opacity-60">設定變更會立即套用。主題和語言也可以從側欄的偏好選單快速切換。</p>
          </div>}
          {section === "字卡與學習" && <div className="space-y-6"><StudyPreferences />            <label className="flex flex-wrap items-center justify-between gap-3">{t("study.conflictPolicy")}<select className={control} value={schedulePolicy} onChange={e=>{const value=e.target.value as SchedulePolicy;setSchedulePolicy(value);updateSchedulePolicy(value);}}><option value="latest">{t("study.policyLatest")}</option><option value="conservative">{t("study.policyConservative")}</option><option value="ask">{t("study.policyAsk")}</option></select></label>
            <p className="text-xs opacity-60">{t("study.policyHint")}</p>
</div>}
          {section === "功能與導覽" && <div className="space-y-4 text-sm">
            <p className="leading-6 opacity-70">「所有項目」與「日曆」固定在第一排，其他功能可依使用習慣排列。</p>
            <fieldset className="space-y-2"><legend className="mb-2 font-medium">排列方式</legend>{([['recent', '最新使用排列（預設）'], ['default', '預設排列'], ['custom', '自訂排列']] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}><input type="radio" name="feature-order" value={value} checked={orderMode === value} onChange={() => changeMode(value)} />{label}</label>)}</fieldset>
            {orderMode === "custom" && <ol className="space-y-2">{order.map((id, index) => { const feature = DEFAULT_FEATURE_ITEMS.find((item) => item.id === id); if (!feature) return null; return <li key={id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-border)" }}><span>{index + 1}. {feature.label}</span><div className="flex gap-1"><button className="rounded px-2 py-1 hover:bg-zinc-500/10 disabled:opacity-30" type="button" aria-label={`上移${feature.label}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button className="rounded px-2 py-1 hover:bg-zinc-500/10 disabled:opacity-30" type="button" aria-label={`下移${feature.label}`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>↓</button></div></li>; })}</ol>}
          </div>}
          {section === "使用建議" && <div className="space-y-5 text-sm leading-7">
            <div><h4 className="font-semibold">選擇適合的功能排序</h4><p className="opacity-75">經常切換工作類型，可使用「最新使用排列」；希望位置保持一致，可選「預設排列」或「自訂排列」。</p></div>
            <div><h4 className="font-semibold">製作課本與講義</h4><p className="opacity-75">先用章標題與小節建立結構，再加入例題、練習與解答。完成內容後，從「講義排版與目錄」統一樣式；分頁筆記可使用「依 A4 整理分頁」。</p></div>
            <div><h4 className="font-semibold">保存常用創作結構</h4><p className="opacity-75">角色卡的組件與背景範文可存成自訂模板，之後建立角色時直接選用。世界觀與角色卡可分開管理。</p></div>
            <div><h4 className="font-semibold">備份與同步</h4><p className="opacity-75">帳號入口位於側欄底部，可查看同步狀態；也可從「備份」匯出工作區，保留一份獨立副本。</p></div>
          </div>}
          {section === "關於 Nexus" && (showSources?<div className="space-y-4"><button type="button" className={control} onClick={()=>setShowSources(false)}>← 關於 Nexus</button><DataSourcesAndCopyright/></div>:<button type="button" className={control} onClick={()=>setShowSources(true)}>資料來源與版權</button>)}
          {section === "使用說明" && <HelpGuide />}
          {section === "資料與備份" && <div className="space-y-4 text-sm leading-7"><p className="opacity-75">匯出工作區備份，或選擇先前保存的 JSON 備份檔匯入。</p><div className="flex flex-wrap gap-3"><button type="button" className={control} onClick={() => { onClose(); onExportBackup(); }}>匯出備份</button><button type="button" className={control} onClick={() => { onClose(); onImportBackup(); }}>匯入備份</button></div></div>}
        </section>
      </div>
    </div>
  </dialog>, document.body);
}
