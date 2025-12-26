import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  size,
  autoUpdate,
  useDismiss,
  useHover,
  useInteractions,
  safePolygon,
  FloatingPortal,
} from '@floating-ui/react';
import type { WordData } from '../hooks/useDictionaryLookup';

interface VocabTooltipProps {
  wordData: WordData | null;
  referenceElement: HTMLElement | null;
  onClose: () => void;
  updateOverrides: (
    wordId: number,
    updates: {
      customDefinition?: string | null;
      customPhonetic?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onRemoveWord: (wordId: number) => void;
  onWordDataRefresh: (wordId: number) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export function VocabTooltip({
  wordData,
  referenceElement,
  onClose,
  updateOverrides,
  onRemoveWord,
  onWordDataRefresh,
}: VocabTooltipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // Local editing state
  const [customDefinition, setCustomDefinition] = useState('');
  const [customPhonetic, setCustomPhonetic] = useState('');
  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  // Track which wordId we're editing to detect changes
  const currentWordIdRef = useRef<number | null>(null);
  
  // Derive open state from props
  const isOpen = Boolean(referenceElement && wordData);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    handleClose: safePolygon({
      buffer: 1,
    }),
    delay: { open: 0, close: 150 },
  });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss]);

  // Sync reference element with Floating UI
  useLayoutEffect(() => {
    if (referenceElement) {
      refs.setReference(referenceElement);
    }
  }, [referenceElement, refs]);

  // Apply hover props to the reference element for safePolygon to work
  useEffect(() => {
    if (!referenceElement || !isOpen) return;
    
    const props = getReferenceProps();
    const onMouseLeave = props.onMouseLeave as ((e: MouseEvent) => void) | undefined;
    const onPointerMove = props.onPointerMove as ((e: PointerEvent) => void) | undefined;
    
    if (onMouseLeave) referenceElement.addEventListener('mouseleave', onMouseLeave);
    if (onPointerMove) referenceElement.addEventListener('pointermove', onPointerMove);
    
    return () => {
      if (onMouseLeave) referenceElement.removeEventListener('mouseleave', onMouseLeave);
      if (onPointerMove) referenceElement.removeEventListener('pointermove', onPointerMove);
    };
  }, [referenceElement, isOpen, getReferenceProps]);

  // Sync local state from wordData when word changes
  useEffect(() => {
    if (wordData && wordData.wordId !== currentWordIdRef.current) {
      currentWordIdRef.current = wordData.wordId;
      setCustomDefinition(wordData.customDefinition || '');
      setCustomPhonetic(wordData.customPhonetic || '');
      setNotes(wordData.notes || '');
      setNotesExpanded(Boolean(wordData.notes));
      setSaveStatus('idle');
    }
  }, [wordData]);

  // Debounced auto-save
  const saveChanges = useCallback(async (
    wordId: number,
    updates: {
      customDefinition?: string | null;
      customPhonetic?: string | null;
      notes?: string | null;
    }
  ) => {
    setSaveStatus('saving');
    try {
      await updateOverrides(wordId, updates);
      onWordDataRefresh(wordId);
      setSaveStatus('saved');
      // Reset to idle after showing "saved"
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch {
      setSaveStatus('idle');
    }
  }, [updateOverrides, onWordDataRefresh]);

  const handleFieldChange = useCallback((
    field: 'customDefinition' | 'customPhonetic' | 'notes',
    value: string
  ) => {
    if (!wordData) return;
    
    // Update local state
    if (field === 'customDefinition') setCustomDefinition(value);
    if (field === 'customPhonetic') setCustomPhonetic(value);
    if (field === 'notes') setNotes(value);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce save
    debounceRef.current = setTimeout(() => {
      const updates = {
        customDefinition: field === 'customDefinition' ? (value || null) : (customDefinition || null),
        customPhonetic: field === 'customPhonetic' ? (value || null) : (customPhonetic || null),
        notes: field === 'notes' ? (value || null) : (notes || null),
      };
      saveChanges(wordData.wordId, updates);
    }, 400);
  }, [wordData, customDefinition, customPhonetic, notes, saveChanges]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const playAudio = () => {
    if (wordData?.audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  const handleRemove = () => {
    if (wordData) {
      onRemoveWord(wordData.wordId);
    }
  };

  if (!isOpen || !wordData) return null;

  const displayPhonetic = customPhonetic || wordData.phonetic;

  return (
    <FloatingPortal>
      <div
        ref={(el) => refs.setFloating(el)}
        style={floatingStyles}
        {...getFloatingProps()}
        className="z-50 w-80 bg-paper-500 dark:bg-ink-800 rounded-xl shadow-xl 
          border border-ink-200 dark:border-ink-700 font-sans overflow-y-auto overflow-x-hidden"
      >
        {wordData.isLoading ? (
          <div className="flex items-center gap-2 text-ink-400 p-4">
            <div className="w-4 h-4 border-2 border-ink-300 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100 font-serif">
                    {wordData.headword}
                  </h3>
                  {displayPhonetic && (
                    <span className="text-sm text-ink-500 dark:text-ink-200 font-mono">
                      {displayPhonetic}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Save status indicator */}
                  <div className="w-5 h-5 flex items-center justify-center">
                    {saveStatus === 'saving' && (
                      <div className="w-2 h-2 bg-accent-gold rounded-full animate-pulse" />
                    )}
                    {saveStatus === 'saved' && (
                      <svg className="w-4 h-4 text-accent-emerald animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {wordData.audioUrl && (
                    <button
                      onClick={playAudio}
                      className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
                      aria-label="Play pronunciation"
                    >
                      <svg
                        className="w-4 h-4 text-accent-emerald"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5L10 5v14l-3.5-3.5H4a1 1 0 01-1-1v-5a1 1 0 011-1h2.5z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {wordData.partOfSpeech && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full 
                  bg-accent-gold/20 text-accent-gold">
                  {wordData.partOfSpeech}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-4">
              {/* Dictionary definition (read-only) */}
              {wordData.definition && (
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Dictionary</p>
                  <p className="text-sm text-ink-500 dark:text-ink-300 italic">
                    {wordData.definition}
                  </p>
                </div>
              )}
              
              {/* Custom definition (editable) */}
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Your definition</p>
                <textarea
                  value={customDefinition}
                  onChange={(e) => handleFieldChange('customDefinition', e.target.value)}
                  placeholder="Add your own definition..."
                  rows={2}
                  className="w-full text-sm text-ink-700 dark:text-ink-100 bg-transparent 
                    border-0 border-b border-transparent hover:border-ink-200 dark:hover:border-ink-600
                    focus:border-accent-gold focus:ring-0 focus:outline-none resize-none
                    placeholder:text-ink-300 dark:placeholder:text-ink-500 transition-colors p-0"
                />
              </div>

              {/* Custom pronunciation (editable) */}
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Pronunciation</p>
                <input
                  type="text"
                  value={customPhonetic}
                  onChange={(e) => handleFieldChange('customPhonetic', e.target.value)}
                  placeholder="/ˈek·səm·pəl/"
                  className="w-full text-sm font-mono text-ink-700 dark:text-ink-100 bg-transparent 
                    border-0 border-b border-transparent hover:border-ink-200 dark:hover:border-ink-600
                    focus:border-accent-gold focus:ring-0 focus:outline-none
                    placeholder:text-ink-300 dark:placeholder:text-ink-500 transition-colors p-0"
                />
              </div>

              {/* Notes (expandable) */}
              <div>
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 text-xs text-ink-400 uppercase tracking-wide mb-1 
                    hover:text-ink-600 dark:hover:text-ink-200 transition-colors"
                >
                  <svg 
                    className={`w-3 h-3 transition-transform ${notesExpanded ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Notes
                  {notes && !notesExpanded && (
                    <span className="ml-1 w-1.5 h-1.5 bg-accent-gold rounded-full" />
                  )}
                </button>
                {notesExpanded && (
                  <textarea
                    value={notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="Memory aids, examples, context..."
                    rows={3}
                    className="w-full text-sm text-ink-700 dark:text-ink-100 bg-ink-50/50 dark:bg-ink-700/50 
                      rounded-lg p-2 border border-transparent hover:border-ink-200 dark:hover:border-ink-600
                      focus:border-accent-gold focus:ring-0 focus:outline-none resize-none
                      placeholder:text-ink-300 dark:placeholder:text-ink-500 transition-colors"
                  />
                )}
              </div>

              {/* Synonyms */}
              {wordData.synonyms.length > 0 && (
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Synonyms</p>
                  <div className="flex flex-wrap gap-1">
                    {wordData.synonyms.slice(0, 6).map((syn) => (
                      <span
                        key={syn}
                        className="px-2 py-0.5 text-xs rounded-full bg-ink-100 dark:bg-ink-700 
                          text-ink-600 dark:text-ink-100"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with remove button */}
            <div className="px-4 py-3 border-t border-ink-100 dark:border-ink-700 flex justify-end">
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-ink-400 hover:text-accent-rust hover:bg-accent-rust/10 
                  transition-colors"
                aria-label="Remove word"
                title="Remove word"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {wordData.audioUrl && (
              <audio ref={audioRef} src={wordData.audioUrl} preload="none" />
            )}
          </>
        )}
      </div>
    </FloatingPortal>
  );
}
