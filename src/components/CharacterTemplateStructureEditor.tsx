"use client";
import type { CharacterSection } from "../lib/types";
import { CHARACTER_COMPONENT_TYPES } from "../lib/characterBlocks";
/** A template edits field definitions, never a character's filled values. */
export default function CharacterTemplateStructureEditor({
  value,
  onChange,
}: {
  value: CharacterSection;
  onChange: (value: CharacterSection) => void;
}) {
  const keys =
    value.keyValues?.map((v) => v.key) ??
    value.stats?.map((v) => v.label) ??
    value.ratings?.map((v) => v.label) ??
    value.palette?.map((v) => v.label) ??
    value.externalLinks?.map((v) => v.label) ??
    value.music?.map((v) => v.label);
  const changeKeys = (labels: string[]) =>
    onChange({
      ...value,
      ...(value.keyValues
        ? { keyValues: labels.map((key) => ({ key, value: "" })) }
        : {}),
      ...(value.stats
        ? { stats: labels.map((label) => ({ label, value: 0 })) }
        : {}),
      ...(value.ratings
        ? { ratings: labels.map((label) => ({ label, value: 0 })) }
        : {}),
      ...(value.palette
        ? { palette: labels.map((label) => ({ label, color: "" })) }
        : {}),
      ...(value.externalLinks
        ? { externalLinks: labels.map((label) => ({ label, url: "" })) }
        : {}),
      ...(value.music
        ? { music: labels.map((label) => ({ label, url: "" })) }
        : {}),
    });
  return (
    <div className="space-y-3">
      <p className="text-sm opacity-60">
        僅編輯結構；不儲存角色內容、數值或圖片。
      </p>
      <label className="block">
        組件名稱
        <input
          className="block w-full border rounded p-2"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </label>
      <p className="text-sm">
        類型：
        {CHARACTER_COMPONENT_TYPES.find((t) => t.type === value.type)?.label ??
          value.type}
      </p>
      {keys && (
        <div>
          {keys.map((key, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                aria-label={`欄位名稱 ${i + 1}`}
                className="min-w-0 flex-1 border rounded p-2"
                value={key}
                onChange={(e) =>
                  changeKeys(keys.map((k, j) => (j === i ? e.target.value : k)))
                }
              />
              <button
                aria-label={`刪除欄位 ${i + 1}`}
                onClick={() => changeKeys(keys.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button onClick={() => changeKeys([...keys, "新欄位"])}>
            ＋新增欄位
          </button>
        </div>
      )}
    </div>
  );
}
