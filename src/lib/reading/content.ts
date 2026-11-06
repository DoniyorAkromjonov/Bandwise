import { createHash } from "node:crypto";

export type ArticleBlock = { type: "heading" | "paragraph"; text: string };

export function parseArticleContent(content: string): ArticleBlock[] {
  try {
    const value: unknown = JSON.parse(content);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ArticleBlock =>
      item && (item.type === "heading" || item.type === "paragraph") && typeof item.text === "string",
    );
  } catch {
    return [];
  }
}

export function canonicalArticleText(blocks: ArticleBlock[]) {
  return blocks.map((block) => block.text).join("\n");
}

export function articleFingerprint(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function getWordCount(blocks: ArticleBlock[]) {
  return blocks.reduce((total, block) => total + (block.type === "paragraph" ? block.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
}
