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
    <a class="brand" href="./"
      ><span class="brand-icon" aria-hidden="true">▤</span> issue-drafter<span
        class="brand-dot">.</span
      ></a
    >
    <button
      class="new-draft"
      disabled={loading || loadFailed}
      onclick={() => (creating = true)}
      ><span aria-hidden="true">＋</span> New Draft</button
    >
    <div class="sidebar-label">YOUR DRAFTS <span>{drafts.length}</span></div>
    <nav aria-label="Drafts">
      {#each repositories as repository (repository)}
        <div class="repository-group">
          <h2><span aria-hidden="true">▱</span> {repository}</h2>
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
                  >{statuses[draft.id] === "Save failed"
                    ? "Not saved · Retry in editor"
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
      {#if !drafts.length}<p class="empty-list">
          A little space for your next big idea.<br />Your drafts will live
          here.
        </p>{/if}
    </nav>
    <div class="sidebar-bottom">
      <span class="local-dot"></span> Local to this browser
      <p>Drafts stay on this device.</p>
    </div>
  </aside>
  <main>
    {#if error}<div class="global-error" role="alert">
        {error}
        {#if loadFailed}<button onclick={load}>Retry</button>{/if}
      </div>{/if}
    {#if loading}<div class="empty-state">
        Loading your drafts…
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
        <h1>Your next issue starts here.</h1>
        <p>Create a draft to start writing.</p>
        <button class="primary" onclick={() => (creating = true)}
          >New Draft</button
        >
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

    --background: #101318;
    --sidebar: #151920;
    --surface: #1c222c;
    --surface-hover: #283141;
    --selected: #2a3354;
    --border: #364153;
    --text: #e6eaf2;
    --muted: #a3aec0;
    --accent: #a5b4fc;
    --success: #8fd3a8;
    --danger: #ff9aa9;
    --notice-bg: #332c1e;
    --notice-text: #ebca88;

    font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    color: var(--text);
    background: var(--background);
    font-synthesis: none;
    font-weight: 400;
    font-size: 14px;
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
    border-radius: 7px;
    background: var(--surface);
    color: var(--text);
    padding: 9px 13px;
    font-weight: 550;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    transition: background 0.15s;
  }

  :global(button:hover),
  :global(.button:hover) {
    background: var(--surface-hover);
  }

  :global(button:disabled) {
    opacity: 0.5;
    cursor: wait;
  }

  :global(button:focus-visible),
  :global(a:focus-visible) {
    outline: 3px solid var(--accent);
    outline-offset: 3px;
  }

  :global(input),
  :global(textarea),
  :global(select) {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    color: inherit;
    padding: 12px;
    outline: none;
  }

  :global(input:focus),
  :global(textarea:focus),
  :global(select:focus) {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px #a5b4fc26;
  }

  :global(input::placeholder),
  :global(textarea::placeholder) {
    color: var(--muted);
    opacity: 1;
  }

  :global(a) {
    color: var(--accent);
  }

  :global(label) {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  :global(h1) {
    font-size: 32px;
    letter-spacing: -1.1px;
    line-height: 1.2;
    font-weight: 650;
  }

  :global(p) {
    line-height: 1.7;
  }

  .app-shell {
    display: grid;
    grid-template-columns: 268px minmax(0, 1fr);
    min-height: 100dvh;
  }

  .sidebar {
    background: var(--sidebar);
    border-right: 1px solid var(--border);
    padding: 32px 18px 20px;
    display: flex;
    flex-direction: column;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--text);
    font-size: 20px;
    letter-spacing: -0.6px;
    font-weight: 700;
    padding: 0 9px;
  }

  .brand-icon {
    font-size: 28px;
    color: var(--accent);
  }

  .brand-dot {
    color: var(--accent);
    margin-left: -7px;
  }

  .new-draft {
    width: 100%;
    margin: 32px 0;
    color: var(--accent);
    border-color: var(--border);
    box-shadow: 0 2px 3px #0000001a;
  }

  .new-draft span {
    font-size: 20px;
  }

  .sidebar-label {
    display: flex;
    justify-content: space-between;
    padding: 0 10px;
    color: var(--muted);
    font-size: 10px;
    letter-spacing: 1.4px;
    font-weight: 650;
  }

  .sidebar-label span {
    letter-spacing: 0;
  }

  .repository-group {
    margin-top: 22px;
  }

  .repository-group h2 {
    font-size: 12px;
    font-weight: 600;
    overflow-wrap: anywhere;
    padding: 0 10px;
    color: var(--muted);
    display: flex;
    gap: 7px;
    line-height: 1.6;
  }

  .draft-row {
    display: flex;
    border-radius: 7px;
    margin-top: 5px;
    align-items: center;
  }

  .draft-row.selected {
    background: var(--selected);
  }

  .draft-select {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 0;
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
    gap: 6px;
    text-align: left;
    font-size: 13px;
  }

  .draft-select span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .draft-select small {
    font-size: 11px;
    color: var(--muted);
    font-weight: 400;
  }

  .selected .draft-select {
    color: var(--accent);
  }

  .delete-draft {
    background: none;
    border: 0;
    padding: 6px 10px;
    font-size: 20px;
    color: var(--muted);
  }

  .empty-list {
    color: var(--muted);
    font-size: 12px;
    padding: 12px 10px;
  }

  .sidebar-bottom {
    margin-top: auto;
    padding: 50px 10px 0;
    font-size: 11px;
    color: var(--muted);
  }

  .sidebar-bottom p {
    margin: 5px 0 0 13px;
    font-size: 10px;
    color: var(--muted);
  }

  .local-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--success);
    margin-right: 5px;
  }

  main {
    min-width: 0;
  }

  :global(.eyebrow) {
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 1.6px;
    color: var(--muted);
  }

  :global(.primary) {
    background: #5263ba;
    color: #fff;
    border-color: #5263ba;
  }

  :global(.primary:hover) {
    background: #6172cc;
  }

  :global(.muted) {
    color: var(--muted);
  }

  :global(.text-button) {
    background: none;
    border: 0;
    color: var(--accent);
    padding: 10px 0;
    font-size: 12px;
  }

  :global(.error) {
    color: var(--danger) !important;
  }

  :global(.notice),
  :global(.global-error) {
    background: var(--notice-bg);
    color: var(--notice-text);
    border-radius: 6px;
    padding: 12px 15px;
    font-size: 12px;
    line-height: 1.6;
  }

  .global-error {
    margin: 20px;
  }

  .empty-state {
    text-align: center;
    padding: 100px 25px;
    color: var(--muted);
  }

  @media (min-width: 1500px) {
    .app-shell {
      grid-template-columns: 300px minmax(0, 1fr);
    }
  }

  @media (max-width: 760px) {
    .app-shell {
      grid-template-columns: 210px minmax(0, 1fr);
    }

    .sidebar {
      padding: 24px 10px;
    }

    .brand {
      font-size: 16px;
    }
  }

  @media (max-width: 520px) {
    .app-shell {
      display: block;
    }

    .sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--border);
      padding: 18px;
    }

    .brand {
      font-size: 20px;
    }

    .new-draft {
      margin: 16px 0;
    }

    .sidebar nav {
      max-height: 190px;
      overflow: auto;
    }

    .sidebar-bottom {
      display: none;
    }

    .repository-group {
      margin-top: 10px;
    }

    .empty-list {
      margin: 5px 0;
    }
  }
</style>
