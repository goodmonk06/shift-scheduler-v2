-- Add editedInActualMode column to shiftDetails table
-- This column tracks whether a cell was edited while in "Actual Operation Shift" mode

ALTER TABLE `shiftDetails` ADD COLUMN `editedInActualMode` boolean NOT NULL DEFAULT false;
