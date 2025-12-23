import sqlite3InitModule, { type Sqlite3Static, type Database, type BindingSpec } from '@sqlite.org/sqlite-wasm';

const DB_NAME = 'vocab-article.db';

let sqlite3: Sqlite3Static | null = null;
let db: Database | null = null;

type WorkerRequest =
  | { type: 'init'; id: number }
  | { type: 'exec'; id: number; sql: string; params: unknown[] }
  | { type: 'query'; id: number; sql: string; params: unknown[] }
  | { type: 'export'; id: number }
  | { type: 'import'; id: number; data: Uint8Array }
  | { type: 'close'; id: number };

type WorkerResponse =
  | { type: 'init'; id: number; success: true; vfs: string }
  | { type: 'exec'; id: number; success: true }
  | { type: 'query'; id: number; success: true; results: unknown[] }
  | { type: 'export'; id: number; success: true; data: Uint8Array }
  | { type: 'import'; id: number; success: true }
  | { type: 'close'; id: number; success: true }
  | { type: string; id: number; success: false; error: string };

async function initDatabase(): Promise<string> {
  if (db) return 'already-initialized';

  sqlite3 = await sqlite3InitModule({
    print: console.log,
    printErr: console.error,
  });

  let vfsType = 'memory';

  // Try to use OPFS SAH Pool VFS for persistent storage (requires worker context)
  try {
    if (sqlite3.installOpfsSAHPoolVfs) {
      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
        name: 'opfs-sahpool',
        initialCapacity: 6,
      });
      db = new poolUtil.OpfsSAHPoolDb(`/${DB_NAME}`);
      vfsType = 'opfs-sahpool';
      console.log('SQLite worker: initialized with OPFS SAH Pool VFS');
    } else {
      throw new Error('OPFS SAH Pool not available');
    }
  } catch (e) {
    console.warn('SQLite worker: OPFS not available, using in-memory database:', e);
    db = new sqlite3.oo1.DB(':memory:');
  }

  return vfsType;
}

function execSql(sql: string, params: unknown[]): void {
  if (!db) throw new Error('Database not initialized');
  db.exec({ sql, bind: params as BindingSpec });
}

function querySql<T = Record<string, unknown>>(sql: string, params: unknown[]): T[] {
  if (!db) throw new Error('Database not initialized');
  const results: T[] = [];

  db.exec({
    sql,
    bind: params as BindingSpec,
    rowMode: 'object',
    callback: (row) => {
      results.push(row as T);
    },
  });

  return results;
}

function exportDatabase(): Uint8Array {
  if (!db || !sqlite3) throw new Error('Database not initialized');
  return sqlite3.capi.sqlite3_js_db_export(db);
}

async function importDatabase(data: Uint8Array): Promise<void> {
  if (!sqlite3) throw new Error('SQLite not initialized');

  // Close existing database
  if (db) {
    db.close();
    db = null;
  }

  // Try to use OPFS SAH Pool VFS with deserialization
  try {
    if (sqlite3.installOpfsSAHPoolVfs) {
      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
        name: 'opfs-sahpool',
        initialCapacity: 6,
      });
      
      // Create a new database and deserialize into it
      db = new poolUtil.OpfsSAHPoolDb(`/${DB_NAME}`);
      
      // The OPFS SAH Pool doesn't support direct deserialization,
      // so we use a temporary in-memory DB to load the serialized data
      const tempDb = new sqlite3.oo1.DB({ filename: ':memory:' });
      
      // Allocate WASM memory and copy the data for deserialization
      const pData = sqlite3.wasm.allocFromTypedArray(data);
      const rc = sqlite3.capi.sqlite3_deserialize(
        tempDb.pointer!,
        'main',
        pData,
        data.byteLength,
        data.byteLength,
        sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
      );
      
      if (rc !== 0) {
        tempDb.close();
        throw new Error(`Deserialize failed with code ${rc}`);
      }
      
      // Get schema and data from temp DB and apply to OPFS DB
      const tables = tempDb.exec({
        sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        rowMode: 'array',
        returnValue: 'resultRows',
      }) as unknown[][];
      
      for (const [sqlStatement] of tables) {
        if (sqlStatement) {
          db.exec({ sql: sqlStatement as string });
        }
      }
      
      // Copy data for each table
      const tableNames = tempDb.exec({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        rowMode: 'array',
        returnValue: 'resultRows',
      }) as string[][];
      
      for (const [tableName] of tableNames) {
        const rows = tempDb.exec({
          sql: `SELECT * FROM "${tableName}"`,
          rowMode: 'object',
          returnValue: 'resultRows',
        }) as Record<string, unknown>[];
        
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          const colNames = cols.map(c => `"${c}"`).join(', ');
          db.exec({
            sql: `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`,
            bind: cols.map(c => row[c]) as BindingSpec,
          });
        }
      }
      
      tempDb.close();
      console.log('SQLite worker: database imported to OPFS');
    } else {
      throw new Error('OPFS not available');
    }
  } catch (e) {
    console.warn('SQLite worker: falling back to in-memory import:', e);
    
    // Fallback: use in-memory database with deserialization
    db = new sqlite3.oo1.DB({ filename: ':memory:' });
    const pData = sqlite3.wasm.allocFromTypedArray(data);
    const rc = sqlite3.capi.sqlite3_deserialize(
      db.pointer!,
      'main',
      pData,
      data.byteLength,
      data.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
    );
    
    if (rc !== 0) {
      throw new Error(`Deserialize failed with code ${rc}`);
    }
  }
}

function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, id } = event.data;

  try {
    switch (type) {
      case 'init': {
        const vfs = await initDatabase();
        self.postMessage({ type: 'init', id, success: true, vfs } as WorkerResponse);
        break;
      }
      case 'exec': {
        execSql(event.data.sql, event.data.params);
        self.postMessage({ type: 'exec', id, success: true } as WorkerResponse);
        break;
      }
      case 'query': {
        const results = querySql(event.data.sql, event.data.params);
        self.postMessage({ type: 'query', id, success: true, results } as WorkerResponse);
        break;
      }
      case 'export': {
        const data = exportDatabase();
        self.postMessage({ type: 'export', id, success: true, data } as WorkerResponse);
        break;
      }
      case 'import': {
        await importDatabase(event.data.data);
        self.postMessage({ type: 'import', id, success: true } as WorkerResponse);
        break;
      }
      case 'close': {
        closeDatabase();
        self.postMessage({ type: 'close', id, success: true } as WorkerResponse);
        break;
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    self.postMessage({ type, id, success: false, error } as WorkerResponse);
  }
};

