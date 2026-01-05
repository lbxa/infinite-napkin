import { useState, useEffect, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { documents } from '../lib/schema';
import type { DrizzleDb } from '../lib/drizzle';
import type { JSONContent } from '@tiptap/react';
import { updateDocumentStats } from '../lib/document-stats';

interface UseDocumentResult {
  title: string;
  content: JSONContent | null;
  isLoading: boolean;
  setTitle: (title: string) => void;
  saveContent: (content: JSONContent) => void;
}

export function useDocument(db: DrizzleDb | null, documentId: number): UseDocumentResult {
  const [title, setTitleState] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load document by ID
  useEffect(() => {
    if (!db || !documentId) return;

    const loadDocument = async () => {
      setIsLoading(true);
      try {
        const docs = await db.select().from(documents).where(eq(documents.id, documentId));
        if (docs.length > 0) {
          const doc = docs[0];
          setTitleState(doc.title);
          try {
            setContent(JSON.parse(doc.contentJson));
          } catch {
            setContent(null);
          }
        } else {
          setContent(null);
        }
      } catch (e) {
        console.error('Error loading document:', e);
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [db, documentId]);

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
          .then(() => {
            // Update stats after save
            updateDocumentStats(db, documentId, newContent);
          })
          .catch(console.error);
      }
    },
    [db, documentId]
  );

  return {
    title,
    content,
    isLoading,
    setTitle,
    saveContent,
  };
}
