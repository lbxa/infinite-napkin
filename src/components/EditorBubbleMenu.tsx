import { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
import type { DrizzleDb } from '../lib/drizzle';
import { words } from '../lib/schema';
import { eq } from 'drizzle-orm';

interface EditorBubbleMenuProps {
  editor: Editor;
  db: DrizzleDb | null;
  documentId: number | null;
  onContentChange: (content: JSONContent) => void;
}

// Validation function for vocab words - must be single word on word boundaries
function validateVocabWord(text: string): { text: string; normalized: string } | null {
  const trimmed = text.trim();
  
  // Check length bounds
  if (trimmed.length === 0 || trimmed.length > 40) {
    return null;
  }

  // Must be single word (no whitespace)
  if (/\s/.test(trimmed)) {
    return null;
  }

  // Normalize: lowercase, strip leading/trailing punctuation
  const normalized = trimmed
    .toLowerCase()
    .replace(/^[^\w]+/, '')
    .replace(/[^\w]+$/, '');

  if (normalized.length === 0) {
    return null;
  }

  return { text: trimmed, normalized };
}

export function EditorBubbleMenu({ 
  editor, 
  db, 
  documentId, 
  onContentChange 
}: EditorBubbleMenuProps) {
  
  // Use useEditorState to reactively track selection changes
  const vocabSelection = useEditorState({
    editor,
    selector: (ctx) => {
      const { editor: e } = ctx;
      if (!e || e.state.selection.empty) {
        return null;
      }
      
      const { from, to } = e.state.selection;
      const text = e.state.doc.textBetween(from, to, '');
      const validated = validateVocabWord(text);
      
      if (!validated) {
        return null;
      }
      
      return { ...validated, from, to };
    },
  });

  const handleAddWord = useCallback(async () => {
    if (!editor || !vocabSelection || !db || !documentId) return;

    try {
      // Create word record
      const now = Date.now();
      await db.insert(words).values({
        headword: vocabSelection.text,
        headwordNorm: vocabSelection.normalized,
        documentId,
        createdAt: new Date(now),
      });

      // Get the inserted word ID
      const insertedWords = await db
        .select()
        .from(words)
        .where(eq(words.headwordNorm, vocabSelection.normalized))
        .orderBy(words.id)
        .limit(1);

      if (insertedWords.length > 0) {
        const wordId = insertedWords[insertedWords.length - 1].id;
        
        // Apply the mark
        editor
          .chain()
          .focus()
          .setTextSelection({ from: vocabSelection.from, to: vocabSelection.to })
          .setVocabMark(wordId)
          .run();

        onContentChange(editor.getJSON());
      }
    } catch (error) {
      console.error('Error creating vocab word:', error);
    }
  }, [editor, vocabSelection, db, documentId, onContentChange]);

  const canAddWord = vocabSelection !== null && db !== null && documentId !== null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ 
        placement: 'top',
        offset: 8,
      }}
      updateDelay={100}
      shouldShow={({ editor: e, state }) => {
        // Show when there's a text selection
        const { from, to, empty } = state.selection;
        const hasText = state.doc.textBetween(from, to, '').length > 0;
        return !empty && hasText && e.isEditable;
      }}
      className="bubble-menu"
    >
      {/* Formatting buttons */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        onMouseDown={(e) => e.preventDefault()}
        className={`bubble-menu-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
        title="Bold (Ctrl+B)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        onMouseDown={(e) => e.preventDefault()}
        className={`bubble-menu-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        title="Italic (Ctrl+I)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        onMouseDown={(e) => e.preventDefault()}
        className={`bubble-menu-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
        title="Underline (Ctrl+U)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M6 4v6a6 6 0 0 0 12 0V4"/>
          <line x1="4" y1="20" x2="20" y2="20"/>
        </svg>
      </button>

      {/* Separator */}
      <div className="bubble-menu-separator" />

      {/* Add Word button */}
      <button
        type="button"
        onClick={handleAddWord}
        onMouseDown={(e) => e.preventDefault()}
        disabled={!canAddWord}
        className={`bubble-menu-btn bubble-menu-btn-add-word ${canAddWord ? '' : 'is-disabled'}`}
        title={canAddWord ? `Add "${vocabSelection?.text}" to vocabulary` : 'Select a single word to add'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>
        <span className="ml-1 text-xs font-medium">Add</span>
      </button>
    </BubbleMenu>
  );
}

