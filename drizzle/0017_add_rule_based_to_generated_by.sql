-- Add 'rule_based' to generatedBy enum for shifts table
ALTER TABLE `shifts` MODIFY COLUMN `generatedBy` ENUM('manual', 'ai', 'rule_based') NOT NULL DEFAULT 'manual';

-- Add 'rule_based' to generatedBy enum for shiftDetails table
ALTER TABLE `shiftDetails` MODIFY COLUMN `generatedBy` ENUM('manual', 'ai', 'leave_request', 'rule_based') NOT NULL DEFAULT 'manual';
