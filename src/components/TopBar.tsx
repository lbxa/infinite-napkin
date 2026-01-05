import { useState } from 'react';
import { Link } from '@tanstack/react-router';

interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  showBackButton?: boolean;
}

export function TopBar({
  title,
  onTitleChange,
  showBackButton = false,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleTitleClick = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleTitleSubmit = () => {
    onTitleChange(editValue);
    setIsEditing(false);
  };

  return (
    <header className="bg-paper-600 dark:bg-ink-800 border-b border-ink-200 dark:border-ink-700 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        {showBackButton && (
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5 text-ink-600 dark:text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}

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
              {title || 'Untitled'}
            </h1>
          )}
        </div>
      </div>
    </header>
  );
}
