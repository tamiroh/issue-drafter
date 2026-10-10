export interface IssueDraft {
  id: string;
  repository: string;
  template: string | null;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('issue-drafter', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('drafts', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error('Close other issue-drafter tabs and reload.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    }).catch((error: unknown) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode);
    const request = operation(tx.objectStore('drafts'));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () =>
      reject(tx.error ?? new Error('Storage transaction was aborted.'));
    tx.onerror = () => reject(tx.error ?? request.error);
  });
}
export const draftStorage = {
  list: (): Promise<IssueDraft[]> =>
    transaction('readonly', (store) => store.getAll()),
  save: async (draft: IssueDraft): Promise<void> => {
    await transaction('readwrite', (store) => store.put(draft));
  },
  remove: async (id: string): Promise<void> => {
    await transaction('readwrite', (store) => store.delete(id));
  },
};

// Serialize snapshots so slow writes cannot overwrite newer edits or resurrect deleted drafts.
export class DraftWriter {
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private storage: Pick<
      typeof draftStorage,
      'save' | 'remove'
    > = draftStorage,
  ) {}
  private enqueue(action: () => Promise<void>): Promise<void> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }
  save(draft: IssueDraft): Promise<void> {
    const snapshot = { ...draft };
    return this.enqueue(() => this.storage.save(snapshot));
  }
  remove(id: string): Promise<void> {
    return this.enqueue(() => this.storage.remove(id));
  }
}
