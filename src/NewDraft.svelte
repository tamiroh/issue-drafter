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
  <h1>New Draft</h1>
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
      /><button class="primary" disabled={loading}
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
      <button class="primary" onclick={create}
        >Create draft{loading ? " without a template" : ""}</button
      >
    </div>
  {/if}
  <button class="text-button" onclick={oncancel}>Cancel</button>
</section>

<style>
  .creation {
    max-width: 720px;
    margin: 90px auto;
    padding: 32px;
  }

  .creation h1 {
    margin: 18px 0 12px;
  }

  .creation form {
    margin-top: 40px;
  }

  .repository-input {
    display: flex;
    gap: 10px;
  }

  .repository-input button {
    white-space: nowrap;
  }

  .template-picker {
    margin-top: 26px;
  }

  .template-picker > .primary {
    margin-top: 18px;
  }

  .creation > .text-button {
    margin-top: 18px;
  }

  @media (max-width: 760px) {
    .repository-input {
      flex-direction: column;
    }

    .creation {
      margin: 30px auto;
      padding: 24px;
    }

    .creation h1 {
      font-size: 27px;
    }
  }

  @media (max-width: 520px) {
    .creation {
      margin: 10px auto;
    }
  }
</style>
