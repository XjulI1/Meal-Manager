-- Add 'freezer' (congélateur) to the storage/location enums on `ingredients`
-- and `inventory_items`. MySQL allows extending an enum by appending values
-- in a MODIFY COLUMN without rewriting data.
ALTER TABLE `ingredients` MODIFY COLUMN `storage` enum('pantry','fridge','freezer') NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory_items` MODIFY COLUMN `location` enum('pantry','fridge','freezer') NOT NULL;
