-- AI enrichment fields for a wine reference. Filled on demand by the Anthropic
-- enrichment (garde window reuses the existing garde_min/garde_max columns).
-- All nullable: a wine that was never enriched keeps NULLs.
ALTER TABLE `wines` ADD `aromas` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `food_pairings` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `ai_enriched_at` timestamp;
