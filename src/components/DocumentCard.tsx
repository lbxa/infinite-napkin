import { useState, useRef, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import type { DocumentWithStats } from '../hooks/useDocuments';
import { formatRelativeTime } from '../lib/format';

interface DocumentCardProps {
  document: DocumentWithStats;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function DocumentCard({ document: doc, onRename, onDelete }: DocumentCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRename = async () => {
    await onRename(doc.id, renameValue);
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    await onDelete(doc.id);
  };

  const snippet = doc.stats?.snippet || 'No content yet...';
  const wordCount = doc.stats?.wordCount ?? 0;
  const vocabCount = doc.stats?.vocabCount ?? 0;
  const updatedAt = doc.updatedAt ? formatRelativeTime(doc.updatedAt) : 'Never';

  return (
    <div className="group relative bg-paper-500 dark:bg-ink-800 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-ink-100 dark:border-ink-700">
      {/* Card Content - Clickable */}
      <Link
        to="/doc/$id"
        params={{ id: String(doc.id) }}
        className="block p-5"
      >
        {/* Title */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenameValue(doc.title);
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.preventDefault()}
            className="text-lg font-sans font-semibold text-ink-800 dark:text-ink-100 bg-transparent 
              border-b-2 border-accent-gold outline-none w-full mb-2"
          />
        ) : (
          <h3 className="text-lg font-sans font-semibold text-ink-800 dark:text-ink-100 line-clamp-2 mb-2">
            {doc.title}
          </h3>
        )}

        {/* Snippet */}
        <p className="text-sm font-serif text-ink-500 dark:text-ink-400 line-clamp-3 mb-4">
          {snippet}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs font-mono text-ink-400 dark:text-ink-500">
          <span>{updatedAt}</span>
          <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600" />
          <span>{wordCount} words</span>
          {vocabCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600" />
              <span className="text-accent-gold">{vocabCount} vocab</span>
            </>
          )}
        </div>
      </Link>

      {/* Actions Menu */}
      <div ref={menuRef} className="absolute top-3 right-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 
            hover:bg-ink-100 dark:hover:bg-ink-700 transition-all"
        >
          <svg className="w-4 h-4 text-ink-500 dark:text-ink-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-32 bg-paper-500 dark:bg-ink-700 rounded-lg shadow-lg border border-ink-200 dark:border-ink-600 py-1 z-10">
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsMenuOpen(false);
                setIsRenaming(true);
              }}
              className="w-full px-3 py-2 text-left text-sm font-sans text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-600"
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="w-full px-3 py-2 text-left text-sm font-sans text-accent-rust hover:bg-accent-rust/10"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
