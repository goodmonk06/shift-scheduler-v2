/**
 * 最終登録状況を確認するスクリプト
 */

import { getDb } from "../server/db";
import { leaveRequests, workPreferences, employees } from "../drizzle/schema";
import { and, gte, lte, sql } from "drizzle-orm";

async function checkFinalStatus() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 2025年12月 最終登録状況 ===\n");

  // 統計情報
  const [leaveCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(leaveRequests)
    .where(
      and(
        gte(leaveRequests.startDate, '2025-12-01'),
        lte(leaveRequests.endDate, '2026-01-05')
      )
    );

  const [workCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(workPreferences)
    .where(
      and(
        gte(workPreferences.startDate, '2025-12-01'),
        lte(workPreferences.endDate, '2026-01-05')
      )
    );

  // 職員ごとの集計
  const empData = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeId: employees.employeeId
    })
    .from(employees)
    .orderBy(employees.id);

  console.log("📊 全体統計:");
  console.log(`  休暇データ: ${leaveCount[0].count}件`);
  console.log(`  勤務希望データ: ${workCount[0].count}件`);
  console.log(`  合計: ${Number(leaveCount[0].count) + Number(workCount[0].count)}件\n`);

  console.log("📋 職員別データ数:");

  let employeesWithData = 0;

  for (const emp of empData) {
    const [leaves] = await db
      .select({ count: sql`COUNT(*)` })
      .from(leaveRequests)
      .where(
        and(
          sql`employeeId = ${emp.id}`,
          gte(leaveRequests.startDate, '2025-12-01'),
          lte(leaveRequests.endDate, '2026-01-05')
        )
      );

    const [prefs] = await db
      .select({ count: sql`COUNT(*)` })
      .from(workPreferences)
      .where(
        and(
          sql`employeeId = ${emp.id}`,
          gte(workPreferences.startDate, '2025-12-01'),
          lte(workPreferences.endDate, '2026-01-05')
        )
      );

    const lCount = Number(leaves[0].count);
    const pCount = Number(prefs[0].count);

    if (lCount > 0 || pCount > 0) {
      console.log(`  ${emp.name} (ID:${emp.employeeId}): 休暇${lCount}件, 勤務希望${pCount}件`);
      employeesWithData++;
    }
  }

  console.log(`\n✅ データ登録が完了しました`);
  console.log(`   登録のある職員: ${employeesWithData}名/${empData.length}名`);
}

checkFinalStatus().catch(console.error);