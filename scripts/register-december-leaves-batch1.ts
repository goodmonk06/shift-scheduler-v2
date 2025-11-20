/**
 * 12月～1月の希望休を登録するスクリプト（第1バッチ：1-5人目）
 */

import { getDb } from "../server/db";
import { leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface LeaveData {
  employeeName: string;
  leaves: { date: string; type: '休' | '有休' }[];
}

async function registerLeaves() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月～1月の希望休登録（第1バッチ：1-5人目） ===\n");

  // 登録データ（研修、夜勤、明けは勤務扱いなので除外）
  const leaveData: LeaveData[] = [
    // 1. 髙野 幹成 - 希望休なし
    {
      employeeName: "髙野 幹成",
      leaves: []
    },
    // 2. 山口 夕香里 - 12/7のみ（研修は勤務なので除外）
    {
      employeeName: "山口 夕香里",
      leaves: [
        { date: "2024-12-07", type: "休" },
      ]
    },
    // 3. 馬渕 尊至 - 希望休なし
    {
      employeeName: "馬渕 尊至",
      leaves: []
    },
    // 4. 松嵜 愛梨
    {
      employeeName: "松嵜 愛梨",
      leaves: [
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-27", type: "有休" }, // 冬季休暇
        // 12/31(夜), 1/1(明)は夜勤・明けなので除外
        { date: "2025-01-02", type: "休" },
      ]
    },
    // 5. 杉山 美佳子
    {
      employeeName: "杉山 美佳子",
      leaves: [
        { date: "2024-12-05", type: "休" },
        { date: "2024-12-12", type: "休" },
        { date: "2024-12-13", type: "有休" }, // 冬季休暇
        { date: "2024-12-19", type: "休" },
        { date: "2024-12-26", type: "休" },
        // 1/1(夜), 1/2(明)は夜勤・明けなので除外
        { date: "2025-01-03", type: "休" },
      ]
    },
  ];

  let totalRegistered = 0;
  let totalFailed = 0;

  for (const data of leaveData) {
    console.log(`\n👤 ${data.employeeName}`);

    if (data.leaves.length === 0) {
      console.log("   - 希望休なし");
      continue;
    }

    try {
      // 職員を名前で検索
      const employeeResult = await db
        .select()
        .from(employees)
        .where(eq(employees.name, data.employeeName))
        .limit(1);

      if (employeeResult.length === 0) {
        console.error(`   ❌ 職員 "${data.employeeName}" が見つかりません`);
        totalFailed += data.leaves.length;
        continue;
      }

      const employee = employeeResult[0];
      console.log(`   職員ID: ${employee.employeeId}`);

      // 各希望休を登録
      for (const leave of data.leaves) {
        try {
          await db.insert(leaveRequests).values({
            employeeId: employee.id,
            startDate: leave.date,
            endDate: leave.date,
            leaveType: leave.type,
            status: 'approved',
            reason: leave.type === '有休' ? '冬季休暇' : '12月希望休',
            isAdditional: false,
          });
          console.log(`   ✓ ${leave.date} (${leave.type}) を登録`);
          totalRegistered++;
        } catch (error) {
          console.error(`   ❌ ${leave.date} の登録に失敗:`, error);
          totalFailed++;
        }
      }
    } catch (error) {
      console.error(`   ❌ ${data.employeeName} の処理中にエラー:`, error);
      totalFailed += data.leaves.length;
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`✅ 登録成功: ${totalRegistered}件`);
  if (totalFailed > 0) {
    console.log(`❌ 登録失敗: ${totalFailed}件`);
  }
  console.log(`📊 合計: ${totalRegistered + totalFailed}件`);
}

registerLeaves().catch(console.error);