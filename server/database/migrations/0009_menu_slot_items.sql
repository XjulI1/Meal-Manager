-- Multi-item menu slots: a (menu, day, meal) slot no longer references a
-- single recipe but becomes a container of items — at most one recipe item
-- plus 0..n free-ingredient items, each on its own row. Replaces `menu_slots`
-- (composite PK, single recipe_id/servings) with `menu_slot_items` (surrogate
-- id per item; a slot "exists" iff it has at least one row). Existing recipe
-- slots are copied over as `kind = 'recipe'` items before the old table is
-- dropped. See change menu-slot-multi-items.

CREATE TABLE `menu_slot_items` (
	`id` char(36) NOT NULL,
	`menu_id` char(36) NOT NULL,
	`day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
	`meal_type` enum('breakfast','lunch','dinner') NOT NULL,
	`kind` enum('recipe','ingredient') NOT NULL,
	`recipe_id` char(36),
	`servings` int unsigned,
	`ingredient_id` char(36),
	`quantity_value` int unsigned,
	`quantity_unit` enum('g','ml','unit'),
	CONSTRAINT `menu_slot_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `menu_slot_items` (`id`, `menu_id`, `day_of_week`, `meal_type`, `kind`, `recipe_id`, `servings`)
SELECT UUID(), `menu_id`, `day_of_week`, `meal_type`, 'recipe', `recipe_id`, `servings`
FROM `menu_slots`
WHERE `recipe_id` IS NOT NULL;
--> statement-breakpoint
DROP TABLE `menu_slots`;
--> statement-breakpoint
CREATE INDEX `menu_slot_items_slot_idx` ON `menu_slot_items` (`menu_id`,`day_of_week`,`meal_type`);
--> statement-breakpoint
ALTER TABLE `menu_slot_items` ADD CONSTRAINT `menu_slot_items_ingredient_uniq` UNIQUE(`menu_id`,`day_of_week`,`meal_type`,`ingredient_id`);
--> statement-breakpoint
ALTER TABLE `menu_slot_items` ADD CONSTRAINT `menu_slot_items_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `menu_slot_items` ADD CONSTRAINT `menu_slot_items_recipe_id_recipes_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `menu_slot_items` ADD CONSTRAINT `menu_slot_items_ingredient_id_ingredients_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON DELETE cascade ON UPDATE no action;
