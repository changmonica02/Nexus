import { useState } from "react";
import { cardRegistry, lifeModuleIds, lifeModules, moveCard, newCard, periods, sizes, statuses, templateCards, type Card, type CardType, type LifeDashboardConfig } from "./model";
import type { LifeList } from "../lists";

import { control, surface } from "./styles";

export default function DashboardEditor({ config, activeId, lists, eventSources, hasLists, busy, onSave, onCancel }: {
  config: LifeDashboardConfig;
  activeId: string;
  lists: LifeList[];
  eventSources: Record<"schedule" | "milestones" | "habits", { id: string; title: string }[]>;
  hasLists: boolean;
  busy: boolean;
  onSave: (config: LifeDashboardConfig, activeId: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(config);
  const [id, setId] = useState(activeId);
  const [dragId, setDragId] = useState<string>();
  const [template, setTemplate] = useState<"daily" | "study" | "empty">("daily");
  const board = draft.boards.find(board => board.id === id) ?? draft.boards[0];
  const offered = (Object.keys(cardRegistry) as CardType[]).filter(type =>
    (!["lists", "schedule", "milestones", "habits"].includes(type) || hasLists) && !draft.hiddenModules.includes(cardRegistry[type].module));
  const [type, setType] = useState<CardType>("calendar");
  const newType = offered.includes(type) ? type : offered[0];
  const update = (patch: Partial<typeof board>) => setDraft(current => ({
    ...current, boards: current.boards.map(item => item.id === board.id ? { ...item, ...patch } : item),
  }));
  const patchCard = (id: string, patch: Partial<Card>) => update({
    cards: board.cards.map(card => card.id === id ? { ...card, ...patch } : card),
  });
  const move = (from: string, to: string) => update({ cards: moveCard(board.cards, from, to) });
  const applyTemplate = () => templateCards(template).filter(card => hasLists || card.type !== "lists");
  const add = (copy: boolean) => {
    const id = crypto.randomUUID();
    const name = copy ? (board.name.slice(0, 76) + " 副本") : { daily: "日常生活", study: "學業管理", empty: "新儀表板" }[template];
    const cards = copy ? board.cards.map(card => ({ ...card, id: crypto.randomUUID() })) : applyTemplate();
    setDraft(current => ({ ...current, boards: [...current.boards, { id, name, cards }] }));
    setId(id);
  };
  const removeBoard = () => {
    const boards = draft.boards.filter(item => item.id !== board.id);
    if (!boards.length) return;
    setDraft({ ...draft, boards, defaultId: draft.defaultId === board.id ? boards[0].id : draft.defaultId });
    setId(boards[0].id);
  };
  return <form className={surface} onSubmit={event => {
    event.preventDefault();
    if (draft.boards.some(item => !item.name.trim())) return;
    onSave({ ...draft, boards: draft.boards.map(item => ({ ...item, name: item.name.trim() })) }, board.id);
  }}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <legend className="mb-3 text-lg font-semibold">自訂儀表板</legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">編輯配置<select className={control} value={board.id} onChange={event => setId(event.target.value)}>
          {draft.boards.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label className="grid gap-1">配置名稱<input required maxLength={80} className={control} value={board.name}
          onChange={event => update({ name: event.target.value })}/></label>
        <label className="grid gap-1">起始模板<select value={template} className={control} onChange={event => setTemplate(event.target.value as typeof template)}>
          <option value="daily">日常生活</option><option value="study">學業管理</option><option value="empty">空白</option>
        </select></label>
        <button className={control} type="button" onClick={() => add(false)}>建立配置</button>
        <button className={control} type="button" onClick={() => add(true)}>複製配置</button>
        <button className={control} type="button" disabled={draft.boards.length < 2} onClick={removeBoard}>刪除配置</button>
        <button className={control} type="button" disabled={draft.defaultId === board.id}
          onClick={() => setDraft({ ...draft, defaultId: board.id })}>{draft.defaultId === board.id ? "目前為預設" : "設為預設"}</button>
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-1">
        <legend className="font-semibold">啟用模組</legend>
        {lifeModuleIds.filter(module => lifeModules[module].optional && (!["lists", "schedule", "milestones", "habits"].includes(module) || hasLists)).map(module =>
          <label key={module} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={!draft.hiddenModules.includes(module)} onChange={event => setDraft({
              ...draft, hiddenModules: event.target.checked ? draft.hiddenModules.filter(item => item !== module) : [...draft.hiddenModules, module],
            })}/>{lifeModules[module].label}
          </label>)}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="卡片類型" className={control} value={newType ?? ""} disabled={!newType} onChange={event => setType(event.target.value as CardType)}>
          {offered.map(type => <option key={type} value={type}>{cardRegistry[type].title}</option>)}
        </select>
        <button className={control} type="button" disabled={!newType} onClick={() => update({ cards: [...board.cards, newCard(newType)] })}>新增卡片</button>
        <button className={control} type="button" onClick={() => update({ cards: templateCards("daily") })}>恢復預設卡片</button>
      </div>
      <ol className="space-y-3">
        {board.cards.map((card, index) => <li key={card.id} className="rounded-xl border border-[var(--color-border)] p-3"
          onDragOver={event => { if (dragId) event.preventDefault(); }}
          onDrop={event => { event.preventDefault(); if (dragId) move(dragId, card.id); setDragId(undefined); }}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span draggable onDragStart={event => {
              event.dataTransfer.setData("text/plain", card.id);
              event.dataTransfer.effectAllowed = "move";
              setDragId(card.id);
            }} onDragEnd={() => setDragId(undefined)} className="cursor-grab select-none rounded px-2 py-1" title="拖曳排序" aria-hidden="true">⠿</span>
            <strong className="break-all">{card.title || cardRegistry[card.type].title}</strong>
            {draft.hiddenModules.includes(cardRegistry[card.type].module) && <span className="text-sm opacity-70">模組已隱藏</span>}
            <button className={control} type="button" disabled={index === 0} onClick={() => move(card.id, board.cards[index - 1].id)}>上移</button>
            <button className={control} type="button" disabled={index === board.cards.length - 1} onClick={() => move(card.id, board.cards[index + 1].id)}>下移</button>
            <button className={control} type="button" onClick={() => update({ cards: board.cards.filter(item => item.id !== card.id) })}>移除卡片</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1">卡片標題<input className={control} maxLength={80} value={card.title} placeholder={cardRegistry[card.type].title}
              onChange={event => patchCard(card.id, { title: event.target.value })}/></label>
            <label className="grid gap-1">尺寸<select className={control} value={card.size} onChange={event => patchCard(card.id, { size: event.target.value as Card["size"] })}>
              {Object.entries(sizes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            {card.type !== "timer" && <label className="grid gap-1">顯示內容<select className={control} value={card.content} onChange={event => patchCard(card.id, { content: event.target.value as Card["content"] })}>
              <option value="summary">僅顯示統計</option><option value="items">統計與項目</option>
            </select></label>}
            {card.type !== "timer" && <label className="grid gap-1">統計期間<select className={control} value={card.period} onChange={event => patchCard(card.id, { period: event.target.value as Card["period"] })}>
              {Object.entries(periods).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>}
            {card.type === "lists" ? <label className="grid gap-1">資料來源<select className={control} value={card.listId} onChange={event => patchCard(card.id, { listId: event.target.value })}>
              <option value="">所有清單</option>
              {!!card.listId && !lists.some(list => list.id === card.listId) && <option value={card.listId}>原清單無法使用</option>}
              {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
            </select></label> : card.type !== "schedule" && card.type !== "milestones" && card.type !== "habits" && card.type !== "timer" && <label className="grid gap-1">完成狀態<select className={control} value={card.status} onChange={event => patchCard(card.id, { status: event.target.value as Card["status"] })}>
              {Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>}
            {(card.type === "schedule" || card.type === "milestones" || card.type === "habits") && <label className="grid gap-1">
              {card.type === "schedule" ? "行程分類" : "資料來源"}<select className={control} value={card.listId}
                onChange={event => patchCard(card.id, { listId: event.target.value })}>
                <option value="">全部</option>
                {card.listId && !eventSources[card.type].some(item => item.id === card.listId) && <option value={card.listId}>原來源無法使用</option>}
                {eventSources[card.type].map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>}
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={card.hidden}
              onChange={event => patchCard(card.id, { hidden: event.target.checked })}/>隱藏卡片</label>
          </div>
        </li>)}
      </ol>
      {draft.boards.some(item => !item.name.trim()) && <p role="status">請填寫每組配置的名稱。</p>}
      <div className="flex flex-wrap gap-2">
        <button className={control} disabled={draft.boards.some(item => !item.name.trim())}>儲存配置</button>
        <button className={control} type="button" onClick={onCancel}>取消</button>
      </div>
    </fieldset>
  </form>;
}
