import { parseDocument } from "yaml";
import type { IssueDraft } from "./drafts";
export interface IssueTemplate {
  path: string;
  name: string;
  about: string;
  title: string;
  body: string;
}
export function normalizeRepository(input: string): string {
  const value = input.trim();
  if (
    !/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]+$/i.test(value) ||
    /\/(?:\.|\.\.)$/.test(value)
  ) {
    throw new Error("Enter a repository in owner/repo format.");
  }
  return value.toLowerCase();
}
export function parseTemplate(source: string, path: string): IssueTemplate {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  let metadata: Record<string, unknown> = {};
  if (match) {
    const document = parseDocument(match[1], { schema: "core" });
    if (document.errors.length)
      throw new Error(`Invalid front matter in ${path}.`);
    const parsed: unknown = document.toJS({ maxAliasCount: 20 });
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      metadata = parsed as Record<string, unknown>;
  }
  const field = (key: string) =>
    typeof metadata[key] === "string" ? metadata[key] : "";
  return {
    path,
    name: field("name") || path.split("/").pop() || path,
    about: field("about"),
    title: field("title"),
    body: match ? text.slice(match[0].length) : text,
  };
}
const headers = { Accept: "application/vnd.github+json" };
export async function fetchTemplates(
  repository: string,
  signal?: AbortSignal,
): Promise<{ templates: IssueTemplate[]; warning: string }> {
  const repo = normalizeRepository(repository);
  const base = `https://api.github.com/repos/${repo}/contents/`;
  const response = await fetch(`${base}.github/ISSUE_TEMPLATE`, {
    headers,
    signal,
  });
  if (response.status === 404)
    return {
      templates: [],
      warning:
        "No Markdown templates found, or this public repository is unavailable. You can continue without a template.",
    };
  if (!response.ok)
    throw new Error(
      response.status === 403 || response.status === 429
        ? "GitHub API access is limited. Try again later or continue without a template."
        : `Could not load templates (HTTP ${response.status}). Continue without a template.`,
    );
  const entries: unknown = await response.json();
  if (!Array.isArray(entries))
    throw new Error("Unexpected GitHub response. Continue without a template.");
  const files = entries.filter(
    (entry): entry is { type: string; name: string } =>
      !!entry &&
      entry.type === "file" &&
      typeof entry.name === "string" &&
      /\.md$/i.test(entry.name),
  );
  const results = await Promise.allSettled(
    files.map(async (entry) => {
      const path = `.github/ISSUE_TEMPLATE/${entry.name}`;
      const result = await fetch(
        `${base}.github/ISSUE_TEMPLATE/${encodeURIComponent(entry.name)}`,
        { headers: { Accept: "application/vnd.github.raw+json" }, signal },
      );
      if (!result.ok) throw new Error(`Could not load ${entry.name}.`);
      return parseTemplate(await result.text(), path);
    }),
  );
  const templates = results
    .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    templates,
    warning: results.some((result) => result.status === "rejected")
      ? "Some templates could not be loaded. Choose an available template or continue without one."
      : templates.length
        ? ""
        : "No Markdown templates found. YAML Issue Forms are not supported.",
  };
}
export function githubIssueUrl(
  draft: Pick<IssueDraft, "repository" | "title" | "body">,
): string {
  const url = new URL(
    `https://github.com/${normalizeRepository(draft.repository)}/issues/new`,
  );
  url.search = new URLSearchParams({
    title: draft.title,
    body: draft.body,
  }).toString();
  return url.toString();
}
