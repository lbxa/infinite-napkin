import { useState } from 'react';
import { downloadDatabase, triggerFileInput, uploadDatabase } from '../lib/db-io';

interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onDbReload: () => void;
}

export function TopBar({
  title,
  onTitleChange,
  onDbReload,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isImporting, setIsImporting] = useState(false);

  const handleTitleClick = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleTitleSubmit = () => {
    onTitleChange(editValue);
    setIsEditing(false);
  };

  const handleExport = async () => {
    await downloadDatabase();
  };

  const handleImport = () => {
    triggerFileInput(async (file) => {
      setIsImporting(true);
      const success = await uploadDatabase(file);
      setIsImporting(false);
      if (success) {
        onDbReload();
      } else {
        alert('Failed to import database. Please check the file format.');
      }
    });
  };

  return (
    <header className="bg-paper-600 dark:bg-ink-800 border-b border-ink-200 dark:border-ink-700 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="text-2xl font-sans font-semibold bg-transparent border-b-2 border-accent-gold outline-none w-full max-w-md text-ink-800 dark:text-ink-50"
              autoFocus
            />
          ) : (
            <h1
              onClick={handleTitleClick}
              className="text-2xl font-sans font-semibold text-ink-800 dark:text-ink-50 cursor-text hover:text-accent-gold transition-colors"
            >
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-px h-6 bg-ink-200 dark:bg-ink-700" />

          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg font-sans text-sm font-medium transition-all
              bg-accent-gold/10 hover:bg-accent-gold/20 cursor-pointer
              text-accent-gold"
          >
            Export
          </button>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-3 py-2 rounded-lg font-sans text-sm font-medium transition-all
              bg-accent-rust/10 hover:bg-accent-rust/20 cursor-pointer
              text-accent-rust disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </header>
  );
}


