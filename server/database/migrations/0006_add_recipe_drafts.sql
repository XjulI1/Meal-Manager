-- Persisted recipe drafts (work-in-progress recipes) scoped to a household.
-- Content fields are nullable and ingredients are stored as FREE TEXT (name +
-- loose quantity/unit) — not yet resolved to the catalog nor normalized to
-- canonical units. Normalization happens at promotion via the existing
-- resolve + create-recipe flow. See change add-recipe-drafts.

CREATE TABLE `recipe_drafts` (
	`id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`source` enum('manual','ai-chat','ai-url','ai-photo','mcp') NOT NULL,
	`title` varchar(200),
	`instructions` text,
	`servings` int unsigned,
	`source_url` varchar(2000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipe_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_draft_ingredients` (
	`draft_id` char(36) NOT NULL,
	`position` int unsigned NOT NULL,
	`name` varchar(200) NOT NULL,
	`quantity_value` decimal(10,2),
	`quantity_unit` varchar(40),
	`raw` varchar(300),
	CONSTRAINT `recipe_draft_ingredients_draft_id_position_pk` PRIMARY KEY(`draft_id`,`position`)
);
--> statement-breakpoint
CREATE INDEX `recipe_drafts_household_idx` ON `recipe_drafts` (`household_id`);
--> statement-breakpoint
ALTER TABLE `recipe_drafts` ADD CONSTRAINT `recipe_drafts_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `recipe_draft_ingredients` ADD CONSTRAINT `recipe_draft_ingredients_draft_id_recipe_drafts_id_fk` FOREIGN KEY (`draft_id`) REFERENCES `recipe_drafts`(`id`) ON DELETE cascade ON UPDATE no action;
