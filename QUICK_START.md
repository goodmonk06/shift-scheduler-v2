# クイックスタートガイド - 段階的シフト生成

## データベースアクセスが可能な場合

### 1. 個別制約を登録（1回のみ実行）

```bash
pnpm tsx -r dotenv/config scripts/register-employee-constraints.ts
```

### 2. 12月の希望休を登録（1回のみ実行）

```bash
pnpm tsx -r dotenv/config scripts/register-december-leaves.ts
```

### 3. 12月シフトを生成・テスト

```bash
pnpm tsx -r dotenv/config scripts/test-december-generation.ts
```

## データベースアクセスができない場合

現在、以下のエラーが発生しています:

```
Error: Access denied for user 'avnadmin'@'116.12.3.188' (using password: YES)
```

### 原因

Aiven MySQLのファイアウォール設定で、接続元IP（116.12.3.188）が許可されていない可能性があります。

### 対処方法

1. **Aivenコンソールにアクセス**
   - https://console.aiven.io/ にログイン
   - shift-scheduler プロジェクトを選択

2. **IPアドレスを許可リストに追加**
   - サービス設定 → Networking
   - Allowed IP addresses に `116.12.3.188` を追加
   - または `0.0.0.0/0` で全IPを許可（開発時のみ推奨）

3. **再度実行**
   ```bash
   pnpm tsx -r dotenv/config scripts/register-employee-constraints.ts
   ```

## 実装された主要な変更点

### 1. 個別制約対応（employeeAvailability.ts）

- `AdditionalConstraints` インターフェース追加
- `WeeklyFixedPattern` インターフェース追加
- `isJapaneseHoliday()` 関数追加
- `getEmployeeAvailability()` を大幅拡張

### 2. Step 0 追加（phaseBasedShiftGenerator.ts）

Phase 3のルールベース配置に、パートタイム固定シフトの最優先配置を追加:

- weeklyFixed の must_work パターン
- workPreferences の勤務希望

### 3. スクリプト追加

- `register-employee-constraints.ts`: 個別制約登録
- `register-december-leaves.ts`: 希望休登録
- `test-december-generation.ts`: シフト生成テスト

## 検証ポイント

以下の職員の個別条件が正しく反映されることを確認:

1. **足立洋子**: 月曜9-16時、木曜8-16時のみ
2. **桂川美幸**: 月水金日18-20時のみ
3. **加藤広大**: 水土11-20時、火曜休み
4. **関田あゆみ**: 土日祝休み、曜日別時間指定
5. **平井英子**: 水金10-16時のみ
6. **伊藤美穂**: 火木土11:30-17時のみ

## 次のステップ

データベース接続が確立できたら:

1. 個別制約を登録
2. 希望休を登録
3. テストスクリプトで検証
4. 実際のシフトデータをデータベースに保存
5. フロントエンドでの表示を確認

## サポート

詳細なドキュメント: `PHASE_BASED_IMPLEMENTATION.md`
