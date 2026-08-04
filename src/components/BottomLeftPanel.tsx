"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";

/**
 * BottomLeftPanel：畫?左下?????塊??代????BottomRightPanel，? D-137）? *
 * 位置??觀修正（D-137，延?D-133/D-134）?
 *   1. 使用?確認整??塊本身????，??誤?「?不到?是?為
 *      ?錯位置（??在??角??本次?使用??示改?固定在左?角? *   2. 帳????輪設定??是?????????????????? *      使用??求?覺??為??一?橫欄」??使底層仍是?個獨立???件??? *      ?此?為?????????容器，帳????輪??用一條???
 *      ????????獨立?浮????? *
 * 帳?系統????????，維??D-133 ?既定???? *   Nexus ??????local-first ??，??只存在?覽??IndexedDB? *   沒?後端伺??、??使?者??庫???登??證??? *   ?次仍是?UI 佔??」?顯示訪客身????「登?」只顯示?示??? *   不?任??正?帳??證?輯。????入/?出系統待使?者確? *   要???端??????? *
 * 定?策略? *   沿用 D-134 ??createPortal 作?，直??載到 document.body? *   ??任?祖??overflow / stacking context ?????可?性? */
export default function BottomLeftPanel() {
  const { language, setLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as globalThis.Node;
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setIsSettingsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed left-4 bottom-4 z-[9999]">
      {/* ?????橫?：帳??（左??+ ???+ 齒輪設?（右??，?覺???一???*/}
      <div
        className="flex items-stretch rounded-full shadow-lg overflow-visible"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        {/* 左?：帳??（目?為佔? UI，??接上????入系統?*/}
        <div ref={accountRef} className="relative">
          {isAccountOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 w-60 rounded-xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
            >
              <div className="p-3 text-xs opacity-70 leading-relaxed" style={{ color: "var(--color-text)" }}>
                {t("account.comingSoon")}
              </div>
              <button
                onClick={() => setIsAccountOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border-t transition-all hover:bg-zinc-200"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                {t("account.signIn")}
              </button>
            </div>
          )}
          <button
            onClick={() => setIsAccountOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-l-full pl-1.5 pr-3 py-1.5 h-11 transition-all hover:bg-zinc-100 active:scale-[0.98]"
            style={{
              backgroundColor: isAccountOpen ? "var(--color-border)" : "transparent",
              color: "var(--color-text)",
            }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold"
              style={{ backgroundColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              ?
            </span>
            <span className="text-left leading-tight">
              <span className="block text-xs font-medium">{t("account.guestName")}</span>
            </span>
          </button>
        </div>

        {/* ??線?強???一橫???仍是?個???件?視覺語? */}
        <div className="w-px my-2" style={{ backgroundColor: "var(--color-border)" }} />

        {/* ??：??齒輪，?言設??目?唯一?目，?後可???? */}
        <div ref={settingsRef} className="relative">
          {isSettingsOpen && (
            <div
              className="absolute bottom-full right-0 mb-2 w-56 rounded-xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="px-3 py-2 text-xs font-semibold tracking-wider uppercase opacity-60"
                style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                {t("preferences.title")}
              </div>
              <div className="p-2.5 space-y-1.5">
                <div className="text-xs opacity-60 px-0.5" style={{ color: "var(--color-text)" }}>
                  {t("preferences.language")}
                </div>
                {SUPPORTED_LANGUAGES.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setLanguage(option.value);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-all hover:bg-zinc-200"
                    style={{
                      backgroundColor: language === option.value ? "var(--color-border)" : "transparent",
                      color: "var(--color-text)",
                    }}
                  >
                    <span>{option.label}</span>
                    {language === option.value && <span>??/span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex items-center justify-center w-11 h-11 rounded-r-full transition-all hover:bg-zinc-100 active:scale-[0.98]"
            style={{
              backgroundColor: isSettingsOpen ? "var(--color-border)" : "transparent",
              color: "var(--color-text)",
            }}
            title={t("preferences.title")}
          >
            <span className="text-lg leading-none">??</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
