<script lang="ts">
  import { onMount } from "svelte";

  let {
    title,
    busy,
    oncancel,
    onconfirm,
  }: {
    title: string;
    busy: boolean;
    oncancel: () => void;
    onconfirm: () => void;
  } = $props();

  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  class="confirm-dialog"
  aria-labelledby="delete-title"
  oncancel={(event) => {
    event.preventDefault();
    if (!busy) oncancel();
  }}
>
  <h2 id="delete-title">Delete this draft?</h2>
  <p>
    “{title || "Untitled draft"}” will be removed from this browser. This can't
    be undone.
  </p>
  <div>
    <button disabled={busy} onclick={oncancel}>Cancel</button><button
      class="danger"
      disabled={busy}
      onclick={onconfirm}>{busy ? "Deleting…" : "Delete"}</button
    >
  </div>
</dialog>

<style>
  .confirm-dialog {
    background: var(--background);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px;
    width: calc(100% - 40px);
    max-width: 400px;
  }

  .confirm-dialog::backdrop {
    background: #0009;
  }

  .confirm-dialog h2 {
    font-size: 16px;
    margin: 0 0 8px;
  }

  .confirm-dialog p {
    color: var(--muted);
    margin: 0;
    overflow-wrap: anywhere;
  }

  .confirm-dialog > div {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }

  .danger {
    background: #b3382f;
    color: #fff;
    border-color: #b3382f;
  }

  .danger:hover {
    background: #c8443a;
  }
</style>
