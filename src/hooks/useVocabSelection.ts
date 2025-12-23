import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';

export interface VocabSelection {
  text: string;
  normalized: string;
  from: number;
  to: number;
}

export function useVocabSelection(editor: Editor | null) {
  const [selection, setSelection] = useState<VocabSelection | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateSelection = useCallback((text: string): string | null => {
    // Trim and check length
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > 40) {
      return null;
    }

    // Check for whitespace (should be single word)
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

    return normalized;
  }, []);

  const updateSelection = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setSelection(null);
      return;
    }

    const { from, to, empty } = editor.state.selection;

    if (empty) {
      setSelection(null);
      return;
    }

    const text = editor.state.doc.textBetween(from, to, '');
    const normalized = validateSelection(text);

    if (!normalized) {
      setSelection(null);
      return;
    }

    setSelection({
      text: text.trim(),
      normalized,
      from,
      to,
    });
  }, [editor, validateSelection]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleSelectionUpdate = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        updateSelection();
      }, 100);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [editor, updateSelection]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  return { selection, clearSelection };
}
