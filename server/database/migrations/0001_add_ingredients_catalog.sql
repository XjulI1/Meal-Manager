-- New tables: ingredients catalog and products with barcodes.
CREATE TABLE `ingredients` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`storage` enum('pantry','fridge') NOT NULL,
	`category` enum('produce','bakery','meat-fish','dairy','frozen','grocery','beverages','household','other') NOT NULL,
	`canonical_unit` enum('g','ml','unit') NOT NULL,
	`shelf_life_days` int unsigned,
	`image_url` varchar(500),
	`default_pack_size` int unsigned,
	`allergens` json,
	`deleted_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ingredients_household_idx` ON `ingredients` (`household_id`);
--> statement-breakpoint
CREATE INDEX `ingredients_household_name_active_idx` ON `ingredients` (`household_id`,`name`,`deleted_at`);
--> statement-breakpoint
CREATE INDEX `ingredients_household_category_idx` ON `ingredients` (`household_id`,`category`);
--> statement-breakpoint
ALTER TABLE `ingredients` ADD CONSTRAINT `ingredients_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `ingredient_aliases` (
	`ingredient_id` char(36) NOT NULL,
	`alias` varchar(100) NOT NULL,
	CONSTRAINT `ingredient_aliases_ingredient_id_alias_pk` PRIMARY KEY(`ingredient_id`,`alias`)
);
--> statement-breakpoint
CREATE INDEX `ingredient_aliases_alias_idx` ON `ingredient_aliases` (`alias`);
--> statement-breakpoint
ALTER TABLE `ingredient_aliases` ADD CONSTRAINT `ingredient_aliases_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `products` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`ingredient_id` char(36) NOT NULL,
	`brand` varchar(100),
	`pack_size` int unsigned NOT NULL,
	`pack_unit` enum('g','ml','unit') NOT NULL,
	`image_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `products_household_idx` ON `products` (`household_id`);
--> statement-breakpoint
CREATE INDEX `products_ingredient_idx` ON `products` (`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE `product_barcodes` (
	`product_id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`barcode` varchar(14) NOT NULL,
	CONSTRAINT `product_barcodes_product_id_barcode_pk` PRIMARY KEY(`product_id`,`barcode`),
	CONSTRAINT `product_barcodes_household_barcode_uq` UNIQUE(`household_id`,`barcode`)
);
--> statement-breakpoint
CREATE INDEX `product_barcodes_barcode_idx` ON `product_barcodes` (`barcode`);
--> statement-breakpoint
ALTER TABLE `product_barcodes` ADD CONSTRAINT `product_barcodes_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- BREAKING: existing tables now reference ingredients by id; legacy `name` columns are dropped.
ALTER TABLE `inventory_items` DROP COLUMN `name`;
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD COLUMN `ingredient_id` char(36) NOT NULL;
--> statement-breakpoint
CREATE INDEX `inventory_items_ingredient_idx` ON `inventory_items` (`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE `recipe_ingredients` DROP COLUMN `name`;
--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD COLUMN `ingredient_id` char(36) NOT NULL;
--> statement-breakpoint
CREATE INDEX `recipe_ingredients_ingredient_idx` ON `recipe_ingredients` (`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- shopping_list_items: ingredient_name stays (denormalized snapshot), add ingredient_id + category.
ALTER TABLE `shopping_list_items` ADD COLUMN `ingredient_id` char(36) NOT NULL;
--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD COLUMN `category` enum('produce','bakery','meat-fish','dairy','frozen','grocery','beverages','household','other') NOT NULL DEFAULT 'other';
--> statement-breakpoint
CREATE INDEX `shopping_list_items_ingredient_idx` ON `shopping_list_items` (`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD CONSTRAINT `shopping_list_items_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE restrict ON UPDATE no action;
