/**
 * 12月の古いデータを削除して最新のものだけにする
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, shifts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function cleanAndReloadDecemberData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月データのクリーンアップ ===\n");

  try {
    // 1. 12月のシフトIDを取得
    const decemberShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.year, 2024),
          eq(shifts.month, 12)
        )
      );

    if (decemberShifts.length === 0) {
      console.error("❌ 12月のシフトが見つかりません");
      return;
    }

    const shiftId = decemberShifts[0].id;
    console.log(`📌 対象シフトID: ${shiftId}\n`);

    // 2. 既存の希望休をすべて削除
    console.log("1. 既存の希望休を削除...");
    const deletedLeaves = await db
      .delete(leaveRequests)
      .where(eq(leaveRequests.shiftId, shiftId));
    console.log(`   ✅ ${deletedLeaves.affectedRows}件削除`);

    // 3. 既存の勤務希望をすべて削除
    console.log("2. 既存の勤務希望を削除...");
    const deletedPrefs = await db
      .delete(workPreferences)
      .where(eq(workPreferences.shiftId, shiftId));
    console.log(`   ✅ ${deletedPrefs.affectedRows}件削除`);

    // 4. 最新のデータを登録（ユーザーが送った最新のもののみ）
    console.log("\n3. 最新のデータを登録...");

    // 注: ここに最新のデータを入れる必要があります
    // register-all-december-data.tsなどから最新のデータをコピー

    console.log("\n✅ クリーンアップ完了");
    console.log("次のステップ: register-all-december-data.tsを実行して最新データを登録してください");

  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
  }
}

// 実行
cleanAndReloadDecemberData().catch(console.error);