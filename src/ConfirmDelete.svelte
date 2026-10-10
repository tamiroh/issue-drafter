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
    background: #fff;
    padding: 28px;
    border-radius: 12px;
    max-width: 440px;
    box-shadow: 0 15px 60px #17203333;
  }

  .confirm-dialog h2 {
    font-size: 20px;
    margin-top: 0;
  }

  .confirm-dialog p {
    color: #7b8595;
    overflow-wrap: anywhere;
  }

  .confirm-dialog > div {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  .danger {
    background: #b13b4b;
    color: white;
    border-color: #b13b4b;
  }

  .danger:hover {
    background: #992c3b;
  }

  .confirm-dialog {
    border: 0;
    width: calc(100% - 40px);
  }

  .confirm-dialog::backdrop {
    background: #17203366;
  }
</style>
