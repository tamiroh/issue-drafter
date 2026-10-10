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
    “{title || "Untitled draft"}” will be permanently removed from this browser.
  </p>
  <div>
    <button disabled={busy} onclick={oncancel}>Keep draft</button><button
      class="danger"
      disabled={busy}
      onclick={onconfirm}>{busy ? "Deleting…" : "Delete draft"}</button
    >
  </div>
</dialog>

<style>
  .confirm-dialog {
    background: var(--surface);
    padding: 28px;
    border-radius: 12px;
    max-width: 440px;
    box-shadow: 0 15px 60px #00000066;
  }

  .confirm-dialog h2 {
    font-size: 20px;
    margin-top: 0;
  }

  .confirm-dialog p {
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .confirm-dialog > div {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  .danger {
    background: #a52f45;
    color: white;
    border-color: #a52f45;
  }

  .danger:hover {
    background: #bd3d54;
  }

  .confirm-dialog {
    border: 0;
    width: calc(100% - 40px);
  }

  .confirm-dialog::backdrop {
    background: #00000099;
  }
</style>
