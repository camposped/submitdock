CREATE TABLE `catalog_domains` (
	`catalog_slug` text NOT NULL,
	`domain` text NOT NULL,
	PRIMARY KEY(`catalog_slug`, `domain`),
	FOREIGN KEY (`catalog_slug`) REFERENCES `catalogs`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`domain`) REFERENCES `directories`(`domain`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `catalog_domains_domain_idx` ON `catalog_domains` (`domain`);--> statement-breakpoint
CREATE TABLE `catalogs` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source_url` text,
	`added_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
-- The `source` column was already a catalog, badly: a comma joined string of
-- list names on each row. Promote it, so membership is a fact you can query
-- and a list is a thing you can add, name and point at a URL.
INSERT INTO `catalogs` (`slug`, `name`, `description`, `source_url`)
VALUES (
  'catalog-1',
  'Catalog 1',
  'A crawl of the directories a paid submission service used, with reachability, submit URLs and blocker flags.',
  NULL
);
--> statement-breakpoint
INSERT INTO `catalog_domains` (`catalog_slug`, `domain`)
SELECT 'catalog-1', `domain` FROM `directories`;
