<script lang="ts">
  import {
    fetchTemplates,
    normalizeRepository,
    type IssueTemplate,
  } from "./github";
  import type { IssueDraft } from "./drafts";
  import { onDestroy } from "svelte";

  let {
    oncreate,
    oncancel,
  }: { oncreate: (draft: IssueDraft) => void; oncancel: () => void } = $props();

  let repository = $state("");
  let templates = $state<IssueTemplate[]>([]);
  let selected = $state("");
  let loadedRepo = $state("");
  let loading = $state(false);
  let message = $state("");
  let error = $state("");

  let controller: AbortController | undefined;

  onDestroy(() => controller?.abort());

  function reset() {
    controller?.abort();
    loading = false;
    loadedRepo = "";
    templates = [];
    selected = "";
    message = "";
    error = "";
  }

  async function load() {
    error = "";

    try {
      loadedRepo = normalizeRepository(repository);
    } catch (cause) {
      error = (cause as Error).message;

      return;
    }

    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading = true;
    templates = [];
    selected = "";
    message = "";

    try {
      const result = await fetchTemplates(loadedRepo, request.signal);
      if (!request.signal.aborted) {
        templates = result.templates;
        message = result.warning;
      }
    } catch (cause) {
      if (!request.signal.aborted)
        message =
          cause instanceof Error
            ? cause.message
            : "Could not load templates. You can continue without one.";
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }

  function create() {
    const template = templates.find((item) => item.path === selected);
    const now = Date.now();

    oncreate({
      id: crypto.randomUUID(),
      repository: loadedRepo,
      template: template?.name ?? null,
      title: template?.title ?? "",
      body: template?.body ?? "",
      createdAt: now,
      updatedAt: now,
    });
  }
</script>

<section class="creation">
  <h1>New draft</h1>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void load();
    }}
  >
    <label for="repository">GitHub repository</label>
    <div class="repository-input">
      <input
        id="repository"
        placeholder="owner/repo"
        bind:value={repository}
        oninput={reset}
        autocomplete="off"
        required
      /><button class:primary={!loadedRepo} disabled={loading}
        >{loading ? "Loading…" : "Find templates"}</button
      >
    </div>
  </form>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if loadedRepo}
    <div class="template-picker">
      <label for="template">Issue template</label>
      <select id="template" bind:value={selected} disabled={loading}>
        <option value="">No template</option>
        {#each templates as template (template.path)}<option
            value={template.path}>{template.name}</option
          >{/each}
      </select>
      {#if selected}<p class="muted">
          {templates.find((item) => item.path === selected)?.about}
        </p>{/if}
      {#if message}<p class="notice" role="status">{message}</p>{/if}
    </div>
  {/if}
  <div class="actions">
    {#if loadedRepo}<button class="primary" onclick={create}
        >Create draft{loading ? " without a template" : ""}</button
      >{/if}<button onclick={oncancel}>Cancel</button>
  </div>
</section>

<style>
  .creation h1 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 20px;
  }

  .creation > :global(*) {
    max-width: 520px;
  }

  .repository-input {
    display: flex;
    gap: 8px;
  }

  .template-picker {
    margin-top: 16px;
  }

  .template-picker p {
    font-size: 13px;
    margin: 8px 0 0;
  }

  .creation > .error {
    margin: 8px 0 0;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 20px;
  }

  @media (max-width: 520px) {
    .repository-input {
      flex-direction: column;
    }
  }
</style>
