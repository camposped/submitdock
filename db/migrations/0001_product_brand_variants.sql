ALTER TABLE `products` ADD `logo_on_light` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `logo_on_dark` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `icon_on_light` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `icon_on_dark` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Carry the single logo forward before 0002 drops it. Dark ink on a
-- transparent background is what you upload to a light page, so the old value
-- is the "on light" variant.
UPDATE `products` SET `logo_on_light` = `logo` WHERE `logo` <> '';
