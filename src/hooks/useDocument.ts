import { useState, useEffect, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { documents } from '../lib/schema';
import type { DrizzleDb } from '../lib/drizzle';
import type { JSONContent } from '@tiptap/react';

interface UseDocumentResult {
  title: string;
  content: JSONContent | null;
  isLoading: boolean;
  documentId: number | null;
  setTitle: (title: string) => void;
  saveContent: (content: JSONContent) => void;
}

export function useDocument(db: DrizzleDb | null): UseDocumentResult {
  const [title, setTitleState] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentId, setDocumentId] = useState<number | null>(null);

  // Load document on mount
  useEffect(() => {
    if (!db) return;

    const loadDocument = async () => {
      try {
        const docs = await db.select().from(documents).limit(1);
        if (docs.length > 0) {
          const doc = docs[0];
          setDocumentId(doc.id);
          setTitleState(doc.title);
          try {
            setContent(JSON.parse(doc.contentJson));
          } catch {
            setContent(null);
          }
        }
      } catch (e) {
        console.error('Error loading document:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [db]);

  const setTitle = useCallback(
    (newTitle: string) => {
      setTitleState(newTitle);
      if (db && documentId) {
        db.update(documents)
          .set({ title: newTitle, updatedAt: new Date() })
          .where(eq(documents.id, documentId))
          .then(() => {})
          .catch(console.error);
      }
    },
    [db, documentId]
  );

  const saveContent = useCallback(
    (newContent: JSONContent) => {
      setContent(newContent);
      if (db && documentId) {
        db.update(documents)
          .set({ contentJson: JSON.stringify(newContent), updatedAt: new Date() })
          .where(eq(documents.id, documentId))
          .then(() => {})
          .catch(console.error);
      }
    },
    [db, documentId]
  );

  return {
    title,
    content,
    isLoading,
    documentId,
    setTitle,
    saveContent,
  };
}


