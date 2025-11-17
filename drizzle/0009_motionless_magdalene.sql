CREATE TABLE `shiftActuals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftDetailId` int NOT NULL,
	`actualStartTime` varchar(5),
	`actualEndTime` varchar(5),
	`note` text,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	`status` enum('reported','approved','rejected') NOT NULL DEFAULT 'reported',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shiftActuals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`theme` enum('default','sakura','ocean','forest','sunset') NOT NULL DEFAULT 'default',
	`headerImage` enum('flowers','nature','ocean','sakura','mountain') NOT NULL DEFAULT 'flowers',
	`fontSize` enum('small','medium','large','xlarge') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffSettings_employeeId_unique` UNIQUE(`employeeId`)
);
--> statement-breakpoint
ALTER TABLE `shifts` MODIFY COLUMN `status` enum('draft','tentative','tentative_revised','confirmed','actual','archived') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD `leaveType` enum('休','有休','時間指定') DEFAULT '休' NOT NULL;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD `startTime` varchar(5);--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD `endTime` varchar(5);--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD `isAdditional` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shifts` ADD `leaveRequestDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `shifts` ADD `additionalRequestDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `shifts` ADD `aiPrompt` text;--> statement-breakpoint
ALTER TABLE `shifts` ADD `aiResponse` json;