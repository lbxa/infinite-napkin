import { useState, useEffect, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { documents, documentStats, words, wordOverrides } from '../lib/schema';
import type { DrizzleDb } from '../lib/drizzle';
import type { Document, DocumentStats } from '../lib/schema';

export type SortMode = 'updated' | 'title' | 'vocab' | 'words';

export interface DocumentWithStats extends Document {
  stats: DocumentStats | null;
}

export interface DeletedDocument {
  document: Document;
  stats: DocumentStats | null;
}

interface UseDocumentsResult {
  documents: DocumentWithStats[];
  isLoading: boolean;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  createDocument: () => Promise<number | null>;
  renameDocument: (id: number, title: string) => Promise<void>;
  deleteDocument: (id: number) => Promise<DeletedDocument | null>;
  restoreDocument: (data: DeletedDocument) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDocuments(db: DrizzleDb | null): UseDocumentsResult {
  const [docs, setDocs] = useState<DocumentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('updated');

  const loadDocuments = useCallback(async () => {
    if (!db) return;
    
    try {
      // Fetch documents with left join on stats
      const result = await db
        .select({
          document: documents,
          stats: documentStats,
        })
        .from(documents)
        .leftJoin(documentStats, eq(documents.id, documentStats.documentId));
      
      const docsWithStats: DocumentWithStats[] = result.map((row) => ({
        ...row.document,
        stats: row.stats,
      }));
      
      // Sort in memory based on sortMode
      docsWithStats.sort((a, b) => {
        switch (sortMode) {
          case 'updated':
            return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
          case 'title':
            return a.title.localeCompare(b.title);
          case 'vocab':
            return (b.stats?.vocabCount ?? 0) - (a.stats?.vocabCount ?? 0);
          case 'words':
            return (b.stats?.wordCount ?? 0) - (a.stats?.wordCount ?? 0);
          default:
            return 0;
        }
      });
      
      setDocs(docsWithStats);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, sortMode]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const createDocument = useCallback(async (): Promise<number | null> => {
    if (!db) return null;
    
    try {
      const result = await db
        .insert(documents)
        .values({
          title: 'Untitled',
          contentJson: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
        })
        .returning({ id: documents.id });
      
      const newId = result[0]?.id;
      if (newId) {
        await loadDocuments();
        return newId;
      }
      return null;
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  }, [db, loadDocuments]);

  const renameDocument = useCallback(async (id: number, title: string): Promise<void> => {
    if (!db) return;
    
    const trimmedTitle = title.trim().slice(0, 120) || 'Untitled';
    
    try {
      await db
        .update(documents)
        .set({ title: trimmedTitle, updatedAt: new Date() })
        .where(eq(documents.id, id));
      
      await loadDocuments();
    } catch (error) {
      console.error('Error renaming document:', error);
    }
  }, [db, loadDocuments]);

  const deleteDocument = useCallback(async (id: number): Promise<DeletedDocument | null> => {
    if (!db) return null;
    
    try {
      // Fetch document and stats for restoration
      const docResult = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id));
      
      if (docResult.length === 0) return null;
      
      const statsResult = await db
        .select()
        .from(documentStats)
        .where(eq(documentStats.documentId, id));
      
      const deleted: DeletedDocument = {
        document: docResult[0],
        stats: statsResult[0] ?? null,
      };
      
      // Delete stats first
      await db.delete(documentStats).where(eq(documentStats.documentId, id));
      
      // Get word IDs for this document
      const wordIds = await db
        .select({ id: words.id })
        .from(words)
        .where(eq(words.documentId, id));
      
      // Delete word overrides
      for (const word of wordIds) {
        await db.delete(wordOverrides).where(eq(wordOverrides.wordId, word.id));
      }
      
      // Delete words
      await db.delete(words).where(eq(words.documentId, id));
      
      // Delete document
      await db.delete(documents).where(eq(documents.id, id));
      
      await loadDocuments();
      return deleted;
    } catch (error) {
      console.error('Error deleting document:', error);
      return null;
    }
  }, [db, loadDocuments]);

  const restoreDocument = useCallback(async (data: DeletedDocument): Promise<void> => {
    if (!db) return;
    
    try {
      // Restore document
      await db.insert(documents).values({
        id: data.document.id,
        title: data.document.title,
        contentJson: data.document.contentJson,
        createdAt: data.document.createdAt,
        updatedAt: data.document.updatedAt,
      });
      
      // Restore stats if they existed
      if (data.stats) {
        await db.insert(documentStats).values(data.stats);
      }
      
      await loadDocuments();
    } catch (error) {
      console.error('Error restoring document:', error);
    }
  }, [db, loadDocuments]);

  return {
    documents: docs,
    isLoading,
    sortMode,
    setSortMode,
    createDocument,
    renameDocument,
    deleteDocument,
    restoreDocument,
    refresh: loadDocuments,
  };
}

