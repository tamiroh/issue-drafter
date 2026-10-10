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
