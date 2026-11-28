import type { TaskSlot } from "../taskPlan";
import { allowed, kindGroup, num, str, type Fields, type HealthRecord } from "./model";

export type TaskHealthKind = "water" | "body" | "exercise";

function quantity(row: HealthRecord, slot: TaskSlot): number {
 const { kind, unit } = slot.settings.goal;
 if (kind === "check") return 1;
 const normalized = unit.toLowerCase().trim();
 if (row.kind === "water" && ["ml", "毫升"].includes(normalized)) return num(row.data, "amount") ?? 0;
 if (row.kind === "exercise") {
  if (kind === "duration" || ["分鐘", "min"].includes(normalized)) return num(row.data, "minutes") ?? 0;
  if (["km", "公里"].includes(normalized)) return num(row.data, "distance") ?? 0;
  if (["次", "次數"].includes(normalized)) return 1;
 }
 if (row.kind === "body" && ["次", "次數"].includes(normalized)) return num(row.data, "weight") === null ? 0 : 1;
 return 0;
}

export function taskHealthProgress(rows: HealthRecord[], settings: Fields, taskId: string, slot: TaskSlot, today: string): TaskSlot {
 // Explicit task records, including skips, take priority over the projection.
 if (slot.record || slot.day > today) return slot;
 const planIds = new Set(rows.filter(row => row.kind === "plan" && row.data.task === taskId).map(row => row.id));
 const amount = rows.reduce((total,row)=>{
  if (row.kind !== "water" && row.kind !== "body" && row.kind !== "exercise") return total;
  if (!allowed(settings,kindGroup[row.kind]) || row.data.task !== taskId && (row.data.task || !planIds.has(str(row,"planId")))) return total;
  const date = str(row,"date");
  if (date < slot.day || date > slot.through || date > today) return total;
  return total + quantity(row,slot);
 },0);
 if (!amount) return slot;
 return { ...slot, amount, status:amount>=slot.settings.goal.target?"complete":slot.through<today?"missed":"partial" };
}
