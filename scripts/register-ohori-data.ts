/**
 * 大堀SHIRLEY TANの希望休・勤務希望を登録
 */

import { getDb } from "../server/db";
import { workPreferences, leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function registerOhoriData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 大堀SHIRLEY TANのデータ登録 ===\n");

  // 大堀SHIRLEY TANを検索
  const ohoriResult = await db
    .select()
    .from(employees)
    .where(eq(employees.name, "大堀SHIRLEY TAN"))
    .limit(1);

  if (ohoriResult.length === 0) {
    console.error("❌ 大堀SHIRLEY TANが見つかりません");
    return;
  }

  const ohori = ohoriResult[0];
  console.log(`職員ID: ${ohori.employeeId}\n`);

  // 休暇データ
  const leaves = [
    "2024-12-01", // 休み
    "2024-12-06", // 休み
    "2024-12-07", // 休み
    "2024-12-13", // 休み
    "2024-12-14", // 休み
    "2024-12-19", // 休み
    "2024-12-20", // 休み
    "2024-12-21", // 休み
    "2024-12-24", // 休み
    "2024-12-27", // 休み
    "2024-12-28", // 休み
    "2024-12-31", // 休み
    "2025-01-01", // 休み
    "2025-01-02", // 休み
    "2025-01-03", // 休み
    "2025-01-04", // 休み
  ];

  // 勤務希望データ
  const workPrefs = [
    { date: "2024-12-02", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-03", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-04", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-05", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-08", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-09", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-10", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-11", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-12", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-15", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-16", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-17", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-18", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-22", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-23", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-25", startTime: "09:00", endTime: "17:00" }, // 17時まで
    { date: "2024-12-26", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-29", startTime: "09:00", endTime: "18:00" },
    { date: "2024-12-30", startTime: "09:00", endTime: "14:00" }, // 14時まで
    { date: "2025-01-05", startTime: "09:00", endTime: "18:00" },
  ];

  let leavesSuccess = 0;
  let workPrefsSuccess = 0;

  // 休暇を登録
  console.log("【休暇登録】");
  for (const date of leaves) {
    try {
      await db.insert(leaveRequests).values({
        employeeId: ohori.id,
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
      console.error(`❌ ${date} の登録失敗`);
    }
  }

  // 勤務希望を登録
  console.log("\n【勤務希望登録】");
  for (const pref of workPrefs) {
    try {
      await db.insert(workPreferences).values({
        employeeId: ohori.id,
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
  console.log(`📊 休暇: ${leavesSuccess}件`);
  console.log(`📊 勤務希望: ${workPrefsSuccess}件`);
  console.log(`📊 合計: ${leavesSuccess + workPrefsSuccess}件を登録`);
}

registerOhoriData().catch(console.error);