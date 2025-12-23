import { useState, useCallback, useEffect } from 'react';
import { useDb } from './hooks/useDb';
import { useDocument } from './hooks/useDocument';
import { useDictionaryLookup, type WordData } from './hooks/useDictionaryLookup';
import { TopBar } from './components/TopBar';
import { ArticleEditor } from './components/ArticleEditor';
import { WordInspector } from './components/WordInspector';
import { words, wordOverrides } from './lib/schema';
import { eq } from 'drizzle-orm';
import type { JSONContent } from '@tiptap/react';

function App() {
  const { db, isLoading: dbLoading, error: dbError, reinitialize } = useDb();
  const { title, content, isLoading: docLoading, documentId, setTitle, saveContent } = useDocument(db);
  const { lookupWord, updateOverrides, clearCache } = useDictionaryLookup(db);

  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedWordData, setSelectedWordData] = useState<WordData | null>(null);

  // Load selected word data
  useEffect(() => {
    if (!selectedWordId) return;
    
    let cancelled = false;
    lookupWord(selectedWordId).then((data) => {
      if (!cancelled) {
        setSelectedWordData(data);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [selectedWordId, lookupWord]);


  const handleDbReload = useCallback(async () => {
    clearCache();
    await reinitialize();
  }, [clearCache, reinitialize]);

  const handleWordSelect = useCallback((wordId: number) => {
    setSelectedWordId(wordId);
  }, []);

  const handleCloseInspector = useCallback(() => {
    setSelectedWordId(null);
    setSelectedWordData(null);
  }, []);

  const handleSaveOverrides = useCallback(
    async (updates: {
      customDefinition?: string | null;
      customPhonetic?: string | null;
      notes?: string | null;
    }) => {
      if (selectedWordId) {
        await updateOverrides(selectedWordId, updates);
        // Refresh word data
        const updated = await lookupWord(selectedWordId);
        setSelectedWordData(updated);
      }
    },
    [selectedWordId, updateOverrides, lookupWord]
  );

  const handleRemoveWord = useCallback(async () => {
    if (!db || !selectedWordId || !content) return;

    try {
      // Delete word overrides first
      await db.delete(wordOverrides).where(eq(wordOverrides.wordId, selectedWordId));
      
      // Delete the word record
      await db.delete(words).where(eq(words.id, selectedWordId));

      // Remove the mark from the document content
      const removeMarkFromContent = (node: JSONContent): JSONContent => {
        if (node.marks) {
          node.marks = node.marks.filter(
            (mark) =>
              !(mark.type === 'vocabMark' && mark.attrs?.wordId === selectedWordId)
          );
          if (node.marks.length === 0) {
            delete node.marks;
          }
        }
        if (node.content) {
          node.content = node.content.map(removeMarkFromContent);
        }
        return node;
      };

      const updatedContent = removeMarkFromContent(JSON.parse(JSON.stringify(content)));
      saveContent(updatedContent);

      // Clear selection and refresh
      handleCloseInspector();
      clearCache();
    } catch (error) {
      console.error('Error removing word:', error);
    }
  }, [db, selectedWordId, content, saveContent, handleCloseInspector, clearCache]);

  // Show loading state
  if (dbLoading || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-sans text-ink-500 dark:text-ink-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-700 dark:bg-ink-900">
        <div className="text-center max-w-md px-4">
          <div className="w-12 h-12 rounded-full bg-accent-rust/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent-rust" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-sans font-semibold mb-2 text-ink-800 dark:text-ink-100">
            Database Error
          </h2>
          <p className="text-ink-500 dark:text-ink-200 mb-4">{dbError.message}</p>
          <button
            onClick={reinitialize}
            className="px-4 py-2 rounded-lg bg-accent-emerald text-white hover:bg-accent-emerald/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper-700 dark:bg-ink-900">
      <TopBar
        title={title}
        onTitleChange={setTitle}
        onDbReload={handleDbReload}
      />

      <div className="flex-1 flex">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto bg-paper-500 dark:bg-ink-800 rounded-xl shadow-lg p-8 min-h-150">
            <ArticleEditor
              content={content}
              onContentChange={saveContent}
              db={db}
              documentId={documentId}
              onWordSelect={handleWordSelect}
              lookupWord={lookupWord}
            />
          </div>
        </main>

        <WordInspector
          wordData={selectedWordData}
          onClose={handleCloseInspector}
          onSave={handleSaveOverrides}
          onRemoveWord={handleRemoveWord}
        />
      </div>
    </div>
  );
}

export default App;
