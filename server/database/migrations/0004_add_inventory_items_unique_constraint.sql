ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_household_ingredient_location_uq` UNIQUE(`household_id`,`ingredient_id`,`location`);
