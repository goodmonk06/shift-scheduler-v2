/**
 * 12月の希望休データをクリアするスクリプト
 */

import { getDb } from "../server/db";
import { leaveRequests } from "../drizzle/schema";
import { and, gte, lte } from "drizzle-orm";

async function clearDecemberLeaves() {
  console.log("=== 12月の希望休データをクリア ===\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  try {
    // 12月の希望休を削除
    const result = await db
      .delete(leaveRequests)
      .where(
        and(
          gte(leaveRequests.startDate, '2024-12-01'),
          lte(leaveRequests.endDate, '2024-12-31')
        )
      );

    console.log("✅ 12月の希望休データを削除しました");

    // 確認のため再度チェック
    const remainingLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          gte(leaveRequests.startDate, '2024-12-01'),
          lte(leaveRequests.endDate, '2024-12-31')
        )
      );

    console.log(`\n📊 残っている12月の希望休: ${remainingLeaves.length}件`);

    if (remainingLeaves.length === 0) {
      console.log("✨ 12月の希望休データは完全にクリアされました");
    } else {
      console.log("⚠️ まだ削除されていないデータがあります");
    }

  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

clearDecemberLeaves().catch(console.error);