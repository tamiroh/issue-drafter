import DOMPurify from "dompurify";
import { marked } from "marked";
export function renderMarkdown(body: string): string {
  return DOMPurify.sanitize(marked.parse(body, { async: false }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["input", "style", "form"],
    FORBID_ATTR: ["style"],
  });
}
