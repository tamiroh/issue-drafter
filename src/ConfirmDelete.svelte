<script lang="ts">
  import { onMount } from 'svelte';
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
    “{title || 'Untitled draft'}” will be permanently removed from this browser.
  </p>
  <div>
    <button disabled={busy} onclick={oncancel}>Keep draft</button><button
      class="danger"
      disabled={busy}
      onclick={onconfirm}>{busy ? 'Deleting…' : 'Delete draft'}</button
    >
  </div>
</dialog>
