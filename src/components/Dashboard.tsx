import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useDb } from '../hooks/useDb';
import { useDocuments, type SortMode, type DeletedDocument } from '../hooks/useDocuments';
import { DocumentCard } from './DocumentCard';
import { DocumentRow } from './DocumentRow';
import { DeleteToast } from './DeleteToast';

type ViewMode = 'grid' | 'list';

export function Dashboard() {
  const { db, isLoading: dbLoading, error: dbError, reinitialize } = useDb();
  const navigate = useNavigate();
  const {
    documents,
    isLoading: docsLoading,
    sortMode,
    setSortMode,
    createDocument,
    renameDocument,
    deleteDocument,
    restoreDocument,
  } = useDocuments(db);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deletedDoc, setDeletedDoc] = useState<DeletedDocument | null>(null);

  const handleCreateDocument = async () => {
    const id = await createDocument();
    if (id) {
      navigate({ to: '/doc/$id', params: { id: String(id) } });
    }
  };

  const handleDelete = async (id: number) => {
    const deleted = await deleteDocument(id);
    if (deleted) {
      setDeletedDoc(deleted);
    }
  };

  const handleUndo = async () => {
    if (deletedDoc) {
      await restoreDocument(deletedDoc);
      setDeletedDoc(null);
    }
  };

  const handleToastDismiss = () => {
    setDeletedDoc(null);
  };

  // Show loading state
  if (dbLoading || docsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-sans text-ink-500 dark:text-ink-200">Loading napkins...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center max-w-md px-4">
          <div className="w-12 h-12 rounded-full bg-accent-rust/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent-rust" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-sans font-semibold mb-2 text-ink-800 dark:text-ink-100">
            Database Error
          </h2>
          <p className="text-ink-500 dark:text-ink-200 mb-4">{dbError.message}</p>
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-paper-600 dark:bg-ink-800 border-b border-ink-200 dark:border-ink-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <h1 className="text-xl font-sans font-bold text-ink-800 dark:text-ink-50">
            Infinite Napkin
          </h1>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 rounded-lg font-sans text-sm bg-paper-500 dark:bg-ink-700 
                border border-ink-200 dark:border-ink-600 text-ink-700 dark:text-ink-200
                focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
            >
              <option value="updated">Most Recent</option>
              <option value="title">Title A–Z</option>
              <option value="vocab">Most Vocab</option>
              <option value="words">Most Words</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center rounded-lg bg-paper-500 dark:bg-ink-700 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-accent-gold/20 text-accent-gold'
                    : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200'
                }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-accent-gold/20 text-accent-gold'
                    : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200'
                }`}
                title="List view"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="w-px h-6 bg-ink-200 dark:bg-ink-700" />

            {/* New Napkin Button */}
            <button
              onClick={handleCreateDocument}
              className="px-4 py-2 rounded-lg font-sans text-sm font-medium transition-all
                bg-accent-gold text-white hover:bg-accent-gold/90 cursor-pointer
                shadow-sm hover:shadow"
            >
              New Napkin
            </button>

            {/* Settings */}
            <Link
              to="/settings"
              className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5 text-ink-500 dark:text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-8">
        {documents.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-gold/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-sans font-semibold text-ink-800 dark:text-ink-100 mb-2">
              Your first napkin starts here
            </h2>
            <p className="text-ink-500 dark:text-ink-400 mb-6 max-w-sm">
              Everything is stored locally in your browser. Export anytime.
            </p>
            <button
              onClick={handleCreateDocument}
              className="px-6 py-3 rounded-lg font-sans font-medium transition-all
                bg-accent-gold text-white hover:bg-accent-gold/90 cursor-pointer
                shadow-md hover:shadow-lg"
            >
              Create Napkin
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onRename={renameDocument}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-paper-500 dark:bg-ink-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="text-left px-4 py-3 font-sans text-sm font-medium text-ink-500 dark:text-ink-400">Title</th>
                  <th className="text-left px-4 py-3 font-sans text-sm font-medium text-ink-500 dark:text-ink-400 hidden sm:table-cell">Updated</th>
                  <th className="text-right px-4 py-3 font-sans text-sm font-medium text-ink-500 dark:text-ink-400 hidden md:table-cell">Words</th>
                  <th className="text-right px-4 py-3 font-sans text-sm font-medium text-ink-500 dark:text-ink-400 hidden md:table-cell">Vocab</th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onRename={renameDocument}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Delete Toast */}
      {deletedDoc && (
        <DeleteToast
          title={deletedDoc.document.title}
          onUndo={handleUndo}
          onDismiss={handleToastDismiss}
        />
      )}
    </div>
  );
}
