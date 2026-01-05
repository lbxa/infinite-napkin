import type { JSONContent } from '@tiptap/react';
import type { DrizzleDb } from './drizzle';
import { documentStats, words } from './schema';
import { eq, count } from 'drizzle-orm';

/**
 * Extract plain text from TipTap JSONContent
 */
export function extractPlainText(content: JSONContent): string {
  const parts: string[] = [];

  function traverse(node: JSONContent) {
    if (node.text) {
      parts.push(node.text);
    }
    if (node.content) {
      for (const child of node.content) {
        traverse(child);
      }
      // Add space after block elements
      if (node.type === 'paragraph' || node.type === 'heading') {
        parts.push(' ');
      }
    }
  }

  traverse(content);
  return parts.join('').trim();
}

/**
 * Compute a snippet from plain text (first N characters)
 */
export function computeSnippet(text: string, maxLen = 140): string {
  if (text.length <= maxLen) return text;
  
  // Try to break at word boundary
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLen * 0.7) {
    return truncated.slice(0, lastSpace) + '…';
  }
  
  return truncated + '…';
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Update document stats in the database
 */
export async function updateDocumentStats(
  db: DrizzleDb,
  documentId: number,
  content: JSONContent
): Promise<void> {
  try {
    const plainText = extractPlainText(content);
    const snippet = computeSnippet(plainText);
    const wordCount = countWords(plainText);
    
    // Get vocab count from words table
    const vocabResult = await db
      .select({ count: count() })
      .from(words)
      .where(eq(words.documentId, documentId));
    
    const vocabCount = vocabResult[0]?.count ?? 0;
    
    // Upsert stats
    await db
      .insert(documentStats)
      .values({
        documentId,
        snippet,
        wordCount,
        vocabCount,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: documentStats.documentId,
        set: {
          snippet,
          wordCount,
          vocabCount,
          computedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Error updating document stats:', error);
  }
}

