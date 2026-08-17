CREATE TABLE `directories` (
	`domain` text PRIMARY KEY NOT NULL,
	`name` text,
	`submit_url` text,
	`tier` text,
	`categories` text DEFAULT '[]' NOT NULL,
	`requires_account` integer DEFAULT false NOT NULL,
	`requires_captcha` integer DEFAULT false NOT NULL,
	`requires_payment` integer DEFAULT false NOT NULL,
	`requires_backlink` integer DEFAULT false NOT NULL,
	`captcha_vendor` text,
	`third_party_form` integer DEFAULT false NOT NULL,
	`price` real,
	`status` text DEFAULT 'alive' NOT NULL,
	`http_status` integer DEFAULT 0 NOT NULL,
	`source` text NOT NULL,
	`last_checked_at` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `directories_status_idx` ON `directories` (`status`);--> statement-breakpoint
CREATE INDEX `directories_tier_idx` ON `directories` (`tier`);--> statement-breakpoint
CREATE INDEX `directories_source_idx` ON `directories` (`source`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text DEFAULT (datetime('now')) NOT NULL,
	`actor` text DEFAULT 'agent' NOT NULL,
	`action` text NOT NULL,
	`product_slug` text,
	`domain` text,
	`detail` text DEFAULT '{}' NOT NULL,
	`ok` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_at_idx` ON `events` (`at`);--> statement-breakpoint
CREATE INDEX `events_action_idx` ON `events` (`action`);--> statement-breakpoint
CREATE TABLE `products` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`description_short` text DEFAULT '' NOT NULL,
	`description_medium` text DEFAULT '' NOT NULL,
	`description_long` text DEFAULT '' NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`screenshots` text DEFAULT '[]' NOT NULL,
	`pricing` text DEFAULT '' NOT NULL,
	`x` text DEFAULT '' NOT NULL,
	`github` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_slug` text NOT NULL,
	`domain` text NOT NULL,
	`state` text DEFAULT 'todo' NOT NULL,
	`submitted_at` text,
	`listing_url` text,
	`backlink_live` integer,
	`backlink_rel` text,
	`last_verified_at` text,
	`notes` text,
	FOREIGN KEY (`product_slug`) REFERENCES `products`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`domain`) REFERENCES `directories`(`domain`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_product_domain_idx` ON `submissions` (`product_slug`,`domain`);--> statement-breakpoint
CREATE INDEX `submissions_state_idx` ON `submissions` (`state`);