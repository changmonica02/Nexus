"use client";
import { useEffect, useState } from "react";
import CharacterProfileView from "../../components/CharacterProfileView";
import CreativeView from "../../components/CreativeView";
import NovelReaderView from "../../components/NovelReaderView";
import { createBlankTemplate, createDnd5eTemplate, createCoc7eTemplate } from "../../lib/characterTemplates";
import { instantiateCharacterTemplate, snapshotCharacterTemplate } from "../../lib/characterWorkspace";
import { emptyNovelDocument, getNovelChapters, splitLegacyNovel } from "../../lib/novelChapters";
import { LanguageProvider } from "../../lib/LanguageContext";
import type { Page, NovelChapter } from "../../lib/types";

const base = (id: string, title: string): Page => ({ id, title, kind: "creative", content_json: emptyNovelDocument(), content_text: "", default_mode: "note", created_at: 1, updated_at: 1, deleted_at: null, revision: 1, device_id: "qa" });
const initial: Page[] = [
  { ...base("character", "測試角色"), creative_type: "character", character_data: createBlankTemplate() },
  { ...base("novel", "測試小說"), creative_type: "novel", content_json: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "第一章" }] }, { type: "paragraph", content: [{ type: "text", text: "第一章正文" }] }, { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "第二章" }] }, { type: "paragraph", content: [{ type: "text", text: "第二章正文" }] }] }, content_text: "第一章\n第一章正文\n第二章\n第二章正文" },
];
export default function QA() {
  const [pages, setPages] = useState(initial);
  const [activeId, setActiveId] = useState("character");
  const [ready, setReady] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("nexus-isolated-qa"); if (saved) setPages(JSON.parse(saved)); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem("nexus-isolated-qa", JSON.stringify(pages)); }, [pages, ready]);
  const active = pages.find((page) => page.id === activeId);
  const patch = (id: string, value: Partial<Page>) => setPages((prev) => prev.map((page) => page.id === id ? { ...page, ...value } : page));
  const add = (page: Page) => { setPages((prev) => [...prev, page]); setActiveId(page.id); };
  return <LanguageProvider initialLanguage="zh-TW"><main className="flex h-dvh flex-col" style={{ color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>
    <nav className="flex shrink-0 gap-4 border-b p-2"><button onClick={() => setActiveId("character")}>測試角色</button><button onClick={() => setActiveId("novel")}>測試小說</button><button onClick={() => setActiveId("overview")}>測試模板管理</button></nav>
    {!ready ? <p>載入中</p> : active?.character_data ? <CharacterProfileView key={active.id} page={active} onTitleChange={(title) => patch(active.id, { title })} onUpdateCharacterData={(data) => patch(active.id, { character_data: data })} onSaveTemplate={async (title, data) => { setPages((prev) => [...prev, { ...base(crypto.randomUUID(), title), creative_type: "character", character_data: snapshotCharacterTemplate(data) }]); }} /> : active?.id === "novel" ? <NovelReaderView page={active} chapterRecords={getNovelChapters(pages, active.id)} onTitleChange={(title) => patch(active.id, { title })} onContentChange={(json, text) => patch(active.id, { content_json: json, content_text: text })} onUpdateSettings={(novel_settings) => patch(active.id, { novel_settings })} onPatchChapter={patch} onEnableChapters={async () => { const chapters = splitLegacyNovel(active).map((part, sort_order) => ({ ...base(crypto.randomUUID(), part.title), ...part, kind: "novel_chapter" as const, parent_id: active.id, sort_order })); setPages((prev) => [...prev.map((page) => page.id === active.id ? { ...page, novel_settings: { chaptersEnabled: true }, content_json: emptyNovelDocument(), content_text: "" } : page), ...chapters]); }} onCreateChapter={async () => { const chapter: NovelChapter = { ...base(crypto.randomUUID(), "新章節"), kind: "novel_chapter", parent_id: active.id, sort_order: getNovelChapters(pages, active.id).length }; setPages((prev) => [...prev, chapter]); return chapter; }} /> : <CreativeView pages={pages} templates={pages.filter((page) => page.character_data?.isTemplate && !page.deleted_at)} onSelectPage={setActiveId} onCreateWorld={() => {}} onDeletePage={(id) => patch(id, { deleted_at: Date.now() })} onRenameTemplate={(id, title) => patch(id, { title })} onCreateTemplate={() => add({ ...base(crypto.randomUUID(), "新模板"), creative_type: "character", character_data: { ...createBlankTemplate(), isTemplate: true } })} onCreateCharacter={(id) => { const source = pages.find((page) => page.id === id)?.character_data ?? (id === "dnd5e" ? createDnd5eTemplate() : id === "coc7e" ? createCoc7eTemplate() : createBlankTemplate()); add({ ...base(crypto.randomUUID(), "新測試角色"), creative_type: "character", character_data: instantiateCharacterTemplate(source, id) }); }} />}
  </main></LanguageProvider>;
}
