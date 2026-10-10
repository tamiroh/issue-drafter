<script lang="ts">
  import { onMount } from "svelte";
  import NewDraft from "./NewDraft.svelte";
  import ConfirmDelete from "./ConfirmDelete.svelte";
  import Editor from "./Editor.svelte";
  import { draftStorage, DraftWriter, type IssueDraft } from "./drafts";

  let drafts = $state<IssueDraft[]>([]);
  let selected = $state("");
  let creating = $state(false);
  let loading = $state(true);
  let loadFailed = $state(false);
  let error = $state("");
  let statuses = $state<Record<string, string>>({});
  let deleting = $state("");
  let deleteBusy = $state(false);

  const writer = new DraftWriter();

  // Internal write tokens are not rendered and intentionally do not trigger updates.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const revisions = new Map<string, number>();

  const current = $derived(drafts.find((draft) => draft.id === selected));
  const repositories = $derived(
    [...new Set(drafts.map((draft) => draft.repository))].sort(),
  );
  const unsaved = $derived(
    Object.values(statuses).some((status) => status !== "Saved"),
  );

  async function load() {
    loading = true;
    error = "";
    loadFailed = false;

    try {
      drafts = (await draftStorage.list()).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      selected = drafts[0]?.id ?? "";
      creating = !drafts.length;
    } catch {
      loadFailed = true;
      error =
        "Could not open browser storage. Check browser permissions or available space, then retry.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void load();
  });

  function beforeUnload(event: BeforeUnloadEvent) {
    if (unsaved) {
      event.preventDefault();
      event.returnValue = "";
    }
  }

  function save(draft: IssueDraft) {
    const revision = (revisions.get(draft.id) ?? 0) + 1;
    revisions.set(draft.id, revision);
    statuses[draft.id] = "Saving…";

    void writer
      .save(draft)
      .then(() => {
        if (revisions.get(draft.id) === revision) statuses[draft.id] = "Saved";
      })
      .catch(() => {
        if (revisions.get(draft.id) === revision)
          statuses[draft.id] = "Save failed";
      });
  }

  function create(draft: IssueDraft) {
    drafts = [draft, ...drafts];
    selected = draft.id;
    creating = false;

    save(draft);
  }

  function edit(field: "title" | "body", value: string) {
    if (!current) return;

    const updated = { ...current, [field]: value, updatedAt: Date.now() };
    drafts = drafts.map((draft) => (draft.id === updated.id ? updated : draft));

    save(updated);
  }

  async function remove() {
    const id = deleting;
    deleteBusy = true;
    error = "";

    try {
      await writer.remove(id);
      revisions.delete(id);
      delete statuses[id];

      drafts = drafts.filter((draft) => draft.id !== id);
      if (selected === id) selected = drafts[0]?.id ?? "";
      if (!drafts.length) creating = true;
      deleting = "";
    } catch {
      error = "Could not delete this draft. Please retry.";
    } finally {
      deleteBusy = false;
    }
  }
</script>

<svelte:window onbeforeunload={beforeUnload} />
<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="./">Issue Drafter</a>
    <button
      class="new-draft"
      disabled={loading || loadFailed}
      onclick={() => (creating = true)}>New draft</button
    >
    <nav aria-label="Drafts">
      {#each repositories as repository (repository)}
        <div class="repository-group">
          <h2>{repository}</h2>
          {#each drafts.filter((draft) => draft.repository === repository) as draft (draft.id)}
            <div
              class="draft-row"
              class:selected={selected === draft.id && !creating}
            >
              <button
                class="draft-select"
                aria-current={selected === draft.id && !creating
                  ? "page"
                  : undefined}
                onclick={() => {
                  selected = draft.id;
                  creating = false;
                }}
                ><span>{draft.title || "Untitled draft"}</span><small
                  class:error={statuses[draft.id] === "Save failed"}
                  >{statuses[draft.id] === "Save failed"
                    ? "Not saved"
                    : new Date(draft.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}</small
                ></button
              >
              <button
                class="delete-draft"
                aria-label={`Delete ${draft.title || "Untitled draft"}`}
                onclick={() => (deleting = draft.id)}>×</button
              >
            </div>
          {/each}
        </div>
      {/each}
      {#if !drafts.length}<p class="empty-list">No drafts yet.</p>{/if}
    </nav>
  </aside>
  <main>
    {#if error}<div class="global-error" role="alert">
        {error}
        {#if loadFailed}<button onclick={load}>Retry</button>{/if}
      </div>{/if}
    {#if loading}<div class="empty-state">
        Loading…
      </div>{:else if loadFailed}<div class="empty-state">
        Browser storage is required to safely save drafts.
      </div>{:else if creating}<NewDraft
        oncreate={create}
        oncancel={() => (creating = false)}
      />{:else if current}{#key current.id}<Editor
          draft={current}
          status={statuses[current.id] ?? "Saved"}
          onchange={edit}
          onretry={() => current && save(current)}
        />{/key}{:else}<div class="empty-state">
        <p>No draft selected.</p>
        <button onclick={() => (creating = true)}>New draft</button>
      </div>{/if}
  </main>
</div>
{#if deleting}
  <ConfirmDelete
    title={drafts.find((draft) => draft.id === deleting)?.title ?? ""}
    busy={deleteBusy}
    oncancel={() => (deleting = "")}
    onconfirm={remove}
  />
{/if}

<style>
  :global(:root) {
    color-scheme: dark;

    --background: #181818;
    --inset: #141414;
    --surface: #262626;
    --selected: #2e2e2e;
    --border: #404040;
    --text: #e2e2e2;
    --muted: #999;
    --link: #8cb4f0;
    --selection: #34425a;
    --danger: #f0776c;

    font-family:
      system-ui,
      -apple-system,
      "Segoe UI",
      sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
    background: var(--background);
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
  }

  :global(button),
  :global(input),
  :global(textarea),
  :global(select) {
    font: inherit;
  }

  :global(button),
  :global(.button) {
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text);
    padding: 6px 12px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  :global(button:hover),
  :global(.button:hover) {
    background: var(--surface);
  }

  :global(button:disabled) {
    opacity: 0.5;
    cursor: default;
  }

  :global(:focus-visible) {
    outline: 2px solid var(--link);
    outline-offset: 1px;
  }

  :global(input),
  :global(textarea),
  :global(select) {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--inset);
    color: inherit;
    padding: 8px 10px;
    outline-offset: -1px;
  }

  :global(input::placeholder),
  :global(textarea::placeholder) {
    color: var(--muted);
    opacity: 1;
  }

  :global(a) {
    color: var(--link);
  }

  :global(label),
  :global(.label) {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .app-shell {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    height: 100dvh;
  }

  .sidebar {
    background: var(--inset);
    border-right: 1px solid var(--border);
    padding: 16px 12px;
    overflow-y: auto;
  }

  .brand {
    display: block;
    text-decoration: none;
    color: var(--text);
    font-weight: 600;
    padding: 0 8px;
  }

  .new-draft {
    width: 100%;
    margin: 16px 0 8px;
  }

  .repository-group h2 {
    font-size: 12px;
    font-weight: 400;
    overflow-wrap: anywhere;
    margin: 16px 0 4px;
    padding: 0 8px;
    color: var(--muted);
  }

  .draft-row {
    display: flex;
    align-items: center;
    border-radius: 4px;
  }

  .draft-row:hover {
    background: var(--surface);
  }

  .draft-row.selected {
    background: var(--selected);
  }

  .draft-select {
    flex: 1;
    min-width: 0;
    background: none;
    border: 0;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 6px 0 6px 8px;
    font-size: 13px;
  }

  .draft-select span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .draft-select small {
    font-size: 12px;
    color: var(--muted);
  }

  .delete-draft {
    background: none;
    border: 0;
    padding: 4px 8px;
    font-size: 16px;
    line-height: 1;
    color: var(--muted);
  }

  .delete-draft:hover {
    color: var(--text);
  }

  .empty-list {
    color: var(--muted);
    font-size: 13px;
    margin: 16px 0 0;
    padding: 0 8px;
  }

  main {
    min-width: 0;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  main > :global(*) {
    width: 100%;
    max-width: 820px;
    margin-inline: auto;
  }

  :global(.primary) {
    background: var(--text);
    color: var(--background);
    border-color: var(--text);
  }

  :global(.primary:hover) {
    background: #fff;
  }

  :global(.muted) {
    color: var(--muted);
  }

  :global(.text-button) {
    background: none;
    border: 0;
    color: inherit;
    padding: 0;
    text-decoration: underline;
  }

  :global(.text-button:hover) {
    background: none;
  }

  :global(.error) {
    color: var(--danger);
  }

  :global(.notice),
  :global(.global-error) {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
  }

  .global-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .empty-state {
    color: var(--muted);
  }

  .empty-state p {
    margin: 0 0 12px;
  }

  @media (max-width: 760px) {
    .app-shell {
      grid-template-columns: 200px minmax(0, 1fr);
    }

    main {
      padding: 16px;
    }
  }

  @media (max-width: 520px) {
    .app-shell {
      display: block;
      height: auto;
    }

    main {
      overflow-y: visible;
    }

    .sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }

    .sidebar nav {
      max-height: 190px;
      overflow: auto;
    }
  }
</style>
