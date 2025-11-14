ALTER TABLE `workplaceRules` MODIFY COLUMN `ruleType` enum('min_rest_days','night_shift_quota','post_night_shift_rest','required_staff_pattern','max_consecutive_days','fulltime_required_hours') NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `breakTime` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `isServiceManager` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `isOfficeStaff` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `positionGroups` ADD `minDaysOffPerMonth` int DEFAULT 0 NOT NULL;