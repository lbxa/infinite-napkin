import { useState, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { dictionaryEntries, wordOverrides, words } from '../lib/schema';
import { fetchDictionaryEntry } from '../lib/dictionary';
import type { DrizzleDb } from '../lib/drizzle';

export interface WordData {
  wordId: number;
  headword: string;
  phonetic: string | null;
  audioUrl: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  synonyms: string[];
  customDefinition: string | null;
  customPhonetic: string | null;
  notes: string | null;
  isLoading: boolean;
}

export function useDictionaryLookup(db: DrizzleDb | null) {
  const [cache, setCache] = useState<Map<number, WordData>>(new Map());

  const lookupWord = useCallback(
    async (wordId: number): Promise<WordData | null> => {
      if (!db) return null;

      // Check local cache
      if (cache.has(wordId)) {
        return cache.get(wordId)!;
      }

      // Set loading state
      const loadingData: WordData = {
        wordId,
        headword: '',
        phonetic: null,
        audioUrl: null,
        partOfSpeech: null,
        definition: null,
        synonyms: [],
        customDefinition: null,
        customPhonetic: null,
        notes: null,
        isLoading: true,
      };
      setCache((prev) => new Map(prev).set(wordId, loadingData));

      try {
        // Get word record
        const wordRecords = await db
          .select()
          .from(words)
          .where(eq(words.id, wordId))
          .limit(1);

        if (wordRecords.length === 0) return null;

        const word = wordRecords[0];

        // Check for cached dictionary entry
        let dictEntry = await db
          .select()
          .from(dictionaryEntries)
          .where(eq(dictionaryEntries.headwordNorm, word.headwordNorm))
          .limit(1)
          .then((r) => r[0] || null);

        // Fetch from API if not cached
        if (!dictEntry) {
          const apiResult = await fetchDictionaryEntry(word.headwordNorm);
          if (apiResult) {
            await db.insert(dictionaryEntries).values({
              headwordNorm: apiResult.headwordNorm,
              phonetic: apiResult.phonetic,
              audioUrl: apiResult.audioUrl,
              partOfSpeech: apiResult.partOfSpeech,
              definition: apiResult.definition,
              synonyms: JSON.stringify(apiResult.synonyms),
              fetchedAt: new Date(),
            });
            
            dictEntry = {
              id: 0,
              headwordNorm: apiResult.headwordNorm,
              phonetic: apiResult.phonetic,
              audioUrl: apiResult.audioUrl,
              partOfSpeech: apiResult.partOfSpeech,
              definition: apiResult.definition,
              synonyms: JSON.stringify(apiResult.synonyms),
              fetchedAt: new Date(),
            };
          }
        }

        // Get user overrides
        const overrides = await db
          .select()
          .from(wordOverrides)
          .where(eq(wordOverrides.wordId, wordId))
          .limit(1)
          .then((r) => r[0] || null);

        const wordData: WordData = {
          wordId,
          headword: word.headword,
          phonetic: dictEntry?.phonetic || null,
          audioUrl: dictEntry?.audioUrl || null,
          partOfSpeech: dictEntry?.partOfSpeech || null,
          definition: dictEntry?.definition || null,
          synonyms: dictEntry?.synonyms ? JSON.parse(dictEntry.synonyms) : [],
          customDefinition: overrides?.customDefinition || null,
          customPhonetic: overrides?.customPhonetic || null,
          notes: overrides?.notes || null,
          isLoading: false,
        };

        setCache((prev) => new Map(prev).set(wordId, wordData));
        return wordData;
      } catch (error) {
        console.error('Dictionary lookup error:', error);
        return null;
      }
    },
    [db, cache]
  );

  const updateOverrides = useCallback(
    async (
      wordId: number,
      updates: {
        customDefinition?: string | null;
        customPhonetic?: string | null;
        notes?: string | null;
      }
    ) => {
      if (!db) return;

      // Check if override exists
      const existing = await db
        .select()
        .from(wordOverrides)
        .where(eq(wordOverrides.wordId, wordId))
        .limit(1)
        .then((r) => r[0] || null);

      if (existing) {
        await db
          .update(wordOverrides)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(wordOverrides.wordId, wordId));
      } else {
        await db.insert(wordOverrides).values({
          wordId,
          customDefinition: updates.customDefinition || null,
          customPhonetic: updates.customPhonetic || null,
          notes: updates.notes || null,
          updatedAt: new Date(),
        });
      }

      // Invalidate cache
      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(wordId);
        return newCache;
      });
    },
    [db]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return { lookupWord, updateOverrides, clearCache };
}

