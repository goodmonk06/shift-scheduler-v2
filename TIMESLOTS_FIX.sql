-- 職場ルールに基づいて勤務時間枠を正しく設定するSQL
--
-- 職場ルール「4. 基本的な勤務時間」より:
-- - 夜勤: 16時～翌日9時（必要人数: 1名）
-- - 早番: 6時～15時（必要人数: 2名）
-- - 日勤A: 8時～17時（必要人数: 3名）
-- - 日勤B: 9時～18時（必要人数: 3名）
-- - 遅番: 11時～20時（必要人数: 2名）

-- ステップ1: 既存データを削除
DELETE FROM workTimeSlots;

-- ステップ2: 正しいデータを登録
INSERT INTO workTimeSlots (name, displayLabel, startTime, endTime, isNightShift, requiredStaff, createdAt, updatedAt)
VALUES
  ('夜勤', '夜', '16:00', '09:00', TRUE, 1, NOW(), NOW()),
  ('早番', '早', '06:00', '15:00', FALSE, 2, NOW(), NOW()),
  ('日勤A', '日A', '08:00', '17:00', FALSE, 3, NOW(), NOW()),
  ('日勤B', '日B', '09:00', '18:00', FALSE, 3, NOW(), NOW()),
  ('遅番', '遅', '11:00', '20:00', FALSE, 2, NOW(), NOW());

-- ステップ3: 確認
SELECT * FROM workTimeSlots ORDER BY id;
