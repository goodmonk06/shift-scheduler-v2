ALTER TABLE `shifts` MODIFY COLUMN `status` enum('draft','ai_generated','tentative','tentative_revised','confirmed','actual','archived') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `shifts` ADD `parentShiftId` int;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_parentShiftId_shifts_id_fk` FOREIGN KEY (`parentShiftId`) REFERENCES `shifts`(`id`) ON DELETE set null ON UPDATE no action;
