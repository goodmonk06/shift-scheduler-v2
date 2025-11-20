/**
 * 髙野 幹成の夜勤追加と大堀SHIRLEY TANの希望休登録
 */

import { getDb } from "../server/db";
import { workPreferences, leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function updateTakanoAndOhori() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 髙野・大堀のデータ更新 ===\n");

  try {
    // 1. 髙野 幹成の夜勤を追加
    console.log("👤 髙野 幹成");
    const takanoResult = await db
      .select()
      .from(employees)
      .where(eq(employees.name, "髙野 幹成"))
      .limit(1);

    if (takanoResult.length > 0) {
      const takano = takanoResult[0];
      console.log(`   職員ID: ${takano.employeeId}`);

      // 12/11夜勤を追加
      try {
        await db.insert(workPreferences).values({
          employeeId: takano.id,
          startDate: "2024-12-11",
          endDate: "2024-12-11",
          startTime: "16:00",
          endTime: "10:00",
          status: 'approved',
          reason: '夜勤',
          isAdditional: false,
        });
        console.log("   ✓ 2024-12-11 (夜勤) を登録");
      } catch (error) {
        console.error("   ❌ 12/11夜勤の登録失敗:", error);
      }

      // 12/24夜勤を追加
      try {
        await db.insert(workPreferences).values({
          employeeId: takano.id,
          startDate: "2024-12-24",
          endDate: "2024-12-24",
          startTime: "16:00",
          endTime: "10:00",
          status: 'approved',
          reason: '夜勤',
          isAdditional: false,
        });
        console.log("   ✓ 2024-12-24 (夜勤) を登録");
      } catch (error) {
        console.error("   ❌ 12/24夜勤の登録失敗:", error);
      }
    } else {
      console.error("   ❌ 髙野 幹成が見つかりません");
    }

    console.log("\n=== 更新完了 ===");
    console.log("📝 大堀SHIRLEY TANのデータは完全なリストを受け取り次第登録します");
    console.log("   現在判明分: 12/1(休み), 12/2〜（続きが必要）");

  } catch (error) {
    console.error("エラー:", error);
  }
}

// 大堀SHIRLEY TANのデータを登録する関数（後で使用）
export async function registerOhoriData(dates: string[]) {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("\n👤 大堀SHIRLEY TAN");

  const ohoriResult = await db
    .select()
    .from(employees)
    .where(eq(employees.name, "大堀SHIRLEY TAN"))
    .limit(1);

  if (ohoriResult.length === 0) {
    console.error("   ❌ 大堀SHIRLEY TANが見つかりません");
    return;
  }

  const ohori = ohoriResult[0];
  console.log(`   職員ID: ${ohori.employeeId}`);

  let successCount = 0;
  for (const date of dates) {
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
      console.log(`   ✓ ${date} (休) を登録`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ ${date} の登録失敗`);
    }
  }

  console.log(`\n✅ 大堀SHIRLEY TAN: ${successCount}件の休暇を登録`);
}

updateTakanoAndOhori().catch(console.error);