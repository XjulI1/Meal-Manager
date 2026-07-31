-- Manual rollback for 0009_menu_slot_items.sql.
--
-- `drizzle-kit migrate` (this project's `pnpm db:migrate`) is forward-only —
-- this script is NOT part of the migration journal and is never applied
-- automatically. Run it by hand only if `menu_slot_items` must be rolled
-- back after deployment.
--
-- LOSSY: only `kind = 'recipe'` items are restored into `menu_slots` (its
-- schema has no place for free ingredients). Any `kind = 'ingredient'` rows
-- are dropped. Acceptable per design.md — free ingredients are a new
-- capability, not yet exploited in production at the time of first deploy.

CREATE TABLE `menu_slots` (
	`menu_id` char(36) NOT NULL,
	`day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
	`meal_type` enum('breakfast','lunch','dinner') NOT NULL,
	`recipe_id` char(36),
	`servings` int unsigned,
	CONSTRAINT `menu_slots_menu_id_day_of_week_meal_type_pk` PRIMARY KEY(`menu_id`,`day_of_week`,`meal_type`)
);
--> statement-breakpoint
INSERT INTO `menu_slots` (`menu_id`, `day_of_week`, `meal_type`, `recipe_id`, `servings`)
SELECT `menu_id`, `day_of_week`, `meal_type`, `recipe_id`, `servings`
FROM `menu_slot_items`
WHERE `kind` = 'recipe';
--> statement-breakpoint
DROP TABLE `menu_slot_items`;
--> statement-breakpoint
ALTER TABLE `menu_slots` ADD CONSTRAINT `menu_slots_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `menu_slots` ADD CONSTRAINT `menu_slots_recipe_id_recipes_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE set null ON UPDATE no action;
