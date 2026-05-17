-- New table: personal access tokens for LLM/agent authentication (MCP endpoint).
-- The token plaintext is never stored; only the SHA-256 hex hash is persisted.
-- A token is immutably bound to (user_id, household_id) at creation time.

CREATE TABLE `personal_access_tokens` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`household_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`prefix` char(8) NOT NULL,
	`last_used_at` datetime,
	`revoked_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personal_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `personal_access_tokens_token_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `personal_access_tokens_user_idx` ON `personal_access_tokens` (`user_id`);
--> statement-breakpoint
CREATE INDEX `personal_access_tokens_user_active_idx` ON `personal_access_tokens` (`user_id`,`revoked_at`);
--> statement-breakpoint
ALTER TABLE `personal_access_tokens` ADD CONSTRAINT `personal_access_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `personal_access_tokens` ADD CONSTRAINT `personal_access_tokens_household_id_households_id_fk` FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;
