import SqliteWorker from './sqlite.worker?worker';

let worker: Worker | null = null;
let messageId = 0;
let initPromise: Promise<void> | null = null;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const pendingRequests = new Map<number, PendingRequest>();

function getNextId(): number {
  return ++messageId;
}

function postMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'));
      return;
    }

    const id = getNextId();
    pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });
    worker.postMessage({ ...message, id });
  });
}

function handleWorkerMessage(event: MessageEvent) {
  const { id, success, error, ...data } = event.data;
  const pending = pendingRequests.get(id);

  if (pending) {
    pendingRequests.delete(id);
    if (success) {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown worker error'));
    }
  }
}

export async function initSqlite(): Promise<void> {
  // Return existing promise to prevent race conditions during init
  if (initPromise) return initPromise;

  initPromise = (async () => {
    worker = new SqliteWorker();
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (e) => {
      console.error('SQLite worker error:', e);
    };

    const result = await postMessage<{ vfs: string }>({ type: 'init' });
    console.log(`SQLite initialized with VFS: ${result.vfs}`);
  })();

  return initPromise;
}

export async function execSql(sql: string, params: unknown[] = []): Promise<void> {
  if (!worker) {
    throw new Error('Database not initialized. Call initSqlite() first.');
  }
  await postMessage({ type: 'exec', sql, params });
}

export async function querySql<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!worker) {
    throw new Error('Database not initialized. Call initSqlite() first.');
  }
  const { results } = await postMessage<{ results: T[] }>({ type: 'query', sql, params });
  return results;
}

export async function queryOneSql<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const results = await querySql<T>(sql, params);
  return results[0];
}

export async function exportDatabase(): Promise<Uint8Array> {
  if (!worker) {
    throw new Error('Database not initialized. Call initSqlite() first.');
  }
  const { data } = await postMessage<{ data: Uint8Array }>({ type: 'export' });
  return data;
}

export async function importDatabase(data: Uint8Array): Promise<void> {
  if (!worker) {
    throw new Error('Database not initialized. Call initSqlite() first.');
  }
  await postMessage({ type: 'import', data });
}

export function closeDatabase(): void {
  if (worker) {
    worker.postMessage({ type: 'close', id: getNextId() });
    worker.terminate();
    worker = null;
  }
  initPromise = null;
}
