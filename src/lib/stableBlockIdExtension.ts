import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { createClientBlockId } from "./blockId";

/**
 * StableBlockId — 讓所有 block 節點保存穩定 id（data-id）
 *
 * 背景：createPage 產生的 content_json 中 paragraph 帶 attrs.id，
 * 但 Tiptap schema 未定義 id attribute，導致讀入時 id 被丟棄。
 * 此 extension 為所有 block 型別加上 id attribute（parse/render 皆走 data-id），
 * 並透過 appendTransaction 自動為「缺少 id 的 block」補上 id
 * （例如 Enter 新增的段落、複製貼上的內容），確保每個 block 都有穩定 id。
 *
 * 用途：
 *   1. 分頁重排時游標精確跟隨 block（block id + block 內字元偏移定位）
 *   2. 未來 Stable Block ID（M5-0）、block reference、annotation anchor 的前置
 */
export const StableBlockId = Extension.create({
  name: "stableBlockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "lessonBlock",
          "lessonToc",
          "answerSpace",
          "image",
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "taskList",
          "taskItem",
          "blockquote",
          "codeBlock",
          "horizontalRule",
          "callout",
          "multiColumn",
          "column",
          "table",
          "tableRow",
          "tableHeader",
          "tableCell",
        ],
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => {
              if (!attributes.id) return {};
              return { "data-id": attributes.id };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        // 文件變更後，為缺少 id 的 block 自動補 id（游標定位的前置）
        appendTransaction(_transactions, _oldState, newState) {
          if (!_transactions.some((tr) => tr.docChanged)) return null;
          let tr: any = null;
          const seenIds = new Set<string>();
          newState.doc.descendants((node: any, pos: number) => {
            if (!("id" in node.attrs)) return true;
            const id = node.attrs?.id;
            // Pressing Enter splits a ProseMirror node and copies its attrs.
            // Duplicate IDs make cursor anchors point at the previous page.
            if (node.type.isBlock && (!id || seenIds.has(id))) {
              if (!tr) tr = newState.tr;
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: createClientBlockId() });
            } else if (node.type.isBlock) {
              seenIds.add(id);
            }
            return true;
          });
          return tr;
        },
      }),
    ];
  },
});

