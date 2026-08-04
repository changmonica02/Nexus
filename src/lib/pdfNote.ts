import { createClientBlockId } from "./blockId";

/** ?PDF 檔?衍? research note ??設?題??除 .pdf ??????*/
export function titleFromPdfFileName(fileName: string): string {
  const withoutPdf = fileName.replace(/\.pdf$/i, "").trim();
  return withoutPdf || "Untitled PDF";
}

/** PDF import flow 建? research note ?使???? content_json??*/
export function createResearchNoteContent(fileName: string): object {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: {
          id: createClientBlockId(),
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "PDF Notes",
          },
        ],
      },
      {
        type: "paragraph",
        attrs: {
          id: createClientBlockId(),
        },
        content: [
          {
            type: "text",
            text: `Source PDF: ${fileName}`,
          },
        ],
      },
      {
        type: "paragraph",
        attrs: {
          id: createClientBlockId(),
        },
      },
    ],
  };
}