-- Migration: Create workPreferences table for work time preferences
-- This table stores employee requests for specific work hours (e.g., "can only work 9:00-13:00")
-- Different from leave requests which represent days off

CREATE TABLE `workPreferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `employeeId` int NOT NULL,
  `shiftId` int,
  `requestDate` varchar(10),
  `startDate` varchar(10) NOT NULL,
  `endDate` varchar(10) NOT NULL,
  `startTime` varchar(5) NOT NULL,
  `endTime` varchar(5) NOT NULL,
  `isAdditional` boolean NOT NULL DEFAULT false,
  `reason` text,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `submittedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `workPreferences_id` PRIMARY KEY(`id`)
);

ALTER TABLE `workPreferences`
ADD CONSTRAINT `workPreferences_employeeId_employees_id_fk`
FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;

ALTER TABLE `workPreferences`
ADD CONSTRAINT `workPreferences_shiftId_shifts_id_fk`
FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE set null ON UPDATE no action;
