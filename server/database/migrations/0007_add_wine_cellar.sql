-- Wine cellar management: cellars → shelves → rows (physical structure),
-- wine references and their bottle instances. Bottle position columns are
-- either all NULL (unplaced pool / consumed) or all set; the UNIQUE index on
-- (row_id, depth, slot_index) enforces "one bottle per slot" while allowing
-- multiple all-NULL rows (MySQL/MariaDB multi-NULL behaviour). See change
-- add-wine-cellar.

CREATE TABLE `wine_cellars` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wine_cellars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wine_shelves` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`cellar_id` char(36) NOT NULL,
	`label` varchar(120),
	`position` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wine_shelves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wine_rows` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`shelf_id` char(36) NOT NULL,
	`position` int unsigned NOT NULL,
	`capacity_back` int unsigned NOT NULL,
	`capacity_front` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wine_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wines` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`domain` varchar(200),
	`country` varchar(80),
	`region` varchar(40),
	`appellation` varchar(200),
	`vintage` smallint unsigned,
	`color` enum('rouge','blanc','rose','effervescent') NOT NULL,
	`garde_min` smallint unsigned,
	`garde_max` smallint unsigned,
	`comment` text,
	`photo_url` varchar(500),
	`rating` tinyint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wine_bottles` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`wine_id` char(36) NOT NULL,
	`size_ml` int unsigned NOT NULL,
	`buying_price_cents` int unsigned,
	`added_date` date,
	`status` enum('in_stock','consumed') NOT NULL DEFAULT 'in_stock',
	`row_id` char(36),
	`depth` enum('front','back'),
	`slot_index` int unsigned,
	`exit_reason` enum('consumed','gifted','broken'),
	`exit_date` date,
	`tasting_note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wine_bottles_id` PRIMARY KEY(`id`),
	CONSTRAINT `wine_bottles_slot_uq` UNIQUE(`row_id`,`depth`,`slot_index`)
);
--> statement-breakpoint
CREATE INDEX `wine_cellars_household_idx` ON `wine_cellars` (`household_id`);
--> statement-breakpoint
CREATE INDEX `wine_shelves_cellar_idx` ON `wine_shelves` (`cellar_id`);
--> statement-breakpoint
CREATE INDEX `wine_shelves_household_idx` ON `wine_shelves` (`household_id`);
--> statement-breakpoint
CREATE INDEX `wine_rows_shelf_idx` ON `wine_rows` (`shelf_id`);
--> statement-breakpoint
CREATE INDEX `wine_rows_household_idx` ON `wine_rows` (`household_id`);
--> statement-breakpoint
CREATE INDEX `wines_household_idx` ON `wines` (`household_id`);
--> statement-breakpoint
CREATE INDEX `wine_bottles_household_idx` ON `wine_bottles` (`household_id`);
--> statement-breakpoint
CREATE INDEX `wine_bottles_wine_idx` ON `wine_bottles` (`wine_id`);
--> statement-breakpoint
CREATE INDEX `wine_bottles_row_idx` ON `wine_bottles` (`row_id`);
--> statement-breakpoint
CREATE INDEX `wine_bottles_status_idx` ON `wine_bottles` (`household_id`,`status`);
--> statement-breakpoint
ALTER TABLE `wine_cellars` ADD CONSTRAINT `wine_cellars_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_shelves` ADD CONSTRAINT `wine_shelves_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_shelves` ADD CONSTRAINT `wine_shelves_cellar_id_wine_cellars_id_fk` FOREIGN KEY (`cellar_id`) REFERENCES `wine_cellars`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_rows` ADD CONSTRAINT `wine_rows_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_rows` ADD CONSTRAINT `wine_rows_shelf_id_wine_shelves_id_fk` FOREIGN KEY (`shelf_id`) REFERENCES `wine_shelves`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wines` ADD CONSTRAINT `wines_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_bottles` ADD CONSTRAINT `wine_bottles_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `wine_bottles` ADD CONSTRAINT `wine_bottles_wine_id_wines_id_fk` FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON DELETE cascade ON UPDATE no action;
