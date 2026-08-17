CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`step` text,
	`done` integer,
	`total` integer,
	`started_at` text NOT NULL,
	`finished_at` text,
	`ok` integer,
	`product_slug` text
);
--> statement-breakpoint
CREATE INDEX `runs_started_idx` ON `runs` (`started_at`);