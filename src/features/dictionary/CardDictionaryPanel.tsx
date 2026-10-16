"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDictionaryAdminAccess } from "./useDictionaryAdminAccess";
import { DictionaryModal } from "./DictionaryModal";
import { navigateDictionary } from "./useUnsavedDraft";
import { getSupabase } from "../../infrastructure/supabase/client";
import { DictionaryArticle } from "./DictionaryBrowser";
import { readPublishedEntry, type PublishedDetail } from "./reader";
const StudyDictionaryWorkspace = lazy(() =>
  import("./DictionaryAdmin").then((module) => ({
    default: module.DictionaryWorkspace,
  })),
);

/** Read-only published detail; link maintenance belongs to the private card editor. */
type PanelProps = {
  cardId: string;
  front: string;
  fixedEntryId?: string;
  onEditingChange?: (editing: boolean) => void;
};
export default function CardDictionaryPanel(props: PanelProps) {
  return (
    <LinkedDictionaryPanel
      key={JSON.stringify([props.cardId, props.fixedEntryId])}
      {...props}
    />
  );
}
function LinkedDictionaryPanel({ fixedEntryId, onEditingChange }: PanelProps) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState<PublishedDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const { access } = useDictionaryAdminAccess(open && !!fixedEntryId);
  const editingAllowed = editing && !!access?.allowed;
  useEffect(() => {
    onEditingChange?.(open);
    return () => onEditingChange?.(false);
  }, [open, onEditingChange]);
  useEffect(() => {
    const invalidate = () => {
      generation.current++;
    };
    const { data } =
      getSupabase()?.auth.onAuthStateChange(() => {
        invalidate();
        setEditing(false);
        setOpen(false);
        setDetail(null);
      }) ?? {};
    return () => {
      invalidate();
      data?.subscription.unsubscribe();
    };
  }, []);
  const load = useCallback(async () => {
    const serial = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const client = getSupabase();
      if (!client) throw Error("字典服務尚未設定。");
      const result = fixedEntryId
        ? await readPublishedEntry(client, fixedEntryId)
        : null;
      if (serial === generation.current) setDetail(result);
    } catch (e) {
      if (serial === generation.current)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (serial === generation.current) setBusy(false);
    }
  }, [fixedEntryId]);
  const closeEditor = () =>
    navigateDictionary(() => {
      setEditing(false);
      void load();
    });
  if (!fixedEntryId) return null;
  return (
    <section className="flex w-full justify-end" aria-label="字典詳情入口">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="px-2 py-2 text-sm underline"
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        字典詳情 →
      </button>
      {open && (
        <DictionaryModal
          title="字典詳情"
          onClose={() => {
            if (!editingAllowed) {
              generation.current++;
              setOpen(false);
            }
          }}
          dismissOnBackdrop
        >
          {busy && <p role="status">正在讀取字典…</p>}
          {error && (
            <div role="alert">
              {error}
              <button type="button" onClick={() => void load()}>
                重試
              </button>
            </div>
          )}
          {!busy && !error && !detail && <p>此詞條尚未收錄或尚未發布。</p>}
          {detail && <DictionaryArticle data={detail} accordion />}
          {detail && access?.allowed && (
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              編輯詞條
            </button>
          )}
          {editingAllowed && (
            <DictionaryModal
              title="編輯詞條"
              onClose={closeEditor}
              dismissOnBackdrop
            >
              <Suspense fallback={<p role="status">正在讀取詞條編輯器…</p>}>
                <StudyDictionaryWorkspace
                  key={access!.owner + ":" + fixedEntryId}
                  entryId={fixedEntryId}
                  embedded
                  onCommitted={() => {
                    setEditing(false);
                    void load();
                  }}
                />
              </Suspense>
            </DictionaryModal>
          )}
        </DictionaryModal>
      )}
    </section>
  );
}
