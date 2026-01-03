import { useEffect } from 'react';
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

      {/* Vocab Tooltip - now manages its own hover state */}
      <VocabTooltip
        editorElement={editor?.view.dom ?? null}
        lookupWord={lookupWord}
        updateOverrides={updateOverrides}
        onRemoveWord={onRemoveWord}
      />
    </div>
  );
}
