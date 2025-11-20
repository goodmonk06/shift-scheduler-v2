/**
 * 12月の希望休データを確認するスクリプト
 */

import { getDb } from "../server/db";
import { leaveRequests, employees } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

async function checkDecemberLeaves() {
  console.log("=== 12月の希望休データ確認 ===\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  try {
    // 12月の希望休を取得
    const decemberLeaves = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        employeeName: employees.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        leaveType: leaveRequests.leaveType,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(
        and(
          gte(leaveRequests.startDate, '2024-12-01'),
          lte(leaveRequests.endDate, '2024-12-31')
        )
      )
      .orderBy(employees.name, leaveRequests.startDate);

    console.log(`📊 12月の希望休登録数: ${decemberLeaves.length}件\n`);

    if (decemberLeaves.length === 0) {
      console.log("⚠️ 12月の希望休は登録されていません");
      return;
    }

    // 職員ごとにグループ化
    const leavesByEmployee = new Map<string, typeof decemberLeaves>();

    for (const leave of decemberLeaves) {
      const employeeName = leave.employeeName || `ID:${leave.employeeId}`;
      if (!leavesByEmployee.has(employeeName)) {
        leavesByEmployee.set(employeeName, []);
      }
      leavesByEmployee.get(employeeName)?.push(leave);
    }

    // 職員ごとに表示
    for (const [employeeName, leaves] of leavesByEmployee) {
      console.log(`👤 ${employeeName}`);
      for (const leave of leaves) {
        const dateRange = leave.startDate === leave.endDate
          ? `${leave.startDate}`
          : `${leave.startDate} ～ ${leave.endDate}`;
        console.log(`   - ${dateRange} (${leave.leaveType}) [${leave.status}]`);
      }
      console.log();
    }

    // 統計情報
    console.log("📈 統計情報:");
    console.log(`   - 希望休を申請した職員数: ${leavesByEmployee.size}人`);
    console.log(`   - 総希望休申請数: ${decemberLeaves.length}件`);

    const approvedCount = decemberLeaves.filter(l => l.status === 'approved').length;
    const pendingCount = decemberLeaves.filter(l => l.status === 'pending').length;
    const rejectedCount = decemberLeaves.filter(l => l.status === 'rejected').length;

    console.log(`   - 承認済み: ${approvedCount}件`);
    console.log(`   - 承認待ち: ${pendingCount}件`);
    console.log(`   - 却下: ${rejectedCount}件`);

  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

checkDecemberLeaves().catch(console.error);