-- AI feature access gate, per account. Off by default so AI usage never
-- accrues cost until explicitly enabled (admin-toggled via DB in v1).
ALTER TABLE `users` ADD `ai_enabled` boolean DEFAULT false NOT NULL;
