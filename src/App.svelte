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
