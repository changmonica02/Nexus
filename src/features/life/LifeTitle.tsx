import { useLanguage } from "../../lib/LanguageContext";
import type { LifeModule } from "./dashboard/model";

export default function LifeTitle({ tab }: { tab: LifeModule | "overview" }) {
  const { t, language } = useLanguage();
  const section = tab === "health" ? (language === "zh-TW" ? "健康管理" : "Health")
    : tab === "finance" ? (language === "zh-TW" ? "財務" : "Finance")
    : tab === "lists" ? t("life.lists") : tab === "overview" ? t("life.overview") : t("life.calendar");
  return <h1 className="ml-2 flex min-w-0 items-center gap-2 text-sm font-semibold sm:ml-3 sm:gap-3 sm:text-base">
    <span className="shrink-0 border-l border-[var(--color-border)] pl-2 sm:pl-3">{t("life.title")}</span>
    <span className="truncate border-l border-[var(--color-border)] pl-2 sm:pl-3">{section}</span>
  </h1>;
}
