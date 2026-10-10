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
  <div>
    <div class="eyebrow">ISSUE DRAFT</div>
    <div class="repo-title">{draft.repository}</div>
  </div>
  <a class="button primary" href={url} target="_blank" rel="noopener noreferrer"
    >Open on GitHub <span aria-hidden="true">↗</span></a
  >
</header>
<div class="editor-content">
  <div class="editor-meta">
    <span>Template <strong>{draft.template ?? "No template"}</strong></span
    ><span class:error={status === "Save failed"} role="status"
      >{status === "Saved"
        ? "● Saved locally"
        : status}{#if status === "Save failed"}
        <button class="text-button" onclick={onretry}>Retry</button>{/if}</span
    >
  </div>
  {#if status === "Save failed"}<p class="error" role="alert">
      Your latest changes are still in memory. Retry saving before closing this
      page.
    </p>{/if}
  <label for="issue-title">Issue title</label>
  <input
    id="issue-title"
    class="title-input"
    placeholder="Give your issue a clear title"
    value={draft.title}
    oninput={(event) => onchange("title", event.currentTarget.value)}
  />
  <div class="body-toolbar">
    <label for="issue-body">Description</label>
    <div class="segmented">
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
        {@html html}{:else}<p class="muted">
          Your Markdown preview will appear here.
        </p>{/if}
    </div>{:else}<textarea
      id="issue-body"
      placeholder="Describe the problem, share some context, or propose an idea…"
      value={draft.body}
      oninput={(event) => onchange("body", event.currentTarget.value)}
    ></textarea>{/if}
  <div class="editor-footer">
    <span>Markdown supported · Saved automatically</span><span
      >{draft.body.length.toLocaleString()} characters</span
    >
  </div>
  <div class="handoff">
    <div>
      <strong>Ready when you are.</strong>
      <p>Review and submit on GitHub. Your draft stays here.</p>
    </div>
    <div class="copy-actions">
      <button onclick={() => copy("title")}>Copy title</button><button
        onclick={() => copy("body")}>Copy body</button
      >
    </div>
  </div>
  {#if url.length > 8000}<p class="notice">
      This draft produces a long URL that GitHub or your browser may reject.
      Copy the title and body, then <a
        href={`https://github.com/${draft.repository}/issues/new`}
        target="_blank"
        rel="noopener noreferrer">open a blank issue</a
      > and paste them.
    </p>{/if}
  <p class="copy-status" role="status">{copied}</p>
</div>

<style>
  .editor-header {
    min-height: 110px;
    border-bottom: 1px solid #eceef2;
    padding: 28px 5%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .repo-title {
    font-size: 17px;
    margin-top: 8px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .editor-content {
    max-width: 1080px;
    margin: auto;
    padding: 28px 5%;
  }

  .editor-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
    color: #9299a7;
    margin-bottom: 34px;
  }

  .editor-meta strong {
    color: #697484;
    font-weight: 500;
    margin-left: 8px;
  }

  .editor-meta [role="status"] {
    color: #72907d;
  }

  .title-input {
    font-size: 21px;
    letter-spacing: -0.4px;
    padding: 14px 16px;
  }

  .title-input::placeholder {
    color: #b0b6c2;
  }

  .body-toolbar {
    margin-top: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .body-toolbar label {
    margin: 0;
  }

  .segmented {
    display: flex;
    background: #f3f4f7;
    border: 1px solid #e9ebef;
    padding: 3px;
    border-radius: 7px;
  }

  .segmented button {
    border: 0;
    font-size: 12px;
    padding: 6px 16px;
    background: none;
    color: #9098a7;
  }

  .segmented button.active {
    background: #fff;
    box-shadow: 0 1px 3px #26304f15;
    color: #465474;
  }

  textarea,
  .preview {
    min-height: 390px;
    line-height: 1.8;
    padding: 20px;
    resize: vertical;
  }

  textarea {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    display: block;
  }

  textarea::placeholder {
    color: #a1a9b7;
  }

  .preview {
    border: 1px solid #dce0e7;
    border-radius: 7px;
    overflow-wrap: anywhere;
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #929bab;
    margin-top: 12px;
  }

  .handoff {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-top: 35px;
    padding-top: 23px;
    border-top: 1px solid #eceef2;
  }

  .handoff strong {
    font-size: 12px;
    font-weight: 600;
  }

  .handoff p {
    font-size: 11px;
    color: #909aaa;
    margin: 5px 0;
  }

  .copy-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .copy-actions button {
    font-size: 11px;
  }

  .copy-status {
    font-size: 12px;
    color: #6675a3;
    min-height: 20px;
  }

  .markdown :global(h1) {
    font-size: 26px;
  }

  .markdown :global(h2) {
    font-size: 21px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }

  .markdown :global(h3) {
    font-size: 17px;
  }

  .markdown :global(pre) {
    background: #f5f6f8;
    padding: 15px;
    border-radius: 6px;
    overflow: auto;
  }

  .markdown :global(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    background: #f5f6f8;
  }

  .markdown :global(blockquote) {
    border-left: 3px solid #d7dce7;
    padding-left: 16px;
    color: #7b8595;
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
    border: 1px solid #dce0e7;
    padding: 7px 12px;
  }

  .markdown :global(a) {
    color: #5968b7;
  }

  .markdown > :global(:first-child) {
    margin-top: 0;
  }

  @media (min-width: 1500px) {
    .editor-content {
      padding-top: 40px;
    }

    textarea,
    .preview {
      min-height: 470px;
    }
  }

  @media (max-width: 760px) {
    .editor-header {
      padding: 22px;
      flex-wrap: wrap;
    }

    .editor-content {
      padding: 22px;
    }

    .handoff {
      flex-wrap: wrap;
    }

    .editor-meta {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 520px) {
    .editor-header {
      min-height: auto;
    }

    .editor-footer {
      gap: 10px;
      font-size: 9px;
    }
  }
</style>
