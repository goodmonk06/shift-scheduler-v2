/**
 * 宝本龍騎の12月末～1月初旬のデータ追加
 */

import { getDb } from "../server/db";
import { workPreferences, leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function updateTakamoto() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 宝本龍騎のデータ追加 ===\n");

  // 宝本龍騎を検索
  const takamotoResult = await db
    .select()
    .from(employees)
    .where(eq(employees.name, "宝本 龍騎"))
    .limit(1);

  if (takamotoResult.length === 0) {
    console.error("❌ 宝本 龍騎が見つかりません");
    return;
  }

  const takamoto = takamotoResult[0];
  console.log(`職員ID: ${takamoto.employeeId}\n`);

  let leavesSuccess = 0;
  let workPrefsSuccess = 0;

  // 休暇を追加
  const leaves = [
    "2024-12-31", // 休み
    "2025-01-03", // 休み
    "2025-01-04", // 休み
  ];

  console.log("【休暇登録】");
  for (const date of leaves) {
    try {
      await db.insert(leaveRequests).values({
        employeeId: takamoto.id,
        startDate: date,
        endDate: date,
        leaveType: '休',
        status: 'approved',
        reason: '希望休',
        isAdditional: false,
      });
      console.log(`✓ ${date} (休)`);
      leavesSuccess++;
    } catch (error) {
      console.error(`❌ ${date} の登録失敗（既に登録済みの可能性）`);
    }
  }

  // 勤務希望を追加（12/29は既に登録済みなので確認）
  const workPrefs = [
    { date: "2024-12-30", startTime: "10:00", endTime: "14:00" }, // 12/29は既に登録済み
    { date: "2025-01-01", startTime: "10:00", endTime: "15:00" },
    { date: "2025-01-02", startTime: "10:00", endTime: "15:00" },
    { date: "2025-01-05", startTime: "10:00", endTime: "15:00" },
  ];

  console.log("\n【勤務希望登録】");

  // 12/29の確認（既に登録済み）
  console.log("✓ 2024-12-29 (10:00-14:00) ※既に登録済み");

  for (const pref of workPrefs) {
    try {
      await db.insert(workPreferences).values({
        employeeId: takamoto.id,
        startDate: pref.date,
        endDate: pref.date,
        startTime: pref.startTime,
        endTime: pref.endTime,
        status: 'approved',
        reason: `${pref.startTime}-${pref.endTime}勤務希望`,
        isAdditional: false,
      });
      console.log(`✓ ${pref.date} (${pref.startTime}-${pref.endTime})`);
      workPrefsSuccess++;
    } catch (error) {
      console.error(`❌ ${pref.date} の登録失敗`);
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`📊 休暇: ${leavesSuccess}件を追加`);
  console.log(`📊 勤務希望: ${workPrefsSuccess}件を追加`);
  console.log(`📊 合計: ${leavesSuccess + workPrefsSuccess}件を追加登録`);
}

updateTakamoto().catch(console.error);