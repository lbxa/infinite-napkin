CREATE TABLE `dictionary_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`headword_norm` text NOT NULL,
	`phonetic` text,
	`audio_url` text,
	`part_of_speech` text,
	`definition` text,
	`synonyms` text,
	`fetched_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dictionary_entries_headword_norm_unique` ON `dictionary_entries` (`headword_norm`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT 'Untitled' NOT NULL,
	`content_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `word_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer NOT NULL,
	`custom_definition` text,
	`custom_phonetic` text,
	`notes` text,
	`updated_at` integer,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_word_overrides_word_id` ON `word_overrides` (`word_id`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`headword` text NOT NULL,
	`headword_norm` text NOT NULL,
	`document_id` integer,
	`created_at` integer,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_words_headword_norm` ON `words` (`headword_norm`);--> statement-breakpoint
CREATE INDEX `idx_words_document_id` ON `words` (`document_id`);