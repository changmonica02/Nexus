import type { PageFormat, PageMargins } from "../lib/types";
import { DEFAULT_PAGE_MARGINS } from "../lib/types";

type RulerDimensions = { widthMm: number; width: string };

const PX_PER_MM = 3.779527559;
const FLOW_CONTENT_MARGIN_MM = 64 / PX_PER_MM;

function getRulerDimensions(format: PageFormat): RulerDimensions {
  if (format === "a4" || format === "paged") return { widthMm: 210, width: "794px" };
  if (format === "16:9") return { widthMm: 960 / PX_PER_MM, width: "960px" };
  if (format === "4:3") return { widthMm: 800 / PX_PER_MM, width: "800px" };
  return { widthMm: 820 / PX_PER_MM, width: "820px" };
}

export function getDocumentRulerWidth(format: PageFormat): string {
  return getRulerDimensions(format).width;
}

export default function DocumentRuler({
  format,
  margins,
}: {
  format: PageFormat;
  margins?: PageMargins;
}) {
  const { widthMm } = getRulerDimensions(format);
  const activeMargins = margins || (format === "flow"
    ? { ...DEFAULT_PAGE_MARGINS, left: FLOW_CONTENT_MARGIN_MM, right: FLOW_CONTENT_MARGIN_MM }
    : DEFAULT_PAGE_MARGINS);
  const ticks = Array.from({ length: Math.floor(widthMm) + 1 }, (_, millimeter) => millimeter);
  const labels = ticks.filter((millimeter) => millimeter % 10 === 0);
  const finalLabel = labels[labels.length - 1];
  const leftMargin = Math.min(100, Math.max(0, (activeMargins.left / widthMm) * 100));
  const rightMargin = Math.min(100 - leftMargin, Math.max(0, (activeMargins.right / widthMm) * 100));

  return (
    <div
      role="img"
      aria-label={`水平尺規；左右灰色區域表示頁面邊界，目前左邊界 ${activeMargins.left} mm、右邊界 ${activeMargins.right} mm`}
      className="relative h-7 w-full select-none overflow-hidden border-y"
      style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: `${leftMargin}%`, backgroundColor: "rgba(148, 163, 184, 0.22)" }} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0" style={{ width: `${rightMargin}%`, backgroundColor: "rgba(148, 163, 184, 0.22)" }} />

      {ticks.map((millimeter) => {
        const isCentimeter = millimeter % 10 === 0;
        const isHalfCentimeter = millimeter % 5 === 0;
        return (
          <span
            key={millimeter}
            aria-hidden="true"
            className="absolute bottom-0 w-px bg-zinc-500/60"
            style={{
              left: `${(millimeter / widthMm) * 100}%`,
              height: isCentimeter ? "10px" : isHalfCentimeter ? "7px" : "4px",
            }}
          />
        );
      })}
      {labels.map((millimeter) => (
        <span
          key={`label-${millimeter}`}
          aria-hidden="true"
          className={`absolute top-0.5 text-[9px] tabular-nums opacity-60 ${millimeter === 0 ? "translate-x-0" : millimeter === finalLabel ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: millimeter === 0 ? "2px" : millimeter === finalLabel ? "calc(100% - 2px)" : `${(millimeter / widthMm) * 100}%`, color: "var(--color-text)" }}
        >
          {millimeter / 10}
        </span>
      ))}

      <span aria-hidden="true" title={`左邊界：${activeMargins.left} mm`} className="absolute top-2 -translate-x-1/2 text-[10px] leading-none text-blue-600" style={{ left: `${leftMargin}%` }}>▼</span>
      <span aria-hidden="true" title={`右邊界：${activeMargins.right} mm`} className="absolute top-2 -translate-x-1/2 text-[10px] leading-none text-blue-600" style={{ left: `${100 - rightMargin}%` }}>▼</span>
    </div>
  );
}

