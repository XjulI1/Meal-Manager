CREATE TABLE `household_members` (
	`household_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `household_members_household_id_user_id_pk` PRIMARY KEY(`household_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`invite_code` varchar(32) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`),
	CONSTRAINT `households_invite_code_unique` UNIQUE(`invite_code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`quantity_value` int unsigned NOT NULL,
	`quantity_unit` enum('g','ml','unit') NOT NULL,
	`location` enum('pantry','fridge') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`recipe_id` char(36) NOT NULL,
	`position` int unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`quantity_value` int unsigned NOT NULL,
	`quantity_unit` enum('g','ml','unit') NOT NULL,
	CONSTRAINT `recipe_ingredients_recipe_id_position_pk` PRIMARY KEY(`recipe_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`instructions` text NOT NULL,
	`servings` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_slots` (
	`menu_id` char(36) NOT NULL,
	`day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
	`meal_type` enum('breakfast','lunch','dinner') NOT NULL,
	`recipe_id` char(36),
	`servings` int unsigned,
	CONSTRAINT `menu_slots_menu_id_day_of_week_meal_type_pk` PRIMARY KEY(`menu_id`,`day_of_week`,`meal_type`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`week_start` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`),
	CONSTRAINT `menus_household_week_uniq` UNIQUE(`household_id`,`week_start`)
);
--> statement-breakpoint
CREATE TABLE `shopping_list_items` (
	`id` char(36) NOT NULL,
	`snapshot_id` char(36) NOT NULL,
	`ingredient_name` varchar(120) NOT NULL,
	`quantity_value` int unsigned NOT NULL,
	`quantity_unit` enum('g','ml','unit') NOT NULL,
	`is_checked` boolean NOT NULL DEFAULT false,
	CONSTRAINT `shopping_list_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopping_list_snapshots` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`menu_id` char(36) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopping_list_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_recipe_id_recipes_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_slots` ADD CONSTRAINT `menu_slots_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_slots` ADD CONSTRAINT `menu_slots_recipe_id_recipes_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menus` ADD CONSTRAINT `menus_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD CONSTRAINT `shopping_list_items_snapshot_id_shopping_list_snapshots_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `shopping_list_snapshots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_list_snapshots` ADD CONSTRAINT `shopping_list_snapshots_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_list_snapshots` ADD CONSTRAINT `shopping_list_snapshots_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `household_members_user_idx` ON `household_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `households_invite_code_idx` ON `households` (`invite_code`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `inventory_items_household_idx` ON `inventory_items` (`household_id`);--> statement-breakpoint
CREATE INDEX `inventory_items_location_idx` ON `inventory_items` (`household_id`,`location`);--> statement-breakpoint
CREATE INDEX `recipes_household_idx` ON `recipes` (`household_id`);--> statement-breakpoint
CREATE INDEX `menus_household_idx` ON `menus` (`household_id`);--> statement-breakpoint
CREATE INDEX `shopping_list_items_snapshot_idx` ON `shopping_list_items` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `shopping_lists_household_idx` ON `shopping_list_snapshots` (`household_id`);--> statement-breakpoint
CREATE INDEX `shopping_lists_menu_idx` ON `shopping_list_snapshots` (`menu_id`);