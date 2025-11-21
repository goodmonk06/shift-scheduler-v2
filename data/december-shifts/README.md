# 12月シフト外部データ保存場所

このフォルダは、外部で作成した12月シフトデータを保存するための専用ディレクトリです。

## データ形式

### シフトデータ (december-2025.json)

```json
{
  "year": 2025,
  "month": 12,
  "shifts": [
    {
      "employeeId": 1,
      "employeeName": "山田太郎",
      "date": "2025-12-01",
      "shiftType": "早番",
      "startTime": "07:00",
      "endTime": "16:00",
      "isHoliday": false
    }
  ]
}
```

### フィールド説明

- **employeeId**: 職員ID（数値）
- **employeeName**: 職員名
- **date**: 日付（YYYY-MM-DD形式）
- **shiftType**: シフト種別（例: 早番、日勤A、日勤B、遅番、夜勤入、夜勤明、休み、有休）
- **startTime**: 開始時刻（HH:MM形式）
- **endTime**: 終了時刻（HH:MM形式）
- **isHoliday**: 休暇フラグ（true/false）

## 使い方

1. 外部で作成したシフトデータを `december-2025.json` として保存
2. APIエンドポイント `/api/external-shifts/december` でデータを取得
3. フロントエンドでシフト表示

## 注意事項

- このデータは既存のデータベースとは連携しません
- 今回限りの利用を想定しています
- データの整合性チェックは行われません
