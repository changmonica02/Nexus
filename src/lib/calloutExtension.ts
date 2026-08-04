import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "success" | "danger" | "note";

export const CALLOUT_VARIANTS: { value: CalloutVariant; label: string; defaultIcon: string }[] = [
  { value: "info", label: "Info", defaultIcon: "💡" },
  { value: "warning", label: "Warning", defaultIcon: "⚠️" },
  { value: "success", label: "Success", defaultIcon: "✅" },
  { value: "danger", label: "Danger", defaultIcon: "⛔" },
  { value: "note", label: "Note", defaultIcon: "📝" },
];

export const CALLOUT_ICON_CHOICES = ["💡", "⚠️", "✅", "⛔", "📝", "📌", "🔥", "⭐", "💬", "📚"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
      updateCalloutAttrs: (attrs: { variant?: CalloutVariant; icon?: string | null }) => ReturnType;
    };
  }
}

const VARIANT_STYLES: Record<CalloutVariant, { bg: string; border: string }> = {
  info: { bg: "rgba(37, 99, 235, 0.08)", border: "#2563eb" },
  warning: { bg: "rgba(217, 119, 6, 0.1)", border: "#d97706" },
  success: { bg: "rgba(21, 128, 61, 0.1)", border: "#15803d" },
  danger: { bg: "rgba(220, 38, 38, 0.1)", border: "#dc2626" },
  note: { bg: "rgba(82, 82, 91, 0.08)", border: "#71717a" },
};

function isCalloutVariant(value: unknown): value is CalloutVariant {
  return typeof value === "string" && CALLOUT_VARIANTS.some((v) => v.value === value);
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (element) => {
          const value = element.getAttribute("data-variant");
          return isCalloutVariant(value) ? value : "info";
        },
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
      icon: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => {
          if (attributes.icon === null || attributes.icon === undefined) return {};
          return { "data-icon": attributes.icon };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout: (variant: CalloutVariant = "info") => ({ commands }) => commands.toggleWrap(this.name, { variant }),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
      updateCalloutAttrs: (attrs: { variant?: CalloutVariant; icon?: string | null }) => ({ commands }) => commands.updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "nexus-callout";
      const header = document.createElement("div");
      header.className = "nexus-callout-header";
      header.contentEditable = "false";
      const iconButton = document.createElement("button");
      iconButton.type = "button";
      iconButton.className = "nexus-callout-icon-button";
      iconButton.title = "更換圖示";
      const menu = document.createElement("div");
      menu.className = "nexus-callout-icon-menu";
      menu.style.display = "none";
      const variantSelect = document.createElement("select");
      variantSelect.className = "nexus-callout-variant-select";
      variantSelect.title = "切換類型";
      const content = document.createElement("div");
      content.className = "nexus-callout-content";
      header.appendChild(iconButton);
      header.appendChild(variantSelect);
      dom.appendChild(header);
      dom.appendChild(menu);
      dom.appendChild(content);

      function currentVariantMeta(currentNode: typeof node) {
        const variant: CalloutVariant = isCalloutVariant(currentNode.attrs.variant) ? currentNode.attrs.variant : "info";
        const meta = CALLOUT_VARIANTS.find((v) => v.value === variant) || CALLOUT_VARIANTS[0];
        return { variant, meta };
      }
      function resolvedIcon(currentNode: typeof node) {
        const { meta } = currentVariantMeta(currentNode);
        const rawIcon = currentNode.attrs.icon;
        if (rawIcon === "") return "";
        if (typeof rawIcon === "string" && rawIcon.length > 0) return rawIcon;
        return meta.defaultIcon;
      }
      function renderMenu() {
        menu.innerHTML = "";
        CALLOUT_ICON_CHOICES.forEach((choice) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "nexus-callout-icon-choice";
          btn.textContent = choice;
          btn.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
          btn.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); applyIcon(choice); menu.style.display = "none"; });
          menu.appendChild(btn);
        });
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "nexus-callout-icon-choice nexus-callout-icon-remove";
        removeBtn.textContent = "移除圖示";
        removeBtn.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
        removeBtn.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); applyIcon(""); menu.style.display = "none"; });
        menu.appendChild(removeBtn);
      }
      function applyIcon(icon: string) {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...editor.view.state.doc.nodeAt(pos)?.attrs, icon }));
      }
      function applyVariant(variant: CalloutVariant) {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        const existing = editor.view.state.doc.nodeAt(pos)?.attrs || {};
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...existing, variant }));
      }
      iconButton.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
      iconButton.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); renderMenu(); menu.style.display = menu.style.display === "none" ? "flex" : "none"; });
      document.addEventListener("click", (event) => {
        const target = event.target as unknown as globalThis.Node | null;
        if (target && !dom.contains(target)) menu.style.display = "none";
      });
      CALLOUT_VARIANTS.forEach((v) => {
        const option = document.createElement("option");
        option.value = v.value;
        option.textContent = v.label;
        variantSelect.appendChild(option);
      });
      variantSelect.addEventListener("mousedown", (event) => { event.stopPropagation(); });
      variantSelect.addEventListener("change", () => { if (isCalloutVariant(variantSelect.value)) applyVariant(variantSelect.value); });
      function syncFromNode(currentNode: typeof node) {
        const { variant } = currentVariantMeta(currentNode);
        const style = VARIANT_STYLES[variant];
        dom.style.backgroundColor = style.bg;
        dom.style.borderLeft = `3px solid ${style.border}`;
        iconButton.textContent = resolvedIcon(currentNode) || "💡";
        variantSelect.value = variant;
      }
      syncFromNode(node);
      return {
        dom,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "callout") return false;
          syncFromNode(updatedNode);
          return true;
        },
      };
    };
  },
});