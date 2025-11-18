-- Migration: Remove "時間指定" from leaveRequests and shiftDetails
-- Time-specific work preferences are now stored in the workPreferences table

-- Step 1: Update leaveRequests table
-- Remove "時間指定" from leaveType enum
ALTER TABLE `leaveRequests`
MODIFY COLUMN `leaveType` enum('休','有休') NOT NULL DEFAULT '休';

-- Remove time-related columns (no longer needed for leave requests)
ALTER TABLE `leaveRequests` DROP COLUMN IF EXISTS `startTime`;
ALTER TABLE `leaveRequests` DROP COLUMN IF EXISTS `endTime`;

-- Step 2: Update shiftDetails table
-- Remove "時間指定" from leaveType enum
-- Note: startTime and endTime remain in shiftDetails for custom work hours
ALTER TABLE `shiftDetails`
MODIFY COLUMN `leaveType` enum('休','有休');
