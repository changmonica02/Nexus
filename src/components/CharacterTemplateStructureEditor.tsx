"use client";
import type { CharacterSection, CharacterComponentType } from "../lib/types";
import {
  CHARACTER_COMPONENT_TYPES,
  newCharacterComponent,
} from "../lib/characterBlocks";
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
      <label className="block">
        組件類型
        <select
          className="block w-full rounded border p-2"
          value={value.type}
          onChange={(e) =>
            onChange({
              ...newCharacterComponent(
                e.target.value as CharacterComponentType,
                value.id,
              ),
              title: value.title,
              size: value.size,
            })
          }
        >
          {CHARACTER_COMPONENT_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {value.statisticHeaders && (
        <div>
          {(["label", "description", "value", "unit"] as const).map(
            (key, i) => (
              <label className="block" key={key}>
                統計欄位標題 {i + 1}
                <input
                  className="block w-full rounded border p-2"
                  value={value.statisticHeaders![key]}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      statisticHeaders: {
                        ...value.statisticHeaders!,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ),
          )}
        </div>
      )}
      {value.tendency && (
        <div>
          {value.tendency.map((item, i) => (
            <div className="flex flex-wrap gap-2" key={i}>
              {(["left", "right"] as const).map((key) => (
                <label key={key}>
                  {key === "left" ? "左端名稱" : "右端名稱"}
                  <input
                    value={item[key]}
                    className="block min-w-0 rounded border p-2"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        tendency: value.tendency!.map((v, j) =>
                          j === i ? { ...v, [key]: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                aria-label={`刪除偏向 ${i + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    tendency: value.tendency!.filter((_, j) => j !== i),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                ...value,
                tendency: [
                  ...value.tendency!,
                  { left: "左端", right: "右端", value: 0 },
                ],
              })
            }
          >
            ＋新增偏向
          </button>
        </div>
      )}
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
