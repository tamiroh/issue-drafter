<script lang="ts">
  import type { IssueDraft } from "./drafts";
  import { githubIssueUrl } from "./github";
  import { renderMarkdown } from "./markdown";

  let {
    draft,
    status,
    onchange,
    onretry,
  }: {
    draft: IssueDraft;
    status: string;
    onchange: (field: "title" | "body", value: string) => void;
    onretry: () => void;
  } = $props();

  let preview = $state(false);
  let copied = $state("");

  const url = $derived(githubIssueUrl(draft));
  const html = $derived(renderMarkdown(draft.body));

  async function copy(field: "title" | "body") {
    try {
      await navigator.clipboard.writeText(draft[field]);
      copied = `${field === "title" ? "Title" : "Body"} copied.`;
    } catch {
      copied =
        "Clipboard unavailable. Select and copy the text from the editor.";
    }
  }
</script>

<header class="editor-header">
  <div class="heading">
    <h1>{draft.repository}</h1>
    <span class="muted">{draft.template ?? "No template"}</span>
  </div>
  <span
    class="save-status muted"
    class:error={status === "Save failed"}
    role="status"
    >{status}{#if status === "Save failed"}
      <button class="text-button" onclick={onretry}>Retry</button>{/if}</span
  >
  <a class="button primary" href={url} target="_blank" rel="noopener noreferrer"
    >Open on GitHub</a
  >
</header>
<div class="editor-content">
  {#if status === "Save failed"}<p class="error" role="alert">
      Your latest changes are still in memory. Retry saving before closing this
      page.
    </p>{/if}
  <label for="issue-title">Issue title</label>
  <input
    id="issue-title"
    class="title-input"
    value={draft.title}
    oninput={(event) => onchange("title", event.currentTarget.value)}
  />
  <div class="body-toolbar">
    <label for="issue-body">Description</label>
    <div class="tabs">
      <button
        class:active={!preview}
        aria-pressed={!preview}
        onclick={() => (preview = false)}>Write</button
      ><button
        class:active={preview}
        aria-pressed={preview}
        onclick={() => (preview = true)}>Preview</button
      >
    </div>
  </div>
  {#if preview}<div class="markdown preview" aria-label="Markdown preview">
      {#if draft.body}<!-- HTML is sanitized with DOMPurify in renderMarkdown. -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html html}{:else}<p class="muted">Nothing to preview.</p>{/if}
    </div>{:else}<textarea
      id="issue-body"
      value={draft.body}
      oninput={(event) => onchange("body", event.currentTarget.value)}
    ></textarea>{/if}
  <div class="editor-footer">
    <button onclick={() => copy("title")}>Copy title</button><button
      onclick={() => copy("body")}>Copy body</button
    ><span role="status">{copied}</span><span class="count"
      >{draft.body.length.toLocaleString()} characters</span
    >
  </div>
  {#if url.length > 8000}<p class="notice">
      This draft produces a long URL that GitHub or your browser may reject.
      Copy the title and body, then <a
        href={`https://github.com/${draft.repository}/issues/new`}
        target="_blank"
        rel="noopener noreferrer">open a blank issue</a
      > and paste them.
    </p>{/if}
</div>

<style>
  .editor-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .heading {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 10px;
  }

  .heading h1 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .heading span,
  .save-status {
    font-size: 12px;
  }

  .save-status {
    white-space: nowrap;
  }

  .title-input {
    font-size: 16px;
  }

  .body-toolbar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 20px 0 6px;
  }

  .body-toolbar label {
    margin: 0;
  }

  .tabs {
    display: flex;
    gap: 14px;
  }

  .tabs button {
    border: 0;
    border-bottom: 1px solid transparent;
    border-radius: 0;
    background: none;
    padding: 0 0 1px;
    font-size: 13px;
    color: var(--muted);
  }

  .tabs button:hover,
  .tabs button.active {
    color: var(--text);
  }

  .tabs button.active {
    border-bottom-color: var(--text);
  }

  textarea,
  .preview {
    min-height: 50vh;
    line-height: 1.6;
    padding: 12px;
  }

  textarea {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    display: block;
    resize: vertical;
  }

  .preview {
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .editor-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--muted);
  }

  .editor-footer button {
    font-size: 12px;
    padding: 4px 10px;
  }

  .count {
    margin-left: auto;
    white-space: nowrap;
  }

  .markdown :global(h1) {
    font-size: 24px;
  }

  .markdown :global(h2) {
    font-size: 20px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
  }

  .markdown :global(h3) {
    font-size: 16px;
  }

  .markdown :global(pre) {
    background: var(--surface);
    padding: 12px;
    border-radius: 4px;
    overflow: auto;
  }

  .markdown :global(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    background: var(--surface);
  }

  .markdown :global(blockquote) {
    border-left: 3px solid var(--border);
    padding-left: 14px;
    color: var(--muted);
    margin-left: 0;
  }

  .markdown :global(img) {
    max-width: 100%;
  }

  .markdown :global(table) {
    display: block;
    overflow: auto;
    border-collapse: collapse;
  }

  .markdown :global(th),
  .markdown :global(td) {
    border: 1px solid var(--border);
    padding: 6px 12px;
  }

  .markdown > :global(:first-child) {
    margin-top: 0;
  }

  @media (max-width: 520px) {
    .editor-header,
    .editor-footer {
      flex-wrap: wrap;
    }
  }
</style>
