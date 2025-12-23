import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { VocabMark } from '../lib/vocab-mark';
import { useVocabSelection } from '../hooks/useVocabSelection';
import { VocabTooltip } from './VocabTooltip';
import type { WordData } from '../hooks/useDictionaryLookup';
import type { DrizzleDb } from '../lib/drizzle';
import { words } from '../lib/schema';
import { eq } from 'drizzle-orm';

interface ArticleEditorProps {
  content: JSONContent | null;
  onContentChange: (content: JSONContent) => void;
  db: DrizzleDb | null;
  documentId: number | null;
  onWordSelect: (wordId: number) => void;
  lookupWord: (wordId: number) => Promise<WordData | null>;
}

export function ArticleEditor({
  content,
  onContentChange,
  db,
  documentId,
  onWordSelect,
  lookupWord,
}: ArticleEditorProps) {
  const [hoveredWordId, setHoveredWordId] = useState<number | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [hoveredWordData, setHoveredWordData] = useState<WordData | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      VocabMark,
    ],
    content: content || undefined,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    },
  });

  const { selection, clearSelection } = useVocabSelection(editor);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed && content && !editor.isFocused) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Handle hover on vocab words
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wordElement = target.closest('[data-vocab-word-id]') as HTMLElement | null;

      if (wordElement) {
        const wordId = parseInt(wordElement.getAttribute('data-vocab-word-id') || '0', 10);
        if (wordId && wordId !== hoveredWordId) {
          if (hoverTimeout) clearTimeout(hoverTimeout);
          
          const timeout = setTimeout(async () => {
            setHoveredWordId(wordId);
            setHoveredElement(wordElement);
            const data = await lookupWord(wordId);
            setHoveredWordData(data);
          }, 150);
          
          setHoverTimeout(timeout);
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      
      // Check if we're leaving a vocab word
      if (target.closest('[data-vocab-word-id]')) {
        // Check if we're entering another vocab word or the tooltip
        if (
          relatedTarget?.closest('[data-vocab-word-id]') ||
          relatedTarget?.closest('.z-50')
        ) {
          return;
        }

        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          setHoverTimeout(null);
        }

        const leaveTimeout = setTimeout(() => {
          setHoveredWordId(null);
          setHoveredElement(null);
          setHoveredWordData(null);
        }, 50);
        setHoverTimeout(leaveTimeout);
      }
    };

    editorElement.addEventListener('mouseover', handleMouseOver);
    editorElement.addEventListener('mouseout', handleMouseOut);

    return () => {
      editorElement.removeEventListener('mouseover', handleMouseOver);
      editorElement.removeEventListener('mouseout', handleMouseOut);
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [editor, hoveredWordId, hoverTimeout, lookupWord]);

  const handleMarkAsVocab = useCallback(async () => {
    if (!editor || !selection || !db || !documentId) return;

    try {
      // Create word record
      const now = Date.now();
      await db.insert(words).values({
        headword: selection.text,
        headwordNorm: selection.normalized,
        documentId,
        createdAt: new Date(now),
      });

      // Get the inserted word ID
      const insertedWords = await db
        .select()
        .from(words)
        .where(eq(words.headwordNorm, selection.normalized))
        .orderBy(words.id)
        .limit(1);

      if (insertedWords.length > 0) {
        const wordId = insertedWords[insertedWords.length - 1].id;
        
        // Apply the mark
        editor
          .chain()
          .focus()
          .setTextSelection({ from: selection.from, to: selection.to })
          .setVocabMark(wordId)
          .run();

        clearSelection();
        onContentChange(editor.getJSON());
      }
    } catch (error) {
      console.error('Error creating vocab word:', error);
    }
  }, [editor, selection, db, documentId, clearSelection, onContentChange]);

  const handleCloseTooltip = useCallback(() => {
    setHoveredWordId(null);
    setHoveredElement(null);
    setHoveredWordData(null);
  }, []);

  const handleInspect = useCallback(() => {
    if (hoveredWordId) {
      onWordSelect(hoveredWordId);
      handleCloseTooltip();
    }
  }, [hoveredWordId, onWordSelect, handleCloseTooltip]);

  return (
    <div className="relative">
      {/* Selection action bar */}
      {selection && (
        <div className="mb-4 p-3 bg-accent-gold/10 rounded-lg border border-accent-gold/30 
          flex items-center justify-between">
          <span className="text-sm font-sans">
            Mark "<strong>{selection.text}</strong>" as vocabulary word?
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-sm rounded-md bg-ink-100 dark:bg-ink-700 
                hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkAsVocab}
              className="px-3 py-1.5 text-sm rounded-md bg-accent-gold text-white 
                hover:bg-accent-gold/90 transition-colors font-medium"
            >
              Add Word
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="prose prose-lg max-w-none dark:prose-invert
        prose-headings:font-sans prose-p:font-serif prose-p:text-ink-700 dark:prose-p:text-ink-100">
        <EditorContent editor={editor} />
      </div>

      {/* Vocab Tooltip */}
      <VocabTooltip
        wordData={hoveredWordData}
        referenceElement={hoveredElement}
        onClose={handleCloseTooltip}
        onInspect={handleInspect}
      />
    </div>
  );
}
