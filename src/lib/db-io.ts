import { exportDatabase, importDatabase, querySql } from './sqlite';

export async function downloadDatabase(): Promise<void> {
  const data = await exportDatabase();
  const blob = new Blob([new Uint8Array(data)], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'vocab-article.db';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function uploadDatabase(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    await importDatabase(data);

    // Validate the database has the expected schema (documents table exists)
    const tables = await querySql<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='documents'"
    );
    if (tables.length === 0) {
      throw new Error('Invalid database file: missing required tables');
    }

    return true;
  } catch (error) {
    console.error('Database import error:', error);
    return false;
  }
}

export function triggerFileInput(onFileSelected: (file: File) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.db,.sqlite,.sqlite3';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };
  input.click();
}
