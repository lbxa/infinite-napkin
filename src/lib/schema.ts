import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull().default('Untitled'),
  contentJson: text('content_json').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const words = sqliteTable('words', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  headword: text('headword').notNull(),
  headwordNorm: text('headword_norm').notNull(),
  documentId: integer('document_id').references(() => documents.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_words_headword_norm').on(table.headwordNorm),
  index('idx_words_document_id').on(table.documentId),
]);

export const dictionaryEntries = sqliteTable('dictionary_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  headwordNorm: text('headword_norm').notNull().unique(),
  phonetic: text('phonetic'),
  audioUrl: text('audio_url'),
  partOfSpeech: text('part_of_speech'),
  definition: text('definition'),
  synonyms: text('synonyms'), // JSON array as string
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const wordOverrides = sqliteTable('word_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  wordId: integer('word_id').notNull().references(() => words.id),
  customDefinition: text('custom_definition'),
  customPhonetic: text('custom_phonetic'),
  notes: text('notes'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_word_overrides_word_id').on(table.wordId),
]);

// Type exports for use in the app
export type Meta = typeof meta.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Word = typeof words.$inferSelect;
export type NewWord = typeof words.$inferInsert;
export type DictionaryEntry = typeof dictionaryEntries.$inferSelect;
export type NewDictionaryEntry = typeof dictionaryEntries.$inferInsert;
export type WordOverride = typeof wordOverrides.$inferSelect;
export type NewWordOverride = typeof wordOverrides.$inferInsert;
