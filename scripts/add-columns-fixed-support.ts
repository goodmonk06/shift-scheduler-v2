/**
 * 固定データサポート用のカラム追加スクリプト
 * まずカラムを追加してからデータ更新を行う
 */

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function addColumnsForFixedSupport() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== カラム追加スクリプト開始 ===\n");

  try {
    // 1. shiftDetailsテーブルにカラム追加（一つずつ試行）
    console.log("1. shiftDetailsテーブルのカラム追加...");

    // isFixedカラム
    try {
      await db.execute(sql`
        ALTER TABLE shiftDetails
        ADD COLUMN isFixed BOOLEAN DEFAULT FALSE NOT NULL COMMENT '固定データフラグ'
      `);
      console.log("   ✅ isFixedカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ isFixedカラムは既に存在");
      } else {
        console.log("   ❌ isFixedカラム追加エラー:", error?.message);
      }
    }

    // sourceTypeカラム
    try {
      await db.execute(sql`
        ALTER TABLE shiftDetails
        ADD COLUMN sourceType VARCHAR(50) COMMENT 'データソース'
      `);
      console.log("   ✅ sourceTypeカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ sourceTypeカラムは既に存在");
      } else {
        console.log("   ❌ sourceTypeカラム追加エラー:", error?.message);
      }
    }

    // sourceIdカラム
    try {
      await db.execute(sql`
        ALTER TABLE shiftDetails
        ADD COLUMN sourceId INT COMMENT 'ソースデータのID'
      `);
      console.log("   ✅ sourceIdカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ sourceIdカラムは既に存在");
      } else {
        console.log("   ❌ sourceIdカラム追加エラー:", error?.message);
      }
    }

    // 2. workPreferencesテーブルのカラム追加
    console.log("\n2. workPreferencesテーブルのカラム追加...");

    // preferenceTypeカラム
    try {
      await db.execute(sql`
        ALTER TABLE workPreferences
        ADD COLUMN preferenceType ENUM('time_specified', 'night_shift', 'post_night', 'training', 'other')
            DEFAULT 'time_specified' NOT NULL COMMENT '勤務希望タイプ'
      `);
      console.log("   ✅ preferenceTypeカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ preferenceTypeカラムは既に存在");
      } else {
        console.log("   ❌ preferenceTypeカラム追加エラー:", error?.message);
      }
    }

    // isCountAsStaffカラム
    try {
      await db.execute(sql`
        ALTER TABLE workPreferences
        ADD COLUMN isCountAsStaff BOOLEAN DEFAULT TRUE NOT NULL COMMENT '勤務人数カウント'
      `);
      console.log("   ✅ isCountAsStaffカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ isCountAsStaffカラムは既に存在");
      } else {
        console.log("   ❌ isCountAsStaffカラム追加エラー:", error?.message);
      }
    }

    // displayIconカラム
    try {
      await db.execute(sql`
        ALTER TABLE workPreferences
        ADD COLUMN displayIcon VARCHAR(10) COMMENT '表示用アイコン'
      `);
      console.log("   ✅ displayIconカラム追加完了");
    } catch (error: any) {
      if (error?.code === 'ER_DUP_FIELDNAME') {
        console.log("   ⚠️ displayIconカラムは既に存在");
      } else {
        console.log("   ❌ displayIconカラム追加エラー:", error?.message);
      }
    }

    // 3. テーブル構造の確認
    console.log("\n3. テーブル構造の確認...");

    // shiftDetailsテーブルのカラム確認
    const shiftDetailsCols = await db.execute(sql`
      SHOW COLUMNS FROM shiftDetails
      WHERE Field IN ('isFixed', 'sourceType', 'sourceId')
    `);

    console.log("\n   shiftDetailsテーブル:");
    for (const col of shiftDetailsCols.rows as any[]) {
      console.log(`     - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    }

    // workPreferencesテーブルのカラム確認
    const workPrefsCols = await db.execute(sql`
      SHOW COLUMNS FROM workPreferences
      WHERE Field IN ('preferenceType', 'isCountAsStaff', 'displayIcon')
    `);

    console.log("\n   workPreferencesテーブル:");
    for (const col of workPrefsCols.rows as any[]) {
      console.log(`     - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    }

    console.log("\n✅ カラム追加処理完了");
    console.log("\n次のステップ: migrate-fixed-data-support.ts を実行してデータを更新してください");

  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  }
}

// スクリプト実行
addColumnsForFixedSupport().catch(console.error);