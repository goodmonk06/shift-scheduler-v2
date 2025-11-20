/**
 * 希望休を登録するスクリプト
 * 職員名と希望休の日付を登録します
 */

import { getDb } from "../server/db";
import { leaveRequests, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 登録する希望休データの型
interface LeaveRequestData {
  employeeName: string;
  dates: string[];  // 日付のリスト（例: ['2024-12-01', '2024-12-07']）
  leaveType?: '休' | '有休';  // デフォルトは '休'
}

/**
 * 希望休を登録する関数
 */
async function registerLeaveRequests(requestsData: LeaveRequestData[]) {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 希望休の登録開始 ===\n");

  let totalRegistered = 0;
  let totalFailed = 0;

  for (const data of requestsData) {
    console.log(`\n👤 ${data.employeeName} の希望休を登録中...`);

    try {
      // 職員を名前で検索
      const employeeResult = await db
        .select()
        .from(employees)
        .where(eq(employees.name, data.employeeName))
        .limit(1);

      if (employeeResult.length === 0) {
        console.error(`   ❌ 職員 "${data.employeeName}" が見つかりません`);
        totalFailed += data.dates.length;
        continue;
      }

      const employee = employeeResult[0];
      console.log(`   ✓ 職員ID: ${employee.employeeId}`);

      // 各日付について希望休を登録
      for (const date of data.dates) {
        try {
          await db.insert(leaveRequests).values({
            employeeId: employee.id,
            startDate: date,
            endDate: date,
            leaveType: data.leaveType || '休',
            status: 'approved',  // 自動承認
            reason: '12月希望休',
            isAdditional: false,
          });
          console.log(`   ✓ ${date} (${data.leaveType || '休'}) を登録`);
          totalRegistered++;
        } catch (error) {
          console.error(`   ❌ ${date} の登録に失敗:`, error);
          totalFailed++;
        }
      }
    } catch (error) {
      console.error(`   ❌ ${data.employeeName} の処理中にエラー:`, error);
      totalFailed += data.dates.length;
    }
  }

  console.log("\n=== 登録完了 ===");
  console.log(`✅ 登録成功: ${totalRegistered}件`);
  console.log(`❌ 登録失敗: ${totalFailed}件`);
  console.log(`📊 合計: ${totalRegistered + totalFailed}件`);
}

// 実行例（コメントアウトしてあるので、必要に応じて編集して使用）
/*
const sampleData: LeaveRequestData[] = [
  {
    employeeName: '山田 太郎',
    dates: ['2024-12-01', '2024-12-07', '2024-12-14'],
    leaveType: '休'
  },
  {
    employeeName: '佐藤 花子',
    dates: ['2024-12-05', '2024-12-25'],
    leaveType: '有休'
  }
];

registerLeaveRequests(sampleData).catch(console.error);
*/

export { registerLeaveRequests, type LeaveRequestData };