/**
 * 岩崎・大堀・関田の追加希望休を登録
 */

import { getDb } from "../server/db";
import { leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function addAdditionalLeaves() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 追加希望休の登録 ===\n");

  const updates = [
    {
      name: "岩崎 亜友美",
      leaves: ["2024-12-05", "2024-12-24"]
    },
    {
      name: "大堀SHIRLEY TAN",
      leaves: ["2024-12-18"]
    },
    {
      name: "関田 あゆみ",
      leaves: ["2024-12-16"]
    }
  ];

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const update of updates) {
    console.log(`👤 ${update.name}`);

    // 職員を検索
    const employeeResult = await db
      .select()
      .from(employees)
      .where(eq(employees.name, update.name))
      .limit(1);

    if (employeeResult.length === 0) {
      console.error(`   ❌ ${update.name}が見つかりません`);
      totalFailed += update.leaves.length;
      continue;
    }

    const employee = employeeResult[0];
    console.log(`   職員ID: ${employee.employeeId}`);

    // 休暇を登録
    for (const date of update.leaves) {
      try {
        await db.insert(leaveRequests).values({
          employeeId: employee.id,
          startDate: date,
          endDate: date,
          leaveType: '休',
          status: 'approved',
          reason: '希望休（追加）',
          isAdditional: false,
        });
        console.log(`   ✓ ${date} (休) を追加`);
        totalSuccess++;
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Duplicate')) {
          console.log(`   ⚠️ ${date} は既に登録済み`);
        } else {
          console.error(`   ❌ ${date} の登録失敗:`, error?.message);
          totalFailed++;
        }
      }
    }
    console.log();
  }

  console.log("=== 登録完了 ===");
  console.log(`✅ 成功: ${totalSuccess}件`);
  if (totalFailed > 0) {
    console.log(`❌ 失敗: ${totalFailed}件`);
  }
  console.log(`📊 合計: ${totalSuccess + totalFailed}件処理`);
}

addAdditionalLeaves().catch(console.error);