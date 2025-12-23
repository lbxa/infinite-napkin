import { useState, useEffect } from 'react';
import type { WordData } from '../hooks/useDictionaryLookup';

interface WordInspectorProps {
  wordData: WordData | null;
  onClose: () => void;
  onSave: (updates: {
    customDefinition?: string | null;
    customPhonetic?: string | null;
    notes?: string | null;
  }) => void;
  onRemoveWord: () => void;
}

export function WordInspector({
  wordData,
  onClose,
  onSave,
  onRemoveWord,
}: WordInspectorProps) {
  const [customDefinition, setCustomDefinition] = useState('');
  const [customPhonetic, setCustomPhonetic] = useState('');
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (wordData) {
      setCustomDefinition(wordData.customDefinition || '');
      setCustomPhonetic(wordData.customPhonetic || '');
      setNotes(wordData.notes || '');
      setHasChanges(false);
    }
  }, [wordData]);

  const handleSave = () => {
    onSave({
      customDefinition: customDefinition || null,
      customPhonetic: customPhonetic || null,
      notes: notes || null,
    });
    setHasChanges(false);
  };

  const handleChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    setHasChanges(true);
  };

  if (!wordData) {
    return (
      <aside className="w-80 bg-paper-600 dark:bg-ink-800 border-l border-ink-200 dark:border-ink-700 p-6">
        <div className="text-center text-ink-400 dark:text-ink-300 py-12">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="font-sans text-sm">
            Hover over a highlighted word to see its details, or click "Edit Details" to open it here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-paper-600 dark:bg-ink-800 border-l border-ink-200 dark:border-ink-700 flex flex-col">
      <div className="p-4 border-b border-ink-200 dark:border-ink-700 flex items-center justify-between">
        <h2 className="font-sans font-semibold text-lg">Word Details</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
          aria-label="Close inspector"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Word Header */}
        <div>
          <h3 className="text-2xl font-semibold font-serif">{wordData.headword}</h3>
          {wordData.phonetic && (
            <p className="text-ink-500 dark:text-ink-200 font-mono text-sm mt-1">
              {wordData.phonetic}
            </p>
          )}
          {wordData.partOfSpeech && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full 
              bg-accent-gold/20 text-accent-gold">
              {wordData.partOfSpeech}
            </span>
          )}
        </div>

        {/* API Definition */}
        {wordData.definition && (
          <div>
            <label className="block text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">
              Dictionary Definition
            </label>
            <p className="text-sm text-ink-600 dark:text-ink-100 bg-ink-100/50 dark:bg-ink-700/50 
              rounded-lg p-3">
              {wordData.definition}
            </p>
          </div>
        )}

        {/* Custom Definition */}
        <div>
          <label className="block text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">
            Your Definition
          </label>
          <textarea
            value={customDefinition}
            onChange={(e) => handleChange(setCustomDefinition, e.target.value)}
            placeholder="Add your own definition..."
            className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
              bg-paper-500 dark:bg-ink-700 dark:text-ink-50 resize-none focus:outline-none focus:ring-2 
              focus:ring-accent-gold/50"
          />
        </div>

        {/* Custom Phonetic */}
        <div>
          <label className="block text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">
            Custom Pronunciation
          </label>
          <input
            type="text"
            value={customPhonetic}
            onChange={(e) => handleChange(setCustomPhonetic, e.target.value)}
            placeholder="e.g., /ˈek·səm·pəl/"
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-ink-200 dark:border-ink-600
              bg-paper-500 dark:bg-ink-700 dark:text-ink-50 focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => handleChange(setNotes, e.target.value)}
            placeholder="Add memory aids, examples, context..."
            className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
              bg-paper-500 dark:bg-ink-700 dark:text-ink-50 resize-none focus:outline-none focus:ring-2 
              focus:ring-accent-gold/50"
          />
        </div>

        {/* Synonyms */}
        {wordData.synonyms.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">
              Synonyms
            </label>
            <div className="flex flex-wrap gap-1">
              {wordData.synonyms.map((syn) => (
                <span
                  key={syn}
                  className="px-2 py-1 text-xs rounded-full bg-ink-100 dark:bg-ink-700 
                    text-ink-600 dark:text-ink-100"
                >
                  {syn}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-ink-200 dark:border-ink-700 space-y-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors
            bg-accent-emerald text-white hover:bg-accent-emerald/90
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasChanges ? 'Save Changes' : 'Saved'}
        </button>
        <button
          onClick={onRemoveWord}
          className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors
            bg-accent-rust/10 text-accent-rust hover:bg-accent-rust/20"
        >
          Remove Word
        </button>
      </div>
    </aside>
  );
}


