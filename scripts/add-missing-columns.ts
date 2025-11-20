/**
 * データベースに不足しているカラムを追加
 */

import { getDb } from "../server/db";

async function addMissingColumns() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 不足しているカラムを追加 ===\n");

  // カラムが存在するかチェック
  async function columnExists(tableName: string, columnName: string): Promise<boolean> {
    const result: any = await db.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      AND COLUMN_NAME = '${columnName}'
      AND TABLE_SCHEMA = DATABASE()
    `);
    return result[0][0].count > 0;
  }

  try {
    // 1. shiftDetailsテーブルにカラムを追加
    console.log("1. shiftDetailsテーブルにカラムを追加...");

    // isFixed カラムを追加
    if (!await columnExists('shiftDetails', 'isFixed')) {
      await db.execute(`
        ALTER TABLE shiftDetails
        ADD COLUMN isFixed BOOLEAN DEFAULT FALSE NOT NULL
      `);
      console.log("   ✅ isFixed カラムを追加");
    } else {
      console.log("   ⏭ isFixed カラムは既に存在");
    }

    // sourceType カラムを追加
    if (!await columnExists('shiftDetails', 'sourceType')) {
      await db.execute(`
        ALTER TABLE shiftDetails
        ADD COLUMN sourceType VARCHAR(50) NULL
      `);
      console.log("   ✅ sourceType カラムを追加");
    } else {
      console.log("   ⏭ sourceType カラムは既に存在");
    }

    // sourceId カラムを追加
    if (!await columnExists('shiftDetails', 'sourceId')) {
      await db.execute(`
        ALTER TABLE shiftDetails
        ADD COLUMN sourceId INT NULL
      `);
      console.log("   ✅ sourceId カラムを追加");
    } else {
      console.log("   ⏭ sourceId カラムは既に存在");
    }

    // 2. workPreferencesテーブルにカラムを追加
    console.log("\n2. workPreferencesテーブルにカラムを追加...");

    // preferenceType カラムを追加
    if (!await columnExists('workPreferences', 'preferenceType')) {
      await db.execute(`
        ALTER TABLE workPreferences
        ADD COLUMN preferenceType ENUM('time_specified', 'night_shift', 'post_night', 'training', 'other') DEFAULT 'time_specified'
      `);
      console.log("   ✅ preferenceType カラムを追加");
    } else {
      console.log("   ⏭ preferenceType カラムは既に存在");
    }

    // isCountAsStaff カラムを追加
    if (!await columnExists('workPreferences', 'isCountAsStaff')) {
      await db.execute(`
        ALTER TABLE workPreferences
        ADD COLUMN isCountAsStaff BOOLEAN DEFAULT TRUE NOT NULL
      `);
      console.log("   ✅ isCountAsStaff カラムを追加");
    } else {
      console.log("   ⏭ isCountAsStaff カラムは既に存在");
    }

    // displayIcon カラムを追加
    if (!await columnExists('workPreferences', 'displayIcon')) {
      await db.execute(`
        ALTER TABLE workPreferences
        ADD COLUMN displayIcon VARCHAR(10) NULL
      `);
      console.log("   ✅ displayIcon カラムを追加");
    } else {
      console.log("   ⏭ displayIcon カラムは既に存在");
    }

    // 3. leaveRequestsテーブルのleaveTypeカラムを更新
    console.log("\n3. leaveRequestsテーブルのleaveTypeカラムを更新...");

    // カラムの定義を変更（ENUMに冬と夏を追加）
    // 既存のデータを確認
    const leaveTypes: any = await db.execute(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'leaveRequests'
      AND COLUMN_NAME = 'leaveType'
      AND TABLE_SCHEMA = DATABASE()
    `);

    const currentTypes = leaveTypes[0][0].COLUMN_TYPE;
    if (!currentTypes.includes('冬') || !currentTypes.includes('夏')) {
      await db.execute(`
        ALTER TABLE leaveRequests
        MODIFY COLUMN leaveType ENUM('休', '有休', '夏', '冬') NOT NULL DEFAULT '休'
      `);
      console.log("   ✅ leaveType カラムに '夏' と '冬' を追加");
    } else {
      console.log("   ⏭ leaveType カラムは既に更新済み");
    }

    console.log("\n✅ すべてのカラムを追加完了");

  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    if (error instanceof Error) {
      console.error("メッセージ:", error.message);
    }
  }
}

// 実行
addMissingColumns().catch(console.error);