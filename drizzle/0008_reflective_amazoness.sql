ALTER TABLE `employees` MODIFY COLUMN `additionalConstraints` json;--> statement-breakpoint
ALTER TABLE `shifts` MODIFY COLUMN `status` enum('draft','ai_generated','tentative','tentative_revised','confirmed','actual','archived') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `requiredStaffing` ADD `staffingDetails` json;--> statement-breakpoint
ALTER TABLE `shiftDetails` ADD `leaveType` enum('休','有休','時間指定');--> statement-breakpoint
ALTER TABLE `shiftDetails` ADD `startTime` varchar(5);--> statement-breakpoint
ALTER TABLE `shiftDetails` ADD `endTime` varchar(5);--> statement-breakpoint
ALTER TABLE `shifts` ADD `parentShiftId` int;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_parentShiftId_shifts_id_fk` FOREIGN KEY (`parentShiftId`) REFERENCES `shifts`(`id`) ON DELETE set null ON UPDATE no action;