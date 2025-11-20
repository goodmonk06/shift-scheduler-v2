/**
 * 固定データサポートのためのマイグレーションスクリプト
 * 承認済み希望休・勤務希望を固定データとして扱うための改修
 */

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateFixedDataSupport() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 固定データサポートマイグレーション開始 ===\n");

  try {
    // 1. shiftDetailsテーブルにカラム追加
    console.log("1. shiftDetailsテーブルの更新...");
    try {
      await db.execute(sql`
        ALTER TABLE shiftDetails
        ADD COLUMN IF NOT EXISTS isFixed BOOLEAN DEFAULT FALSE NOT NULL COMMENT '固定データフラグ',
        ADD COLUMN IF NOT EXISTS sourceType VARCHAR(50) COMMENT 'データソース',
        ADD COLUMN IF NOT EXISTS sourceId INT COMMENT 'ソースデータのID'
      `);
      console.log("   ✅ カラム追加完了");
    } catch (error) {
      console.log("   ⚠️ カラムは既に存在するか、追加をスキップ");
    }

    // 2. 既存データの更新
    console.log("\n2. 既存データの更新...");

    // leave_request由来のデータを固定化
    const result1 = await db.execute(sql`
      UPDATE shiftDetails
      SET isFixed = TRUE, sourceType = 'leave_request'
      WHERE generatedBy = 'leave_request'
    `);
    console.log(`   ✅ 希望休由来: ${result1.rowsAffected}件を固定化`);

    // work_preference由来のデータを固定化
    const result2 = await db.execute(sql`
      UPDATE shiftDetails
      SET isFixed = TRUE, sourceType = 'work_preference'
      WHERE generatedBy = 'rule_based'
        AND startTime IS NOT NULL
        AND endTime IS NOT NULL
    `);
    console.log(`   ✅ 勤務希望由来: ${result2.rowsAffected}件を固定化`);

    // 3. workPreferencesテーブルの更新
    console.log("\n3. workPreferencesテーブルの更新...");
    try {
      await db.execute(sql`
        ALTER TABLE workPreferences
        ADD COLUMN IF NOT EXISTS preferenceType ENUM('time_specified', 'night_shift', 'post_night', 'training', 'other')
            DEFAULT 'time_specified' NOT NULL COMMENT '勤務希望タイプ',
        ADD COLUMN IF NOT EXISTS isCountAsStaff BOOLEAN DEFAULT TRUE NOT NULL COMMENT '勤務人数カウント',
        ADD COLUMN IF NOT EXISTS displayIcon VARCHAR(10) COMMENT '表示用アイコン'
      `);
      console.log("   ✅ カラム追加完了");
    } catch (error) {
      console.log("   ⚠️ カラムは既に存在するか、追加をスキップ");
    }

    // 4. 勤務希望タイプの自動判定
    console.log("\n4. 勤務希望タイプの自動判定...");

    // 夜勤の判定
    const nightShifts = await db.execute(sql`
      UPDATE workPreferences
      SET preferenceType = 'night_shift'
      WHERE startTime = '16:00' AND endTime = '10:00'
        AND (preferenceType IS NULL OR preferenceType = 'time_specified')
    `);
    console.log(`   ✅ 夜勤: ${nightShifts.rowsAffected}件を更新`);

    // 明けの判定
    const postNight = await db.execute(sql`
      UPDATE workPreferences
      SET preferenceType = 'post_night'
      WHERE reason LIKE '%明け%'
        AND (preferenceType IS NULL OR preferenceType = 'time_specified')
    `);
    console.log(`   ✅ 夜勤明け: ${postNight.rowsAffected}件を更新`);

    // 研修の判定
    const training = await db.execute(sql`
      UPDATE workPreferences
      SET preferenceType = 'training',
          isCountAsStaff = FALSE,
          displayIcon = '！'
      WHERE (reason LIKE '%研修%' OR reason LIKE '%PM研修%' OR reason LIKE '%研修1日%')
        AND (preferenceType IS NULL OR preferenceType = 'time_specified')
    `);
    console.log(`   ✅ 研修: ${training.rowsAffected}件を更新`);

    // 5. インデックスの作成
    console.log("\n5. インデックスの作成...");
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_shiftDetails_isFixed ON shiftDetails(isFixed)",
      "CREATE INDEX IF NOT EXISTS idx_shiftDetails_sourceType ON shiftDetails(sourceType)",
      "CREATE INDEX IF NOT EXISTS idx_workPreferences_preferenceType ON workPreferences(preferenceType)",
      "CREATE INDEX IF NOT EXISTS idx_workPreferences_status ON workPreferences(status)",
      "CREATE INDEX IF NOT EXISTS idx_leaveRequests_status ON leaveRequests(status)"
    ];

    for (const indexSql of indexes) {
      try {
        await db.execute(sql.raw(indexSql));
        console.log(`   ✅ インデックス作成: ${indexSql.match(/idx_\w+/)?.[0]}`);
      } catch (error) {
        console.log(`   ⚠️ インデックス既存: ${indexSql.match(/idx_\w+/)?.[0]}`);
      }
    }

    // 6. 統計情報の表示
    console.log("\n=== マイグレーション完了 ===");

    // 固定データの統計
    const fixedStats = await db.execute(sql`
      SELECT
        sourceType,
        COUNT(*) as count
      FROM shiftDetails
      WHERE isFixed = TRUE
      GROUP BY sourceType
    `);

    console.log("\n📊 固定データ統計:");
    for (const row of fixedStats.rows as any[]) {
      console.log(`   - ${row.sourceType}: ${row.count}件`);
    }

    // 勤務希望タイプの統計
    const prefStats = await db.execute(sql`
      SELECT
        preferenceType,
        COUNT(*) as count
      FROM workPreferences
      WHERE status = 'approved'
      GROUP BY preferenceType
    `);

    console.log("\n📊 勤務希望タイプ統計:");
    for (const row of prefStats.rows as any[]) {
      console.log(`   - ${row.preferenceType}: ${row.count}件`);
    }

    // 研修データの確認
    const trainingData = await db.execute(sql`
      SELECT
        e.name as employeeName,
        wp.startDate,
        wp.endDate,
        wp.startTime,
        wp.endTime,
        wp.reason
      FROM workPreferences wp
      JOIN employees e ON wp.employeeId = e.id
      WHERE wp.preferenceType = 'training'
      ORDER BY wp.startDate
    `);

    if (trainingData.rows.length > 0) {
      console.log("\n📋 研修データ:");
      for (const row of trainingData.rows as any[]) {
        console.log(`   - ${row.employeeName}: ${row.startDate} ${row.startTime}-${row.endTime} (${row.reason})`);
      }
    }

    console.log("\n✅ すべてのマイグレーションが完了しました");

  } catch (error) {
    console.error("❌ マイグレーション中にエラーが発生しました:", error);
  }
}

// スクリプト実行
migrateFixedDataSupport().catch(console.error);