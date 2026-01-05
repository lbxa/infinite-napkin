CREATE TABLE `document_stats` (
	`document_id` integer PRIMARY KEY NOT NULL,
	`snippet` text,
	`word_count` integer DEFAULT 0,
	`vocab_count` integer DEFAULT 0,
	`computed_at` integer,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
