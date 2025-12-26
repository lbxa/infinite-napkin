import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { VocabMark } from '../lib/vocab-mark';
import { VocabTooltip } from './VocabTooltip';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import type { WordData } from '../hooks/useDictionaryLookup';
import type { DrizzleDb } from '../lib/drizzle';

interface ArticleEditorProps {
  content: JSONContent | null;
  onContentChange: (content: JSONContent) => void;
  db: DrizzleDb | null;
  documentId: number | null;
  lookupWord: (wordId: number) => Promise<WordData | null>;
  updateOverrides: (
    wordId: number,
    updates: {
      customDefinition?: string | null;
      customPhonetic?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onRemoveWord: (wordId: number) => void;
}

export function ArticleEditor({
  content,
  onContentChange,
  db,
  documentId,
  lookupWord,
  updateOverrides,
  onRemoveWord,
}: ArticleEditorProps) {
  const [hoveredWordId, setHoveredWordId] = useState<number | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [hoveredWordData, setHoveredWordData] = useState<WordData | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      VocabMark,
    ],
    content: content || undefined,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    },
  });

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

  const handleCloseTooltip = useCallback(() => {
    setHoveredWordId(null);
    setHoveredElement(null);
    setHoveredWordData(null);
  }, []);

  const handleWordDataRefresh = useCallback(async (wordId: number) => {
    // Refresh the word data after save
    const data = await lookupWord(wordId);
    if (data && wordId === hoveredWordId) {
      setHoveredWordData(data);
    }
  }, [lookupWord, hoveredWordId]);

  const handleRemoveWord = useCallback((wordId: number) => {
    handleCloseTooltip();
    onRemoveWord(wordId);
  }, [handleCloseTooltip, onRemoveWord]);

  return (
    <div className="relative">
      {/* Bubble Menu Toolbar */}
      {editor && (
        <EditorBubbleMenu
          editor={editor}
          db={db}
          documentId={documentId}
          onContentChange={onContentChange}
        />
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
        updateOverrides={updateOverrides}
        onRemoveWord={handleRemoveWord}
        onWordDataRefresh={handleWordDataRefresh}
      />
    </div>
  );
}
