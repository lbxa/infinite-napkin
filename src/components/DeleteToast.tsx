import { useEffect, useState } from 'react';

interface DeleteToastProps {
  title: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function DeleteToast({ title, onUndo, onDismiss, duration = 6000 }: DeleteToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-ink-800 dark:bg-ink-700 text-white rounded-lg shadow-xl overflow-hidden min-w-[300px]">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <p className="font-sans text-sm">
            <span className="text-ink-300">Deleted</span>{' '}
            <span className="font-medium truncate max-w-[150px] inline-block align-bottom">
              {title}
            </span>
          </p>
          <button
            onClick={onUndo}
            className="font-sans text-sm font-medium text-accent-gold hover:text-accent-gold/80 transition-colors"
          >
            Undo
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-ink-700 dark:bg-ink-600">
          <div
            className="h-full bg-accent-gold transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

