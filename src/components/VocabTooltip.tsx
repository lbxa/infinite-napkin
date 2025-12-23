import { useEffect, useRef, useLayoutEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
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
  onInspect: () => void;
}

export function VocabTooltip({
  wordData,
  referenceElement,
  onClose,
  onInspect,
}: VocabTooltipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Derive open state from props
  const isOpen = Boolean(referenceElement && wordData);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
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

  const playAudio = () => {
    if (wordData?.audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  if (!isOpen || !wordData) return null;

  const displayDefinition =
    wordData.customDefinition || wordData.definition || 'No definition available';
  const displayPhonetic = wordData.customPhonetic || wordData.phonetic;

  return (
    <FloatingPortal>
      <div
        ref={(el) => refs.setFloating(el)}
        style={floatingStyles}
        {...getFloatingProps()}
        className="z-50 max-w-sm bg-paper-500 dark:bg-ink-800 rounded-xl shadow-xl 
          border border-ink-200 dark:border-ink-700 p-4 font-sans"
      >
        {wordData.isLoading ? (
          <div className="flex items-center gap-2 text-ink-400">
            <div className="w-4 h-4 border-2 border-ink-300 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                  {wordData.headword}
                </h3>
                {displayPhonetic && (
                  <span className="text-sm text-ink-500 dark:text-ink-200 font-mono">
                    {displayPhonetic}
                  </span>
                )}
              </div>
              {wordData.audioUrl && (
                <button
                  onClick={playAudio}
                  className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors"
                  aria-label="Play pronunciation"
                >
                  <svg
                    className="w-5 h-5 text-accent-emerald"
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

            {wordData.partOfSpeech && (
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full 
                bg-accent-gold/20 text-accent-gold mb-2">
                {wordData.partOfSpeech}
              </span>
            )}

            <p className="text-sm text-ink-700 dark:text-ink-100 mb-3">
              {displayDefinition}
            </p>

            {wordData.synonyms.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-medium text-ink-400 uppercase tracking-wide">
                  Synonyms
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
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

            {wordData.notes && (
              <div className="mb-3 p-2 rounded-lg bg-accent-gold/10 border-l-2 border-accent-gold">
                <span className="text-xs font-medium text-accent-gold">Your Notes</span>
                <p className="text-sm text-ink-700 dark:text-ink-100 mt-1">
                  {wordData.notes}
                </p>
              </div>
            )}

            <button
              onClick={onInspect}
              className="w-full py-2 text-sm font-medium rounded-lg transition-colors
                bg-ink-100 dark:bg-ink-700 hover:bg-ink-200 dark:hover:bg-ink-600
                text-ink-600 dark:text-ink-100"
            >
              Edit Details →
            </button>

            {wordData.audioUrl && (
              <audio ref={audioRef} src={wordData.audioUrl} preload="none" />
            )}
          </>
        )}
      </div>
    </FloatingPortal>
  );
}
