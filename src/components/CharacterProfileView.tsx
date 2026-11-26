"use client";
import CharacterBlockWorkspace from "./CharacterBlockWorkspace";
import {WorldMapRepository} from "../features/worldMap/worldMapRepository";
import WorldMapManager, {WorldMapUnavailable} from "./WorldMapManager";
import type {StorageAdapter} from "../infrastructure/storage/StorageAdapter";
import type {RegisterMapFlush} from "./WorldMapSyncStatus";
import React, { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import type {
  Page,
  CharacterProfileData,
  CharacterSection,
  CharacterComponentType,
} from "../lib/types";
import { useWorkspaceDialog } from "./WorkspaceDialog";
import CharacterStatistics from "./CharacterStatistics";
import CharacterRadar from "./CharacterRadar";
import { updateCharacterSection } from "../lib/characterWorkspace";

const COMPONENT_TYPES: { type: CharacterComponentType; label: string; desc: string }[] = [
  { type: "key_value", label: "短文字", desc: "如身高體重、武器裝備、生日等簡短資訊" },
  { type: "tags", label: "標籤與特質", desc: "性格標籤與詳細心理側寫" },
  { type: "stats", label: "分數", desc: "力量、敏捷、智力等進度條數值分數（自訂上限）" },
  { type: "rating", label: "評分", desc: "1~5 顆圓圈點選評分" },
  { type: "tendency", label: "偏向", desc: "可滑動豎直線，中央磁吸，中立客觀兩端呈現" },
  { type: "statistics", label: "統計", desc: "項目、介紹、數量、重量與總重自動計算清單" },
  { type: "rich_text", label: "長文", desc: "身世故事、經歷、未解之謎" },
  { type: "relations", label: "關聯", desc: "與同伴、導師、宿敵的互動關係" },
  { type: "radar", label: "雷達圖", desc: "可自訂多個能力維度與分數" },
  { type: "palette", label: "色票", desc: "建立角色或世界觀的專屬配色" },
  { type: "gallery", label: "相冊", desc: "以圖片網址整理角色或世界觀圖像" },
  { type: "links", label: "連結", desc: "收納參考資料與外部網站" },
  { type: "music", label: "音樂", desc: "收納主題曲、歌單或音樂連結" },
];

function GalleryAttachment({ attachmentId, getBlob }: { attachmentId: string; getBlob?: (id: string) => Promise<Blob | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    let objectUrl: string | null = null;
    void getBlob?.(attachmentId).then((blob) => {
      if (!blob || !current) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, getBlob]);
  return url ? <img src={url} alt="相冊圖片" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs opacity-45">載入中…</div>;
}

interface CharacterMediaProps {
  getAttachmentBlob?: (id: string) => Promise<Blob | null>;
  onUploadGalleryImage?: (file: File) => Promise<string>;
}

function CharacterContentEditor({
  section,
  viewMode,
  layoutMode,
  onChange,
  getAttachmentBlob,
  onUploadGalleryImage,
}: CharacterMediaProps & {
  section: CharacterSection;
  viewMode: "edit" | "card";
  layoutMode?: CharacterProfileData["layout"];
  onChange: (section: CharacterSection) => void;
}) {
  const { askText, dialog } = useWorkspaceDialog();
  const [expandedLongSections, setExpandedLongSections] = useState<Set<string>>(new Set());

  // Focus helper
  const focusAndScrollTo = (elementId: string) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = el.querySelector<HTMLElement>("input, textarea, select, button");
          input?.focus();
        }
      }, 50);
    });
  };

  // Section operations
  const addSection = (type: CharacterComponentType, parent: CharacterSection) => {
    const meta = COMPONENT_TYPES.find((c) => c.type === type);
    const newId = `sec_${nanoid()}`;
    const newSec: CharacterSection = {
      id: newId,
      type,
      title: type === "group" ? "新區塊" : meta?.label || "自訂內容",
      contents: type === "group" ? [] : undefined,
      keyValues: type === "key_value" ? [{ key: "新屬性", value: "內容" }] : undefined,
      tags: type === "tags" ? ["標籤一", "標籤二"] : undefined,
      richText: type === "tags" || type === "rich_text" || type === "stats" ? "" : undefined,
      stats: type === "radar"
        ? [{ label: "力量", value: 3, max: 5 }, { label: "敏捷", value: 3, max: 5 }, { label: "意志", value: 3, max: 5 }]
        : type === "stats"
        ? [{ label: "力量", value: 17, max: 30 }]
        : undefined,
      ratings: type === "rating"
        ? [{ label: "角色吸引力", value: 4 }, { label: "危險度", value: 3 }]
        : undefined,
      palette: type === "palette" ? [{ label: "主色", color: "#9e4b2c" }, { label: "輔色", color: "#e8c47b" }] : undefined,
      tendency: type === "tendency" ? [{ left: "守序", right: "混亂", value: 50 }] : undefined,
      statistics: type === "statistics" ? [{ label: "長劍", description: "精鋼打造", count: 1, unitWeight: 1.5, value: 1 }] : undefined,
      gallery: type === "gallery" ? [] : undefined,
      galleryAttachmentIds: type === "gallery" ? [] : undefined,
      externalLinks: type === "links" ? [] : undefined,
      music: type === "music" ? [] : undefined,
      relations: type === "relations" ? [{ targetName: "目標角色", relationType: "同伴", description: "關係描述" }] : undefined,
    };

    updateSection(parent.id, { contents: [...(parent.contents || []), newSec] });
    focusAndScrollTo(newId);
  };

  const updateSection = (id: string, patch: Partial<CharacterSection>) => {
    const [updated] = updateCharacterSection([section], id, patch);
    onChange(updated);
  };

  // 偏向磁吸計算
  const handleTendencyChange = (secId: string, itemIndex: number, rawVal: number, list: { left: string; right: string; value: number }[]) => {
    let finalVal = rawVal;
    // 正中央 50% 磁吸：47% ~ 53% 吸附至 50%
    if (Math.abs(rawVal - 50) <= 3) {
      finalVal = 50;
    }
    const next = [...list];
    next[itemIndex] = { ...next[itemIndex], value: finalVal };
    updateSection(secId, { tendency: next });
  };

  const renderSections = (sections: CharacterSection[]): React.ReactNode =>
    sections.map((sec) => (
      <div
        id={sec.id}
        key={sec.id}
        className="min-w-0 rounded-2xl border p-3 sm:p-5 shadow-sm transition-all relative"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* 組件標題欄 */}
        <div className="flex min-w-0 items-center justify-between gap-2 mb-4 pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {viewMode === "edit" ? (
              <input
                value={sec.title}
                onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                className="min-w-0 w-full font-bold text-sm bg-transparent outline-none border-b border-dashed border-zinc-400 pb-0.5"
              />
            ) : (
              <span className="font-bold text-sm">{sec.title}</span>
            )}
          </div>

        </div>

        {/* 區塊容器 (Group) */}
        {sec.type === "group" && (
          <div className="space-y-4">
            <div className={layoutMode === "two_column" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
              {renderSections(sec.contents || [])}
            </div>
            {viewMode === "edit" && (
              <div className="flex items-center gap-2 pt-2 border-t text-xs font-semibold" style={{ borderColor: "var(--color-border)" }}>
                <span>新增內容：</span>
                <select
                  aria-label={`新增內容至${sec.title}`}
                  value=""
                  onChange={(event) => {
                    if (event.target.value) addSection(event.target.value as CharacterComponentType, sec);
                  }}
                  className="rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none cursor-pointer hover:border-blue-500"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <option value="" disabled>新增內容</option>
                  {COMPONENT_TYPES.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label} — {item.desc}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!sec.contents?.length && viewMode === "card" && <p className="text-xs opacity-50">尚無內容</p>}
          </div>
        )}

        {/* 1. 鍵值屬性組件 (Key-Value) */}
        {sec.type === "key_value" && (
          <div className="space-y-2">
            {viewMode === "edit" ? (
              <>
                {(sec.keyValues || []).map((kv, kvIdx) => (
                  <div key={kvIdx} className="flex items-center gap-2">
                    <input
                      value={kv.key}
                      onChange={(e) => {
                        const next = (sec.keyValues || []).map((item) => ({ ...item }));
                        next[kvIdx].key = e.target.value;
                        updateSection(sec.id, { keyValues: next });
                      }}
                      placeholder="屬性名（如身高）"
                      className="w-1/3 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-transparent outline-none"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                    <input
                      value={kv.value}
                      onChange={(e) => {
                        const next = (sec.keyValues || []).map((item) => ({ ...item }));
                        next[kvIdx].value = e.target.value;
                        updateSection(sec.id, { keyValues: next });
                      }}
                      placeholder={sec.example?.keyValues?.[kvIdx]?.value || "屬性內容"}
                      className="min-w-0 flex-1 px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                    <button
                      onClick={() => {
                        const next = (sec.keyValues || []).filter((_, i) => i !== kvIdx);
                        updateSection(sec.id, { keyValues: next });
                      }}
                      className="text-red-500 text-xs px-1.5 opacity-60 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const next = [...(sec.keyValues || []), { key: "", value: "" }];
                    updateSection(sec.id, { keyValues: next });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline block pt-1"
                >
                  ＋ 新增屬性行
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(sec.keyValues || []).map((kv, i) => (
                  <div key={i} className="p-2.5 rounded-xl border text-xs" style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}>
                    <div className="opacity-60 text-[10px] truncate">{kv.key}</div>
                    <div className="font-semibold mt-0.5 truncate">{kv.value || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. 標籤與心理側寫 (Tags) */}
        {sec.type === "tags" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(sec.tags || []).map((tag, tIdx) => (
                <span key={tIdx} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
                  <span>{tag}</span>
                  {viewMode === "edit" && (
                    <button onClick={() => updateSection(sec.id, { tags: (sec.tags || []).filter((_, i) => i !== tIdx) })} className="hover:text-red-500 font-bold">
                      ✕
                    </button>
                  )}
                </span>
              ))}
              {viewMode === "edit" && (
                <button
                  onClick={async () => {
                    const t = await askText("請輸入新標籤：", sec.example?.tags?.join("、") || "");
                    if (t && t.trim()) updateSection(sec.id, { tags: [...(sec.tags || []), t.trim()] });
                  }}
                  className="px-2.5 py-1 rounded-full border border-dashed text-xs text-blue-600 hover:bg-blue-50 transition-all font-medium"
                >
                  ＋ 新增標籤
                </button>
              )}
            </div>
            {viewMode === "edit" ? (
              <textarea
                value={sec.richText || ""}
                onChange={(e) => updateSection(sec.id, { richText: e.target.value })}
                placeholder={sec.example?.richText || "詳細性格心理特質說明..."}
                rows={3}
                className="w-full p-2.5 rounded-lg border text-xs bg-transparent outline-none resize-y"
                style={{ borderColor: "var(--color-border)" }}
              />
            ) : sec.richText ? (
              <p className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap">{sec.richText}</p>
            ) : null}
          </div>
        )}

        {/* 3. 分數組件 (Stats - 稱呼為「分數」，自由自訂上限，如 17/30) */}
        {sec.type === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(sec.stats || []).map((st, stIdx) => {
                const maxVal = st.max !== undefined ? st.max : 100;
                const pct = maxVal > 0 ? Math.min(100, Math.max(0, (st.value / maxVal) * 100)) : 0;
                return (
                  <div key={stIdx} className="space-y-1.5 p-2 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center justify-between text-xs">
                      {viewMode === "edit" ? (
                        <input
                          value={st.label}
                          onChange={(e) => {
                            const next = (sec.stats || []).map((item) => ({ ...item }));
                            next[stIdx].label = e.target.value;
                            updateSection(sec.id, { stats: next });
                          }}
                          placeholder="能力名稱"
                          className="font-semibold bg-transparent outline-none w-28 border-b border-dashed border-zinc-400"
                        />
                      ) : (
                        <span className="font-semibold">{st.label}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {viewMode === "edit" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={st.value}
                              onChange={(e) => {
                                const next = (sec.stats || []).map((item) => ({ ...item }));
                                next[stIdx].value = Number(e.target.value) || 0;
                                updateSection(sec.id, { stats: next });
                              }}
                              className="w-12 text-right font-bold text-blue-600 font-mono bg-transparent border-b border-zinc-400 outline-none"
                            />
                            <span className="opacity-40 text-xs">/</span>
                            <input
                              type="number"
                              value={maxVal}
                              title="上限值（可自由設定，如 30、100）"
                              onChange={(e) => {
                                const next = (sec.stats || []).map((item) => ({ ...item }));
                                next[stIdx].max = Math.max(1, Number(e.target.value) || 1);
                                updateSection(sec.id, { stats: next });
                              }}
                              className="w-12 text-left opacity-60 font-mono text-xs bg-transparent border-b border-zinc-400 outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-blue-600 font-mono">{st.value}</span>
                            <span className="opacity-40 text-[10px]">/ {maxVal}</span>
                          </>
                        )}
                        {viewMode === "edit" && (
                          <button
                            onClick={() => {
                              const next = (sec.stats || []).filter((_, i) => i !== stIdx);
                              updateSection(sec.id, { stats: next });
                            }}
                            className="text-red-500 ml-1 text-xs opacity-60 hover:opacity-100"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 進度條 */}
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {viewMode === "edit" && (
                      <input
                        type="range"
                        min={0}
                        max={maxVal}
                        value={st.value}
                        onChange={(e) => {
                          const next = (sec.stats || []).map((item) => ({ ...item }));
                          next[stIdx].value = Number(e.target.value);
                          updateSection(sec.id, { stats: next });
                        }}
                        className="w-full accent-blue-600 h-1 cursor-pointer"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {viewMode === "edit" ? (
              <>
                <button
                  onClick={() => {
                    const next = [...(sec.stats || []), { label: "新能力", value: 10, max: 30 }];
                    updateSection(sec.id, { stats: next });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline block"
                >
                  ＋ 新增分數項目
                </button>
                <textarea
                  value={sec.richText || ""}
                  onChange={(e) => updateSection(sec.id, { richText: e.target.value })}
                  placeholder={sec.example?.richText || "能力、魔法與戰鬥風格詳細說明..."}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border text-xs bg-transparent outline-none resize-y mt-2"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </>
            ) : sec.richText ? (
              <p className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                {sec.richText}
              </p>
            ) : null}
          </div>
        )}

        {/* 4. 評分組件 (Rating - 5 個圓圈 點選評分 1~5) */}
        {sec.type === "rating" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(sec.ratings || []).map((item, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between p-2.5 rounded-xl border text-xs" style={{ borderColor: "var(--color-border)" }}>
                  {viewMode === "edit" ? (
                    <input
                      value={item.label}
                      onChange={(e) => {
                        const next = (sec.ratings || []).map((it) => ({ ...it }));
                        next[rIdx].label = e.target.value;
                        updateSection(sec.id, { ratings: next });
                      }}
                      placeholder="評分項目"
                      className="font-semibold bg-transparent outline-none w-28 border-b border-dashed border-zinc-400"
                    />
                  ) : (
                    <span className="font-semibold">{item.label}</span>
                  )}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const filled = item.value >= score;
                      return (
                        <button
                          key={score}
                          type="button"
                          disabled={viewMode === "card"}
                          onClick={() => {
                            const next = (sec.ratings || []).map((it) => ({ ...it }));
                            next[rIdx].value = score;
                            updateSection(sec.id, { ratings: next });
                          }}
                          className={`w-4 h-4 rounded-full border transition-all ${
                            filled
                              ? "bg-blue-600 border-blue-600 shadow-xs"
                              : "border-zinc-400 bg-transparent hover:border-blue-400"
                          } ${viewMode === "edit" ? "cursor-pointer" : "cursor-default"}`}
                          title={`${score} 分`}
                        />
                      );
                    })}
                    <span className="ml-1 text-[11px] font-mono opacity-60 w-6 text-right">
                      {item.value}/5
                    </span>
                    {viewMode === "edit" && (
                      <button
                        onClick={() => {
                          const next = (sec.ratings || []).filter((_, i) => i !== rIdx);
                          updateSection(sec.id, { ratings: next });
                        }}
                        className="text-red-500 ml-1 opacity-60 hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {viewMode === "edit" && (
              <button
                onClick={() => {
                  const next = [...(sec.ratings || []), { label: "新評分", value: 3 }];
                  updateSection(sec.id, { ratings: next });
                }}
                className="text-xs font-semibold text-blue-600 hover:underline block"
              >
                ＋ 新增評分項目
              </button>
            )}
          </div>
        )}

        {/* 5. 偏向組件 (Tendency - 可滑動豎直線滑桿，中央磁吸，無單側填色) */}
        {sec.type === "tendency" && (
          <div className="space-y-4">
            {(sec.tendency || []).map((item, index) => {
              const list = sec.tendency || [];
              return (
                <div key={index} className="p-3 rounded-xl border text-xs space-y-2" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      value={item.left}
                      disabled={viewMode === "card"}
                      onChange={(e) => {
                        const next = [...list];
                        next[index] = { ...item, left: e.target.value };
                        updateSection(sec.id, { tendency: next });
                      }}
                      className="font-medium text-left bg-transparent outline-none border-b border-dashed border-zinc-400 flex-1 min-w-0"
                      placeholder="左端特性"
                    />
                    <span className="text-[10px] font-mono opacity-60 shrink-0">
                      {item.value === 50 ? "中立 (50%)" : item.value < 50 ? `偏向左 (${item.value}%)` : `偏向右 (${item.value}%)`}
                    </span>
                    <input
                      value={item.right}
                      disabled={viewMode === "card"}
                      onChange={(e) => {
                        const next = [...list];
                        next[index] = { ...item, right: e.target.value };
                        updateSection(sec.id, { tendency: next });
                      }}
                      className="font-medium text-right bg-transparent outline-none border-b border-dashed border-zinc-400 flex-1 min-w-0"
                      placeholder="右端特性"
                    />
                    {viewMode === "edit" && (
                      <button
                        onClick={() => updateSection(sec.id, { tendency: list.filter((_, idx) => idx !== index) })}
                        className="text-red-500 opacity-60 hover:opacity-100 shrink-0 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 中立滑軌與可滑動豎直線（無單邊顏色填色） */}
                  <div className="relative py-2 select-none">
                    {/* 中央中立刻度線 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-400 dark:bg-zinc-600 -translate-x-1/2 pointer-events-none opacity-60" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={item.value}
                      disabled={viewMode === "card"}
                      onChange={(e) => handleTendencyChange(sec.id, index, Number(e.target.value), list)}
                      className="w-full appearance-none h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                </div>
              );
            })}
            {viewMode === "edit" && (
              <button
                onClick={() =>
                  updateSection(sec.id, {
                    tendency: [...(sec.tendency || []), { left: "守序", right: "混亂", value: 50 }],
                  })
                }
                className="text-xs font-semibold text-blue-600 hover:underline block"
              >
                ＋ 新增偏向
              </button>
            )}
          </div>
        )}

        {/* 6. 統計組件 (Statistics - 項目 / 介紹 / 數量 / 重量 / 總重 / 合計) */}
        {sec.type === "statistics" && (
          <CharacterStatistics section={sec} editing={viewMode === "edit"} onChange={(patch) => updateSection(sec.id, patch)} />
        )}

        {/* 雷達圖 */}
        {sec.type === "radar" && (
          <CharacterRadar section={sec} editing={viewMode === "edit"} onChange={(patch) => updateSection(sec.id, patch)} />
        )}

        {/* 色票 */}
        {sec.type === "palette" && (
          <div className="space-y-2">
            {(sec.palette || []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={item.color}
                  disabled={viewMode === "card"}
                  onChange={(event) => {
                    const palette = [...(sec.palette || [])];
                    palette[index] = { ...item, color: event.target.value };
                    updateSection(sec.id, { palette });
                  }}
                  className="h-9 w-12 rounded border p-1 cursor-pointer"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <input
                  value={item.label}
                  disabled={viewMode === "card"}
                  onChange={(event) => {
                    const palette = [...(sec.palette || [])];
                    palette[index] = { ...item, label: event.target.value };
                    updateSection(sec.id, { palette });
                  }}
                  className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1.5 text-xs disabled:border-0"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <code className="text-xs opacity-60 font-mono">{item.color}</code>
                {viewMode === "edit" && (
                  <button onClick={() => updateSection(sec.id, { palette: (sec.palette || []).filter((_, itemIndex) => itemIndex !== index) })}>
                    ×
                  </button>
                )}
              </div>
            ))}
            {viewMode === "edit" && (
              <button onClick={() => updateSection(sec.id, { palette: [...(sec.palette || []), { label: "新顏色", color: "#64748b" }] })} className="text-xs font-semibold text-blue-600">
                ＋ 新增顏色
              </button>
            )}
          </div>
        )}

        {/* 相冊 */}
        {sec.type === "gallery" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(sec.galleryAttachmentIds || []).map((attachmentId, index) => (
                <div key={attachmentId} className="relative aspect-square overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                  <GalleryAttachment attachmentId={attachmentId} getBlob={getAttachmentBlob} />
                  {viewMode === "edit" && (
                    <button
                      onClick={() =>
                        updateSection(sec.id, {
                          galleryAttachmentIds: (sec.galleryAttachmentIds || []).filter((_, imageIndex) => imageIndex !== index),
                        })
                      }
                      className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {(sec.gallery || []).map((url, index) => (
                <div key={url + index} className="relative aspect-square overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                  <img src={url} alt="相冊圖片" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            {viewMode === "edit" && (
              <>
                <input
                  id={`gallery-${sec.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file || !onUploadGalleryImage) return;
                    void onUploadGalleryImage(file).then((attachmentId) =>
                      updateSection(sec.id, { galleryAttachmentIds: [...(sec.galleryAttachmentIds || []), attachmentId] })
                    );
                  }}
                />
                <button onClick={() => document.getElementById(`gallery-${sec.id}`)?.click()} className="text-xs font-semibold text-blue-600">
                  ＋ 上傳圖片
                </button>
              </>
            )}
          </div>
        )}

        {/* 連結與音樂 */}
        {(sec.type === "links" || sec.type === "music") && (
          <div className="space-y-2">
            {(sec.type === "music" ? sec.music || [] : sec.externalLinks || []).map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={item.label}
                  disabled={viewMode === "card"}
                  onChange={(event) => {
                    const key = sec.type === "music" ? "music" : "externalLinks";
                    const list = [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || [])];
                    list[index] = { ...item, label: event.target.value };
                    updateSection(sec.id, { [key]: list });
                  }}
                  className="w-1/3 rounded border bg-transparent px-2 py-1.5 text-xs disabled:border-0"
                  style={{ borderColor: "var(--color-border)" }}
                  placeholder="名稱"
                />
                {viewMode === "card" ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate rounded border px-2 py-1.5 text-xs text-blue-600" style={{ borderColor: "var(--color-border)" }}>
                    {item.url}
                  </a>
                ) : (
                  <input
                    value={item.url}
                    onChange={(event) => {
                      const key = sec.type === "music" ? "music" : "externalLinks";
                      const list = [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || [])];
                      list[index] = { ...item, url: event.target.value };
                      updateSection(sec.id, { [key]: list });
                    }}
                    className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1.5 text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                    placeholder="https://"
                  />
                )}
                {viewMode === "edit" && (
                  <button
                    onClick={() => {
                      const key = sec.type === "music" ? "music" : "externalLinks";
                      updateSection(sec.id, {
                        [key]: (sec.type === "music" ? sec.music || [] : sec.externalLinks || []).filter((_, linkIndex) => linkIndex !== index),
                      });
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {viewMode === "edit" && (
              <button
                onClick={() => {
                  const key = sec.type === "music" ? "music" : "externalLinks";
                  updateSection(sec.id, {
                    [key]: [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || []), { label: "", url: "" }],
                  });
                }}
                className="text-xs font-semibold text-blue-600"
              >
                ＋ 新增{sec.type === "music" ? "音樂" : "連結"}
              </button>
            )}
          </div>
        )}

        {/* 長文故事 (Rich Text) */}
        {sec.type === "rich_text" && (
          <div>
            {viewMode === "edit" ? (
              <textarea
                aria-label={sec.title+" 內容"}
                value={sec.richText || ""}
                onChange={(e) => updateSection(sec.id, { richText: e.target.value })}
                placeholder={sec.example?.richText || "填寫背景身世、轉折經歷或故事細節..."}
                rows={6}
                className="w-full p-3 rounded-lg border text-xs bg-transparent outline-none resize-y leading-relaxed"
                style={{ borderColor: "var(--color-border)" }}
              />
            ) : (
              <div>
                {(sec.richText?.length??0)>240&&<button
                  type="button"
                  onClick={() =>
                    setExpandedLongSections((current) => {
                      const next = new Set(current);
                      if (next.has(sec.id)) next.delete(sec.id);
                      else next.add(sec.id);
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-2 text-left text-xs font-medium opacity-80 hover:opacity-100"
                >
                  <span>{expandedLongSections.has(sec.id) ? "▾ 收合長文" : "▸ 展開長文"}</span>
                </button>}
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed opacity-85 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                  {(expandedLongSections.has(sec.id) ? sec.richText : sec.richText?.slice(0, 240)) || "尚無內容"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 關聯 (Relations) */}
        {sec.type === "relations" && (
          <div className="space-y-3">
            {viewMode === "edit" ? (
              <>
                {(sec.relations || []).map((rel, rIdx) => (
                  <div key={rIdx} className="space-y-2 p-3 rounded-xl border text-xs" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center gap-2">
                      <input
                        value={rel.targetName}
                        onChange={(e) => {
                          const next = (sec.relations || []).map((item) => ({ ...item }));
                          next[rIdx].targetName = e.target.value;
                          updateSection(sec.id, { relations: next });
                        }}
                        placeholder="對象姓名"
                        className="w-1/2 px-2.5 py-1 rounded border text-xs font-semibold bg-transparent outline-none"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                      <input
                        value={rel.relationType}
                        onChange={(e) => {
                          const next = (sec.relations || []).map((item) => ({ ...item }));
                          next[rIdx].relationType = e.target.value;
                          updateSection(sec.id, { relations: next });
                        }}
                        placeholder="關係（如：同伴、導師）"
                        className="w-1/2 px-2.5 py-1 rounded border text-xs bg-transparent outline-none"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                      <button
                        onClick={() => {
                          const next = (sec.relations || []).filter((_, i) => i !== rIdx);
                          updateSection(sec.id, { relations: next });
                        }}
                        className="text-red-500 px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      value={rel.description}
                      onChange={(e) => {
                        const next = (sec.relations || []).map((item) => ({ ...item }));
                        next[rIdx].description = e.target.value;
                        updateSection(sec.id, { relations: next });
                      }}
                      placeholder="關係與互動備註描述"
                      className="w-full px-2.5 py-1 rounded border text-xs bg-transparent outline-none"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const next = [...(sec.relations || []), { targetName: "", relationType: "", description: "" }];
                    updateSection(sec.id, { relations: next });
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline block"
                >
                  ＋ 新增人際關係
                </button>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(sec.relations || []).map((rel, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border text-xs space-y-1"
                    style={{
                      backgroundColor: "var(--color-sidebar-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{rel.targetName || "未具名"}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium">
                        {rel.relationType || "關係"}
                      </span>
                    </div>
                    <p className="opacity-75 text-[11px] leading-relaxed">{rel.description || "無描述"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ));

  return <>{dialog}{renderSections([section])}</>;
}

export type CharacterProfileProps = CharacterMediaProps & {
  page: Page;
  onUpdateCharacterData: (data: CharacterProfileData) => void;
  onBackToCreativeOverview?: () => void;
  onSaveTemplate?: (name: string, data: CharacterProfileData) => Promise<void>;
  onCommitCharacterData?: (data: CharacterProfileData) => Promise<void>;
  readOnly?: boolean;
  templateActions?: React.ReactNode;
  worldMapStorage?: StorageAdapter;
  beforeWorldMapSave?: () => Promise<void>;
  onWorldMapSaved?: (page: Page) => Promise<void>;
  registerWorldMapFlush?: RegisterMapFlush;
  worldMapCloudState?: { status: string; error?: string | null };
};

export default function CharacterProfileView(props: CharacterProfileProps) {
  const { page, worldMapStorage, beforeWorldMapSave, onWorldMapSaved } = props;
  const isWorld = page.creative_type === "world";

  if (isWorld && !page.character_data?.isTemplate) {
    if (!worldMapStorage || !beforeWorldMapSave || !onWorldMapSaved) {
      return <WorldMapUnavailable onBack={props.onBackToCreativeOverview} />;
    }
    return <WorldMapManager
      key={page.id}
      world={page}
      storage={worldMapStorage}
      beforeSave={beforeWorldMapSave}
      onSaved={onWorldMapSaved}
      registerFlush={props.registerWorldMapFlush}
      cloudState={props.worldMapCloudState}
      readOnly={props.readOnly}
      onBack={props.onBackToCreativeOverview}
    />;
  }

  return <CharacterBlockWorkspace
    page={page}
    templateActions={props.templateActions}
    readOnly={props.readOnly}
    onBack={isWorld ? undefined : props.onBackToCreativeOverview}
    onSaveTemplate={props.onSaveTemplate}
    onCommit={async data => {
      if (isWorld && worldMapStorage && onWorldMapSaved) {
        await beforeWorldMapSave?.();
        const repository = new WorldMapRepository(worldMapStorage);
        await onWorldMapSaved(await repository.saveWorldContent(page.id, page.revision, data));
      } else if (props.onCommitCharacterData) {
        await props.onCommitCharacterData(data);
      } else {
        await props.onUpdateCharacterData(data);
      }
    }}
    renderComponent={(section, mode, change) => <CharacterContentEditor
      section={section}
      viewMode={mode}
      layoutMode={page.character_data?.layout}
      onChange={change}
      getAttachmentBlob={props.getAttachmentBlob}
      onUploadGalleryImage={props.onUploadGalleryImage}
    />}
  />;
}
