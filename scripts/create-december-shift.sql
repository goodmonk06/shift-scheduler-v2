-- 2024年12月のテストシフト作成
INSERT INTO shifts (
  year,
  month,
  name,
  status,
  generatedBy,
  leaveRequestDeadline,
  additionalRequestDeadline,
  createdAt,
  updatedAt
) VALUES (
  2024,
  12,
  '2024年12月シフト（改善版テスト）',
  'vacation_only',
  'manual',
  '2024-11-20',
  '2024-12-10',
  NOW(),
  NOW()
);

SELECT * FROM shifts WHERE year = 2024 AND month = 12;