-- Add breakTimeRule column to employees table
-- 休憩時間ルール（固定/条件付き/なし）を柔軟に保存するためのJSONフィールド
-- 例: {"type": "fixed", "duration": 1} - 固定60分
-- 例: {"type": "conditional", "threshold": 6, "conditionDuration": 1} - 6時間以上で60分
-- 例: {"type": "none"} - 休憩なし
ALTER TABLE `employees` ADD COLUMN `breakTimeRule` json COMMENT '休憩時間ルール（固定/条件付き/なし）';
