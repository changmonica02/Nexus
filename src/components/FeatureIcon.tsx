import {
  UserRound,
  Settings,
  Search,
  Download,
  Info,
  RefreshCw,
  Copy,
  Pin,
  Star,
  FileDown,
  Menu,
  ChevronLeft,
  LayoutGrid,
  PencilLine,
  NotebookTabs,
  CalendarDays,
  Sparkles,
  BookOpen,
  Wrench,
  Music,
  BookA,
  FileText,
  Presentation,
  Globe,
  Calculator,
  Shuffle,
  Map,
  ContactRound,
  Inbox,
  Folder,
  Home,
  Trash2,
  StickyNote,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { isNovelPage, type Page } from "../lib/types";
/** Replace a component here to adopt a custom SVG without changing stored identifiers. */
export const featureIcons: Record<string, LucideIcon> = {
  account: UserRound,
  settings: Settings,
  search: Search,
  import: Download,
  info: Info,
  sync: RefreshCw,
  menu: Menu,
  closeSidebar: ChevronLeft,
  overview: LayoutGrid,
  pin: Pin,
  copy: Copy,
  rename: PencilLine,
  delete: Trash2,
  favorite: Star,
  unfavorite: Star,
  "export-md": FileDown,
  "export-pdf": FileDown,
  "export-nexus": FileDown,
  notes: PencilLine,
  note: PencilLine,
  study: NotebookTabs,
  study_set: NotebookTabs,
  calendar: CalendarDays,
  todo: CalendarDays,
  creative: Sparkles,
  novels: BookOpen,
  novel: BookOpen,
  tools: Wrench,
  score: Music,
  dictionary: BookA,
  documents: FileText,
  document: FileText,
  presentations: Presentation,
  presentation: Presentation,
  web: Globe,
  counter: Calculator,
  draw: Shuffle,
  world: Map,
  character: ContactRound,
  quicknotes: StickyNote,
  quick_note: StickyNote,
  all: Layers,
  folder: Folder,
  home: Home,
  trash: Trash2,
  inbox: Inbox,
  note_flow: PencilLine,
  note_paged: PencilLine,
};
export function featureForPage(
  page: Pick<Page, "kind" | "creative_type" | "character_data">,
) {
  if (isNovelPage(page as Page)) return "novels";
  return page.kind === "creative"
    ? page.creative_type === "world"
      ? "world"
      : "character"
    : (page.kind ?? "notes");
}
export default function FeatureIcon({
  feature,
  page,
  size = 20,
  className = "",
}: {
  feature?: string;
  page?: Pick<Page, "kind" | "creative_type" | "character_data">;
  size?: number;
  className?: string;
}) {
  const key = page ? featureForPage(page) : (feature ?? "notes"),
    Icon = featureIcons[key] ?? PencilLine;
  return (
    <Icon
      aria-hidden="true"
      data-feature-icon={key}
      size={size}
      strokeWidth={1.75}
      className={"inline-block shrink-0 align-middle text-current " + className}
    />
  );
}
