import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { draftStorage, DraftWriter, type IssueDraft } from "./drafts";

const draft = (id: string): IssueDraft => ({
  id,
  repository: "owner/repo",
  template: null,
  title: "Title",
  body: "Body",
  createdAt: 1,
  updatedAt: 1,
});

describe("draft storage", () => {
  it("persists multiple drafts, updates them, restores contents and deletes independently", async () => {
    await draftStorage.save(draft("one"));
    await draftStorage.save(draft("two"));
    await draftStorage.save({ ...draft("one"), body: "Edited", updatedAt: 2 });

    expect(
      (await draftStorage.list()).find((item) => item.id === "one")?.body,
    ).toBe("Edited");

    await draftStorage.remove("one");

    expect((await draftStorage.list()).map((item) => item.id)).toEqual(["two"]);

    await draftStorage.remove("two");
  });

  it("snapshots edits and serializes writes across draft switches and deletion", async () => {
    const events: string[] = [];
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => (release = resolve));
    const writer = new DraftWriter({
      save: async (value) => {
        await blocked;
        events.push(`${value.id}:${value.body}`);
      },
      remove: async (id) => {
        events.push(`delete:${id}`);
      },
    });

    const first = draft("a");
    const a = writer.save(first);
    first.body = "Changed";
    const b = writer.save(first);
    const c = writer.save(draft("b"));
    const d = writer.remove("a");

    release();
    await Promise.all([a, b, c, d]);

    expect(events).toEqual(["a:Body", "a:Changed", "b:Body", "delete:a"]);
  });

  it("allows retries after a failed write", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Quota"))
      .mockResolvedValueOnce(undefined);
    const writer = new DraftWriter({ save, remove: vi.fn() });

    await expect(writer.save(draft("a"))).rejects.toThrow("Quota");
    await expect(writer.save(draft("a"))).resolves.toBeUndefined();
  });
});
