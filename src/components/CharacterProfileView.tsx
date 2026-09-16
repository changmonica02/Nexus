"use client";
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
import { updateCharacterSection, deleteCharacterSection, moveCharacterSection } from "../lib/characterWorkspace";
import { createBlankTemplate } from "../lib/characterTemplates";

const COMPONENT_TYPES: { type: CharacterComponentType; label: string; desc: string }[] = [
  { type: "key_value", label: "短文字", desc: "如身高體重、武器裝備、生日等簡短資訊" },
  { type: "tags", label: "標籤與特質", desc: "性格標籤與詳細心理側寫" },
  { type: "stats", label: "評分", desc: "力量、敏捷、智力等進度條數值評分" },
  { type: "rich_text", label: "長文", desc: "身世故事、經歷、未解之謎" },
  { type: "relations", label: "關聯", desc: "與同伴、導師、宿敵的互動關係" },
  { type: "radar", label: "雷達圖", desc: "可自訂多個能力維度與分數" },
  { type: "palette", label: "色票", desc: "建立角色或世界觀的專屬配色" },
  { type: "tendency", label: "偏向", desc: "以兩端描述呈現性格或狀態傾向" },
  { type: "statistics", label: "統計", desc: "項目、說明、數值與單位的可加總資料" },
  { type: "gallery", label: "相冊", desc: "以圖片網址整理角色或世界觀圖像" },
  { type: "links", label: "連結", desc: "收納參考資料與外部網站" },
  { type: "music", label: "音樂", desc: "收納主題曲、歌單或音樂連結" },
];

function GalleryAttachment({ attachmentId, getBlob }: { attachmentId: string; getBlob?: (id: string) => Promise<Blob | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let current = true; let objectUrl: string | null = null; void getBlob?.(attachmentId).then((blob) => { if (!blob || !current) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }); return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [attachmentId, getBlob]);
  return url ? <img src={url} alt="相冊圖片" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs opacity-45">載入中…</div>;
}

export default function CharacterProfileView({
  page,
  onTitleChange,
  onUpdateCharacterData,
  onBackToCreativeOverview,
  worlds = [],
  getAttachmentBlob,
  onUploadGalleryImage,
  onSaveTemplate,
}: {
  page: Page;
  onTitleChange: (title: string) => void;
  onUpdateCharacterData: (data: CharacterProfileData) => void;
  onBackToCreativeOverview?: () => void;
  worlds?: Page[];
  getAttachmentBlob?: (id: string) => Promise<Blob | null>;
  onUploadGalleryImage?: (file: File) => Promise<string>;
  onSaveTemplate?: (name: string, data: CharacterProfileData) => Promise<void>;
}) {
  const { askText, askConfirm, dialog } = useWorkspaceDialog();
  const [viewMode, setViewMode] = useState<"edit" | "card">("edit");
  const [templateStatus, setTemplateStatus] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [expandedLongSections, setExpandedLongSections] = useState<Set<string>>(new Set());
  const [activeTabId, setActiveTabId] = useState("base");

  // Initialize data with fallback to fantasy template
  const charData: CharacterProfileData = page.character_data || createBlankTemplate();
  const activeTab = activeTabId === "base" ? null : (charData.tabs || []).find((tab) => tab.id === activeTabId) || null;
  const currentSections = activeTab ? activeTab.sections : (charData.sections || []);

  const updateData = (patch: Partial<CharacterProfileData>) => {
    const next = { ...charData, ...patch };
    onUpdateCharacterData(next);
  };

  const updateBasic = (patch: Partial<CharacterProfileData["basic"]>) => {
    const nextBasic = { ...charData.basic, ...patch };
    updateData({ basic: nextBasic });
    if (!charData.isTemplate && patch.name !== undefined && patch.name.trim() && patch.name !== page.title) {
      onTitleChange(patch.name.trim());
    }
  };

  // Section operations
  const addSection = (type: CharacterComponentType, parent?: CharacterSection) => {
    const meta = COMPONENT_TYPES.find((c) => c.type === type);
    const newSec: CharacterSection = {
      id: `sec_${nanoid()}`,
      type,
      title: type === "group" ? "新區塊" : meta?.label || "自訂內容",
      contents: type === "group" ? [] : undefined,
      keyValues: type === "key_value" ? [{ key: "新屬性", value: "內容" }] : undefined,
      tags: type === "tags" ? ["標籤一", "標籤二"] : undefined,
      richText: type === "tags" || type === "rich_text" || type === "stats" ? "" : undefined,
      // 雷達圖沿用可擴充的數值維度資料；視覺圖形可由同一份資料重建。
      stats: type === "radar" ? [{ label: "力量", value: 3, max: 5 }, { label: "敏捷", value: 3, max: 5 }, { label: "意志", value: 3, max: 5 }] : type === "stats" ? [{ label: "綜合能力", value: 80, max: 100 }] : undefined,
      palette: type === "palette" ? [{ label: "主色", color: "#9e4b2c" }, { label: "輔色", color: "#e8c47b" }] : undefined,
      tendency: type === "tendency" ? [{ left: "內向", right: "外向", value: 50 }] : undefined,
      statistics: type === "statistics" ? [{ label: "物品", description: "介紹", value: 37, unit: "公斤" }] : undefined,
      gallery: type === "gallery" ? [] : undefined,
      galleryAttachmentIds: type === "gallery" ? [] : undefined,
      externalLinks: type === "links" ? [] : undefined,
      music: type === "music" ? [] : undefined,
      relations: type === "relations" ? [{ targetName: "目標角色", relationType: "同伴", description: "關係描述" }] : undefined,
    };
    if (parent) updateSection(parent.id, { contents: [...(parent.contents || []), newSec] });
    else saveSections([...currentSections, newSec]);
  };

  const updateSection = (id: string, patch: Partial<CharacterSection>) => {
    saveSections(updateCharacterSection(currentSections, id, patch));
  };

  const deleteSection = async (id: string) => {
    if (await askConfirm("刪除此區塊或內容？其中的資料也會一併刪除。")) saveSections(deleteCharacterSection(currentSections, id));
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    saveSections(moveCharacterSection(currentSections, id, dir === "up" ? -1 : 1));
  };

  const saveSections = (sections: CharacterSection[]) => {
    if (!activeTab) { updateData({ sections }); return; }
    updateData({ tabs: (charData.tabs || []).map((tab) => tab.id === activeTab.id ? { ...tab, sections } : tab) });
  };

  const addTab = async () => {
    const title = (await askText("新頁籤名稱", "補充資料"))?.trim();
    if (!title) return;
    const tab = { id: `tab_${nanoid()}`, title, sections: [] };
    updateData({ tabs: [...(charData.tabs || []), tab] });
    setActiveTabId(tab.id);
  };

  const saveTemplate = async () => {
    if (!onSaveTemplate || savingTemplate) return;
    const name = (await askText("模板名稱", `${page.title || "角色"}模板`))?.trim();
    if (!name) return;
    setSavingTemplate(true);
    try { await onSaveTemplate(name, charData); setTemplateStatus("已儲存，可在創作總覽的模板管理中編輯或使用。"); }
    catch { setTemplateStatus("模板儲存失敗，請重試。"); }
    finally { setSavingTemplate(false); }
  };
  const renameTab = async () => {
    if (!activeTab) return;
    const title = (await askText("頁面名稱", activeTab.title))?.trim();
    if (title) updateData({ tabs: (charData.tabs || []).map((tab) => tab.id === activeTab.id ? { ...tab, title } : tab) });
  };
  const moveTab = (direction: -1 | 1) => {
    const tabs = [...(charData.tabs || [])];
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    if (index < 0 || index + direction < 0 || index + direction >= tabs.length) return;
    [tabs[index], tabs[index + direction]] = [tabs[index + direction], tabs[index]];
    updateData({ tabs });
  };
  const renderSections = (sections: CharacterSection[]): React.ReactNode => sections.map((sec, sIdx) => (
              <div
                key={sec.id}
                className="rounded-2xl border p-5 shadow-sm transition-all relative"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                {/* 組件標題欄 */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center gap-2">
                    {viewMode === "edit" ? (
                      <input
                        value={sec.title}
                        onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                        className="font-bold text-sm bg-transparent outline-none border-b border-dashed border-zinc-400 pb-0.5"
                      />
                    ) : (
                      <span className="font-bold text-sm">{sec.title}</span>
                    )}
                  </div>

                  {viewMode === "edit" && (
                    <div className="flex items-center gap-1">
                      {sec.type !== "group" && currentSections.some((item) => item.id === sec.id) && <button title="將內容放入區塊" onClick={() => saveSections(currentSections.map((item) => item.id === sec.id ? { id: `sec_${nanoid()}`, type: "group", title: sec.title, contents: [sec] } : item))} className="px-1 text-xs">建立區塊</button>}
                      <button
                        onClick={() => moveSection(sec.id, "up")}
                        disabled={sIdx === 0}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 text-xs"
                        title="上移"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveSection(sec.id, "down")}
                        disabled={sIdx === sections.length - 1}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 text-xs"
                        title="下移"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => deleteSection(sec.id)}
                        className="p-1 rounded text-red-500 hover:bg-red-50 text-xs ml-1"
                        title="刪除組件"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {sec.type === "group" && <div className="space-y-4">
                  {renderSections(sec.contents || [])}
                  {viewMode === "edit" && <label className="block text-xs font-semibold">新增內容
                    <select aria-label={`新增內容至${sec.title}`} value="" onChange={(event) => { if (event.target.value) addSection(event.target.value as CharacterComponentType, sec); }} className="ml-3 rounded-lg border bg-transparent p-2">
                      <option value="" disabled>選擇資料種類</option>
                      {COMPONENT_TYPES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
                    </select>
                  </label>}
                  {!sec.contents?.length && viewMode === "card" && <p className="text-xs opacity-50">尚無內容</p>}
                </div>}

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
                                const next = [...(sec.keyValues || [])];
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
                                const next = [...(sec.keyValues || [])];
                                next[kvIdx].value = e.target.value;
                                updateSection(sec.id, { keyValues: next });
                              }}
                              placeholder={sec.example?.keyValues?.[kvIdx]?.value || "屬性內容"}
                              className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none"
                              style={{ borderColor: "var(--color-border)" }}
                            />
                            <button
                              onClick={() => {
                                const next = (sec.keyValues || []).filter((_, i) => i !== kvIdx);
                                updateSection(sec.id, { keyValues: next });
                              }}
                              className="text-xs text-red-500 hover:opacity-100 opacity-60 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const next = [...(sec.keyValues || []), { key: "", value: "" }];
                            updateSection(sec.id, { keyValues: next });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline pt-1 block"
                        >
                          ＋ 新增屬性欄位
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {(sec.keyValues || []).map((kv, i) => (
                          <div key={i} className="flex items-baseline py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                            <span className="w-28 opacity-60 font-medium shrink-0">{kv.key}：</span>
                            <span className="font-semibold">{kv.value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. 標籤與特質組件 (Tags) */}
                {sec.type === "tags" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(sec.tags || []).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                        >
                          {tag}
                          {viewMode === "edit" && (
                            <button
                              onClick={() => {
                                const next = (sec.tags || []).filter((_, i) => i !== tIdx);
                                updateSection(sec.id, { tags: next });
                              }}
                              className="hover:text-red-500 font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                      {viewMode === "edit" && (
                        <button
                          onClick={async () => {
                            const t = await askText("請輸入新標籤：", sec.example?.tags?.join("、") || "");
                            if (t && t.trim()) {
                              updateSection(sec.id, { tags: [...(sec.tags || []), t.trim()] });
                            }
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

                {/* 3. 數值評估組件 (Stats) */}
                {sec.type === "stats" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(sec.stats || []).map((st, stIdx) => (
                        <div key={stIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            {viewMode === "edit" ? (
                              <input
                                value={st.label}
                                onChange={(e) => {
                                  const next = [...(sec.stats || [])];
                                  next[stIdx].label = e.target.value;
                                  updateSection(sec.id, { stats: next });
                                }}
                                className="font-semibold bg-transparent outline-none w-28 border-b border-dashed border-zinc-400"
                              />
                            ) : (
                              <span className="font-semibold">{st.label}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-blue-600 font-mono">{st.value}</span>
                              <span className="opacity-40 text-[10px]">/ {st.max || 100}</span>
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
                              style={{ width: `${Math.min(100, Math.max(0, st.value / (st.max || 100) * 100))}%` }}
                            />
                          </div>
                          {viewMode === "edit" && (
                            <input
                              type="range"
                              min={0}
                              max={st.max || 100}
                              value={st.value}
                              onChange={(e) => {
                                const next = [...(sec.stats || [])];
                                next[stIdx].value = Number(e.target.value);
                                updateSection(sec.id, { stats: next });
                              }}
                              className="w-full accent-blue-600 h-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {viewMode === "edit" ? (
                      <>
                        <button
                          onClick={() => {
                            const next = [...(sec.stats || []), { label: "新能力", value: 75, max: 100 }];
                            updateSection(sec.id, { stats: next });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline block"
                        >
                          ＋ 新增數值維度
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

                {sec.type === "radar" && <CharacterRadar section={sec} editing={viewMode === "edit"} onChange={(patch) => updateSection(sec.id, patch)} />}

                {sec.type === "palette" && (
                  <div className="space-y-2">{(sec.palette || []).map((item, index) => <div key={index} className="flex items-center gap-2"><input type="color" value={item.color} disabled={viewMode === "card"} onChange={(event) => { const palette = [...(sec.palette || [])]; palette[index] = { ...item, color: event.target.value }; updateSection(sec.id, { palette }); }} className="h-9 w-12 rounded border p-1" style={{ borderColor: "var(--color-border)" }} /><input value={item.label} disabled={viewMode === "card"} onChange={(event) => { const palette = [...(sec.palette || [])]; palette[index] = { ...item, label: event.target.value }; updateSection(sec.id, { palette }); }} className="flex-1 rounded border bg-transparent px-2 py-1.5 text-xs disabled:border-0" style={{ borderColor: "var(--color-border)" }} /><code className="text-xs opacity-60">{item.color}</code>{viewMode === "edit" && <button onClick={() => updateSection(sec.id, { palette: (sec.palette || []).filter((_, itemIndex) => itemIndex !== index) })}>×</button>}</div>)}{viewMode === "edit" && <button onClick={() => updateSection(sec.id, { palette: [...(sec.palette || []), { label: "新顏色", color: "#64748b" }] })} className="text-xs font-semibold text-blue-600">＋ 新增顏色</button>}</div>
                )}

                {sec.type === "tendency" && <div className="space-y-3">{(sec.tendency || []).map((item, index) => <div key={index} className="grid grid-cols-[1fr_8rem_1fr_2rem] items-center gap-2 text-xs"><input value={item.left} disabled={viewMode === "card"} onChange={(event) => { const tendency = [...(sec.tendency || [])]; tendency[index] = { ...item, left: event.target.value }; updateSection(sec.id, { tendency }); }} className="rounded border bg-transparent px-2 py-1.5 text-right disabled:border-0" style={{ borderColor: "var(--color-border)" }} /><input type="range" min={0} max={100} value={item.value} disabled={viewMode === "card"} onChange={(event) => { const tendency = [...(sec.tendency || [])]; tendency[index] = { ...item, value: Number(event.target.value) }; updateSection(sec.id, { tendency }); }} /><input value={item.right} disabled={viewMode === "card"} onChange={(event) => { const tendency = [...(sec.tendency || [])]; tendency[index] = { ...item, right: event.target.value }; updateSection(sec.id, { tendency }); }} className="rounded border bg-transparent px-2 py-1.5 disabled:border-0" style={{ borderColor: "var(--color-border)" }} />{viewMode === "edit" && <button onClick={() => updateSection(sec.id, { tendency: (sec.tendency || []).filter((_, itemIndex) => itemIndex !== index) })}>×</button>}</div>)}{viewMode === "edit" && <button onClick={() => updateSection(sec.id, { tendency: [...(sec.tendency || []), { left: "左側", right: "右側", value: 50 }] })} className="text-xs font-semibold text-blue-600">＋ 新增偏向</button>}</div>}

                {sec.type === "statistics" && <CharacterStatistics section={sec} editing={viewMode === "edit"} onChange={(patch) => updateSection(sec.id, patch)} />}

                {sec.type === "gallery" && <div className="space-y-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(sec.galleryAttachmentIds || []).map((attachmentId, index) => <div key={attachmentId} className="relative aspect-square overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}><GalleryAttachment attachmentId={attachmentId} getBlob={getAttachmentBlob} />{viewMode === "edit" && <button onClick={() => updateSection(sec.id, { galleryAttachmentIds: (sec.galleryAttachmentIds || []).filter((_, imageIndex) => imageIndex !== index) })} className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">×</button>}</div>)}{(sec.gallery || []).map((url, index) => <div key={url + index} className="relative aspect-square overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}><img src={url} alt="相冊圖片" className="h-full w-full object-cover" /></div>)}</div>{viewMode === "edit" && <><input id={`gallery-${sec.id}`} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (!file || !onUploadGalleryImage) return; void onUploadGalleryImage(file).then((attachmentId) => updateSection(sec.id, { galleryAttachmentIds: [...(sec.galleryAttachmentIds || []), attachmentId] })); }} /><button onClick={() => document.getElementById(`gallery-${sec.id}`)?.click()} className="text-xs font-semibold text-blue-600">＋ 上傳圖片</button></>}</div>}

                {(sec.type === "links" || sec.type === "music") && <div className="space-y-2">{(sec.type === "music" ? sec.music || [] : sec.externalLinks || []).map((item, index) => <div key={index} className="flex gap-2"><input value={item.label} disabled={viewMode === "card"} onChange={(event) => { const key = sec.type === "music" ? "music" : "externalLinks"; const list = [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || [])]; list[index] = { ...item, label: event.target.value }; updateSection(sec.id, { [key]: list }); }} className="w-1/3 rounded border bg-transparent px-2 py-1.5 text-xs disabled:border-0" style={{ borderColor: "var(--color-border)" }} placeholder="名稱" />{viewMode === "card" ? <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate rounded border px-2 py-1.5 text-xs text-blue-600" style={{ borderColor: "var(--color-border)" }}>{item.url}</a> : <input value={item.url} onChange={(event) => { const key = sec.type === "music" ? "music" : "externalLinks"; const list = [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || [])]; list[index] = { ...item, url: event.target.value }; updateSection(sec.id, { [key]: list }); }} className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1.5 text-xs" style={{ borderColor: "var(--color-border)" }} placeholder={(sec.type === "music" ? sec.example?.music : sec.example?.externalLinks)?.[index]?.url || "https://"} />}{viewMode === "edit" && <button onClick={() => { const key = sec.type === "music" ? "music" : "externalLinks"; updateSection(sec.id, { [key]: (sec.type === "music" ? sec.music || [] : sec.externalLinks || []).filter((_, linkIndex) => linkIndex !== index) }); }}>×</button>}</div>)}{viewMode === "edit" && <button onClick={() => { const key = sec.type === "music" ? "music" : "externalLinks"; updateSection(sec.id, { [key]: [...(sec.type === "music" ? sec.music || [] : sec.externalLinks || []), { label: "", url: "" }] }); }} className="text-xs font-semibold text-blue-600">＋ 新增{sec.type === "music" ? "音樂" : "連結"}</button>}</div>}

                {/* 4. 長篇描述與背景 (Rich Text) */}
                {sec.type === "rich_text" && (
                  <div>
                    {viewMode === "edit" ? (
                      <textarea
                        value={sec.richText || ""}
                        onChange={(e) => updateSection(sec.id, { richText: e.target.value })}
                        placeholder={sec.example?.richText || "填寫背景身世、轉折經歷或故事細節..."}
                        rows={6}
                        className="w-full p-3 rounded-lg border text-xs bg-transparent outline-none resize-y leading-relaxed"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                    ) : (
                      <div>
                        <button type="button" onClick={() => setExpandedLongSections((current) => { const next = new Set(current); if (next.has(sec.id)) next.delete(sec.id); else next.add(sec.id); return next; })} className="flex w-full items-center gap-2 text-left text-xs font-medium opacity-80 hover:opacity-100">
                          <span>{expandedLongSections.has(sec.id) ? "⌄" : "›"}</span><span>{expandedLongSections.has(sec.id) ? "收起長文" : "展開長文"}</span>
                        </button>
                        {expandedLongSections.has(sec.id) && <p className="mt-3 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{sec.richText || "(尚未填寫背景故事)"}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. 人際關係網絡 (Relations) */}
                {sec.type === "relations" && (
                  <div className="space-y-3">
                    {viewMode === "edit" ? (
                      <>
                        {(sec.relations || []).map((rel, rIdx) => (
                          <div key={rIdx} className="p-3 rounded-lg border space-y-2 relative" style={{ borderColor: "var(--color-border)" }}>
                            <button
                              onClick={() => {
                                const next = (sec.relations || []).filter((_, i) => i !== rIdx);
                                updateSection(sec.id, { relations: next });
                              }}
                              className="absolute top-2 right-2 text-xs text-red-500 opacity-60 hover:opacity-100"
                            >
                              ✕
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={rel.targetName}
                                onChange={(e) => {
                                  const next = [...(sec.relations || [])];
                                  next[rIdx].targetName = e.target.value;
                                  updateSection(sec.id, { relations: next });
                                }}
                                placeholder={sec.example?.relations?.[rIdx]?.targetName || "關係對象姓名"}
                                className="px-2.5 py-1 rounded border text-xs font-semibold bg-transparent outline-none"
                                style={{ borderColor: "var(--color-border)" }}
                              />
                              <input
                                value={rel.relationType}
                                onChange={(e) => {
                                  const next = [...(sec.relations || [])];
                                  next[rIdx].relationType = e.target.value;
                                  updateSection(sec.id, { relations: next });
                                }}
                                placeholder="關係類型（如導師 / 宿敵）"
                                className="px-2.5 py-1 rounded border text-xs bg-transparent outline-none"
                                style={{ borderColor: "var(--color-border)" }}
                              />
                            </div>
                            <input
                              value={rel.description}
                              onChange={(e) => {
                                const next = [...(sec.relations || [])];
                                next[rIdx].description = e.target.value;
                                updateSection(sec.id, { relations: next });
                              }}
                              placeholder={sec.example?.relations?.[rIdx]?.description || "關係與互動備註描述"}
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

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {dialog}
      {/* 頂部工具列 */}
      <header
        className="shrink-0 flex flex-wrap gap-3 items-center justify-between px-4 py-3 border-b select-none z-20"
        style={{
          backgroundColor: "var(--color-sidebar-bg)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onBackToCreativeOverview && (
            <button
              onClick={onBackToCreativeOverview}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm shrink-0"
              style={{ borderColor: "var(--color-border)" }}
              title="返回創作總覽工作台"
            >
              <span>« 創作總覽</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{charData.isTemplate ? page.title : charData.basic.name || page.title || "未命名角色"}</div>
            <div className="text-[11px] opacity-60 truncate">
              {charData.basic.role ? `${charData.basic.role} · ` : ""}
              {charData.basic.affiliation || "角色詳細簡介檔案"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 模式切換 */}
          <div className="flex items-center rounded-lg p-0.5 border text-xs bg-black/5 dark:bg-white/5" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === "edit" ? "bg-white dark:bg-zinc-800 shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
            >
              編輯表單
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                viewMode === "card" ? "bg-white dark:bg-zinc-800 shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
            >
              檢視卡片
            </button>
          </div>

          {viewMode === "edit" && <button onClick={() => addSection("group")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">＋ 新增區塊</button>}

        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
        {charData.isTemplate ? <><strong>編輯模板與範文</strong><span>文字用作新角色的背景提示；數值、色票與圖片作為預設內容。</span></> : <button disabled={savingTemplate} onClick={() => void saveTemplate()} className="rounded border px-3 py-2 disabled:opacity-50">{savingTemplate ? "儲存中…" : "將目前組件與內容設為模板與範文"}</button>}
        <span role="status">{templateStatus}</span>
      </div>
      {/* 主內容區 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 角色核心基礎資訊 (Hero Header) */}
          <div
            className="rounded-2xl border p-6 shadow-sm transition-all relative overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* 頭像區域 */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div
                  className="w-28 h-28 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-inner relative group"
                  style={{
                    backgroundColor: "var(--color-sidebar-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {charData.basic.avatarUrl ? (
                    <img src={charData.basic.avatarUrl} alt={charData.basic.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl opacity-30 select-none">🎭</span>
                  )}
                  {viewMode === "edit" && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={async () => {
                          const url = await askText("請輸入頭像圖片 URL：", charData.basic.avatarUrl || "");
                          if (url !== null) updateBasic({ avatarUrl: url.trim() });
                        }}
                        className="text-[10px] text-white bg-blue-600 px-2 py-1 rounded shadow"
                      >
                        更換圖片
                      </button>
                    </div>
                  )}
                </div>
                {viewMode === "edit" && charData.basic.avatarUrl && (
                  <button onClick={() => updateBasic({ avatarUrl: "" })} className="text-[10px] text-red-500 hover:underline">
                    移除頭像
                  </button>
                )}
              </div>

              {/* 基礎欄位 */}
              <div className="flex-1 w-full space-y-3">
                {viewMode === "edit" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">角色全名 *</label>
                        <input
                          value={charData.basic.name}
                          onChange={(e) => updateBasic({ name: e.target.value })}
                          placeholder={charData.basicExamples?.name || "例如：艾爾溫·晨星"}
                          className="w-full px-3 py-1.5 rounded-lg border text-sm font-bold bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">別名 / 稱號</label>
                        <input
                          value={charData.basic.alias || ""}
                          onChange={(e) => updateBasic({ alias: e.target.value })}
                          placeholder={charData.basicExamples?.alias || "例如：破曉之刃"}
                          className="w-full px-3 py-1.5 rounded-lg border text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">性別</label>
                        <input
                          value={charData.basic.gender || ""}
                          onChange={(e) => updateBasic({ gender: e.target.value })}
                          placeholder={charData.basicExamples?.gender || "例如：男"}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">年齡</label>
                        <input
                          value={charData.basic.age || ""}
                          onChange={(e) => updateBasic({ age: e.target.value })}
                          placeholder={charData.basicExamples?.age || "例如：24 歲"}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">職業 / 身份</label>
                        <input
                          value={charData.basic.role || ""}
                          onChange={(e) => updateBasic({ role: e.target.value })}
                          placeholder={charData.basicExamples?.role || "例如：遊俠"}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold opacity-60 block mb-1">所屬陣營 / 組織</label>
                        <input
                          value={charData.basic.affiliation || ""}
                          onChange={(e) => updateBasic({ affiliation: e.target.value })}
                          placeholder={charData.basicExamples?.affiliation || "例如：銀月騎士團"}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold opacity-60 block mb-1">代表名言 / 口頭禪</label>
                      <input
                        value={charData.basic.quote || ""}
                        onChange={(e) => updateBasic({ quote: e.target.value })}
                        placeholder={charData.basicExamples?.quote || "例如：「只要晨光尚未熄滅，黑夜便無法吞噬希望。」"}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs italic bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold opacity-60 block mb-1">所屬世界觀</label>
                      <select value={charData.world_id || ""} onChange={(event) => updateData({ world_id: event.target.value || null })} className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none" style={{ borderColor: "var(--color-border)" }}>
                        <option value="">獨立角色（不歸屬世界觀）</option>
                        {worlds.filter((world) => world.id !== page.id).map((world) => <option key={world.id} value={world.id}>{world.title || "未命名世界觀"}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h1 className="text-2xl font-bold">{charData.basic.name}</h1>
                      {charData.basic.alias && <span className="text-sm opacity-60 font-medium">({charData.basic.alias})</span>}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {charData.basic.role && <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">{charData.basic.role}</span>}
                      {charData.basic.affiliation && <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 font-medium">{charData.basic.affiliation}</span>}
                      {charData.basic.gender && <span className="px-2 py-0.5 rounded border text-[11px] opacity-75">{charData.basic.gender}</span>}
                      {charData.basic.age && <span className="px-2 py-0.5 rounded border text-[11px] opacity-75">{charData.basic.age}</span>}
                      {charData.world_id && <span className="px-2 py-0.5 rounded border text-[11px] opacity-75">世界觀：{worlds.find((world) => world.id === charData.world_id)?.title || "已刪除的世界觀"}</span>}
                    </div>

                    {charData.basic.quote && (
                      <div className="pt-2 text-sm italic opacity-85 border-t mt-3" style={{ borderColor: "var(--color-border)" }}>
                        {charData.basic.quote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 自訂動態組件清單 */}
          <div className="space-y-4">
            {renderSections(currentSections)}
          </div>
        </div>
      </div>
      <footer className="shrink-0 border-t p-2" style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <nav aria-label="角色卡頁面" className="flex items-center gap-1 overflow-x-auto">
          <button aria-current={!activeTab ? "page" : undefined} onClick={() => setActiveTabId("base")} className={`shrink-0 rounded px-3 py-2 text-xs ${!activeTab ? "bg-blue-600 text-white" : ""}`}>基本資料</button>
          {(charData.tabs || []).map((tab) => <button key={tab.id} aria-current={activeTab?.id === tab.id ? "page" : undefined} onClick={() => setActiveTabId(tab.id)} className={`shrink-0 rounded px-3 py-2 text-xs ${activeTab?.id === tab.id ? "bg-blue-600 text-white" : ""}`}>{tab.title}</button>)}
          {viewMode === "edit" && <button onClick={addTab} className="shrink-0 rounded border px-3 py-2 text-xs">＋ 新增頁面</button>}
        </nav>
        {viewMode === "edit" && activeTab && <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <button onClick={renameTab}>重新命名</button>
          <button disabled={charData.tabs?.[0]?.id === activeTab.id} onClick={() => moveTab(-1)} className="disabled:opacity-30">← 左移</button>
          <button disabled={charData.tabs?.at(-1)?.id === activeTab.id} onClick={() => moveTab(1)} className="disabled:opacity-30">右移 →</button>
          <button className="text-red-600" onClick={async () => { if (await askConfirm(`刪除「${activeTab.title}」及頁面內所有內容？`)) { updateData({ tabs: (charData.tabs || []).filter((tab) => tab.id !== activeTab.id) }); setActiveTabId("base"); } }}>刪除頁面</button>
        </div>}
      </footer>
    </div>
  );
}
