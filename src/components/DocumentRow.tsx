import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { DocumentWithStats } from '../hooks/useDocuments';
import { formatRelativeTime } from '../lib/format';

interface DocumentRowProps {
  document: DocumentWithStats;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function DocumentRow({ document: doc, onRename, onDelete }: DocumentRowProps) {
  const navigate = useNavigate();
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

  const handleRowClick = () => {
    if (!isRenaming && !isMenuOpen) {
      navigate({ to: '/doc/$id', params: { id: String(doc.id) } });
    }
  };

  const handleRename = async () => {
    await onRename(doc.id, renameValue);
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    await onDelete(doc.id);
  };

  const wordCount = doc.stats?.wordCount ?? 0;
  const vocabCount = doc.stats?.vocabCount ?? 0;
  const updatedAt = doc.updatedAt ? formatRelativeTime(doc.updatedAt) : 'Never';

  return (
    <tr
      onClick={handleRowClick}
      className="border-b border-ink-100 dark:border-ink-700 last:border-b-0 hover:bg-ink-50 dark:hover:bg-ink-700/50 cursor-pointer transition-colors"
    >
      {/* Title */}
      <td className="px-4 py-3">
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
            onClick={(e) => e.stopPropagation()}
            className="font-sans font-medium text-ink-800 dark:text-ink-100 bg-transparent 
              border-b-2 border-accent-gold outline-none w-full"
          />
        ) : (
          <span className="font-sans font-medium text-ink-800 dark:text-ink-100">
            {doc.title}
          </span>
        )}
      </td>

      {/* Updated */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="font-mono text-sm text-ink-500 dark:text-ink-400">
          {updatedAt}
        </span>
      </td>

      {/* Words */}
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <span className="font-mono text-sm text-ink-500 dark:text-ink-400">
          {wordCount}
        </span>
      </td>

      {/* Vocab */}
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <span className={`font-mono text-sm ${vocabCount > 0 ? 'text-accent-gold' : 'text-ink-400 dark:text-ink-500'}`}>
          {vocabCount}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div ref={menuRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-600 transition-colors"
          >
            <svg className="w-4 h-4 text-ink-500 dark:text-ink-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-paper-500 dark:bg-ink-700 rounded-lg shadow-lg border border-ink-200 dark:border-ink-600 py-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setIsRenaming(true);
                }}
                className="w-full px-3 py-2 text-left text-sm font-sans text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-600"
              >
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="w-full px-3 py-2 text-left text-sm font-sans text-accent-rust hover:bg-accent-rust/10"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
