import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useDb } from '../hooks/useDb';
import { downloadDatabase, triggerFileInput, uploadDatabase } from '../lib/db-io';

export function SettingsPage() {
  const { isLoading, error, reinitialize } = useDb();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    await downloadDatabase();
  };

  const handleImport = () => {
    triggerFileInput(async (file) => {
      setIsImporting(true);
      setImportStatus('idle');
      const success = await uploadDatabase(file);
      setIsImporting(false);
      if (success) {
        setImportStatus('success');
        await reinitialize();
      } else {
        setImportStatus('error');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-sans text-ink-500 dark:text-ink-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-sans font-semibold mb-2 text-ink-800 dark:text-ink-100">
            Database Error
          </h2>
          <p className="text-ink-500 dark:text-ink-200 mb-4">{error.message}</p>
          <button
            onClick={reinitialize}
            className="px-4 py-2 rounded-lg bg-accent-emerald text-white hover:bg-accent-emerald/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-700 dark:bg-ink-900">
      <header className="bg-paper-600 dark:bg-ink-800 border-b border-ink-200 dark:border-ink-700 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
          >
            <svg className="w-5 h-5 text-ink-600 dark:text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-sans font-semibold text-ink-800 dark:text-ink-50">
            Settings
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-paper-500 dark:bg-ink-800 rounded-xl shadow-lg p-6 space-y-8">
          {/* Storage Status */}
          <section>
            <h2 className="text-lg font-sans font-semibold text-ink-800 dark:text-ink-100 mb-3">
              Storage
            </h2>
            <div className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
              <span className="w-2 h-2 rounded-full bg-accent-emerald"></span>
              <span className="font-sans text-sm">Stored locally in your browser</span>
            </div>
          </section>

          {/* Export */}
          <section>
            <h2 className="text-lg font-sans font-semibold text-ink-800 dark:text-ink-100 mb-3">
              Export Data
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
              Download your entire database as a SQLite file. You can import this file later to restore your data.
            </p>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg font-sans text-sm font-medium transition-all
                bg-accent-gold/10 hover:bg-accent-gold/20 cursor-pointer
                text-accent-gold"
            >
              Export Database
            </button>
          </section>

          {/* Import */}
          <section>
            <h2 className="text-lg font-sans font-semibold text-ink-800 dark:text-ink-100 mb-3">
              Import Data
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
              Import a previously exported database file. This will replace all current data.
            </p>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 rounded-lg font-sans text-sm font-medium transition-all
                bg-accent-rust/10 hover:bg-accent-rust/20 cursor-pointer
                text-accent-rust disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Database'}
            </button>
            {importStatus === 'success' && (
              <p className="mt-2 text-sm text-accent-emerald">Database imported successfully!</p>
            )}
            {importStatus === 'error' && (
              <p className="mt-2 text-sm text-accent-rust">Failed to import database. Please check the file format.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

