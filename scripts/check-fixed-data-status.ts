/**
 * 固定データの現在の状況を確認するスクリプト
 */

import { getDb } from "../server/db";
import { shiftDetails, workPreferences, leaveRequests, employees } from "../drizzle/schema";
import { eq, and, or, isNotNull, sql } from "drizzle-orm";

async function checkFixedDataStatus() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 固定データ状況確認 ===\n");

  try {
    // 1. shiftDetailsテーブルの確認
    console.log("1. shiftDetailsテーブル:");

    // 全体の件数
    const totalShifts = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(shiftDetails);
    console.log(`   総件数: ${totalShifts[0]?.count || 0}件`);

    // isFixed=trueの件数
    const fixedShifts = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(shiftDetails)
      .where(eq(shiftDetails.isFixed, true));
    console.log(`   固定シフト: ${fixedShifts[0]?.count || 0}件`);

    // generatedBy別の件数
    const generatedByStats = await db
      .select({
        generatedBy: shiftDetails.generatedBy,
        count: sql<number>`COUNT(*)`
      })
      .from(shiftDetails)
      .groupBy(shiftDetails.generatedBy);

    console.log("\n   generatedBy別:");
    for (const row of generatedByStats) {
      console.log(`     - ${row.generatedBy}: ${row.count}件`);
    }

    // 2. workPreferencesテーブルの確認
    console.log("\n2. workPreferencesテーブル:");

    // 承認済みの件数
    const approvedWorkPrefs = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workPreferences)
      .where(eq(workPreferences.status, 'approved'));
    console.log(`   承認済み: ${approvedWorkPrefs[0]?.count || 0}件`);

    // preferenceType別の件数（新カラムがある場合）
    try {
      const prefTypeStats = await db.execute(sql`
        SELECT preferenceType, COUNT(*) as count
        FROM workPreferences
        WHERE status = 'approved'
        GROUP BY preferenceType
      `);

      if ((prefTypeStats as any).length > 0) {
        console.log("\n   preferenceType別:");
        for (const row of prefTypeStats as any[]) {
          console.log(`     - ${row.preferenceType || 'NULL'}: ${row.count}件`);
        }
      }
    } catch (error) {
      console.log("   ⚠️ preferenceTypeカラムが存在しないか、データ取得エラー");
    }

    // 研修データの確認
    try {
      const trainingData = await db.execute(sql`
        SELECT
          e.name as employeeName,
          wp.startDate,
          wp.endDate,
          wp.startTime,
          wp.endTime,
          wp.reason,
          wp.preferenceType,
          wp.isCountAsStaff
        FROM workPreferences wp
        JOIN employees e ON wp.employeeId = e.id
        WHERE wp.reason LIKE '%研修%'
          AND wp.status = 'approved'
        ORDER BY wp.startDate
        LIMIT 10
      `);

      if ((trainingData as any).length > 0) {
        console.log("\n   研修データ（最大10件）:");
        for (const row of trainingData as any[]) {
          console.log(`     - ${row.employeeName}: ${row.startDate} ${row.startTime}-${row.endTime}`);
          console.log(`       理由: ${row.reason}`);
          console.log(`       タイプ: ${row.preferenceType || 'NULL'}, 人数カウント: ${row.isCountAsStaff}`);
        }
      }
    } catch (error) {
      console.log("   ⚠️ 研修データの取得エラー");
    }

    // 3. leaveRequestsテーブルの確認
    console.log("\n3. leaveRequestsテーブル:");

    // 承認済みの件数
    const approvedLeaves = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, 'approved'));
    console.log(`   承認済み: ${approvedLeaves[0]?.count || 0}件`);

    // leaveType別の件数
    const leaveTypeStats = await db
      .select({
        leaveType: leaveRequests.leaveType,
        count: sql<number>`COUNT(*)`
      })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, 'approved'))
      .groupBy(leaveRequests.leaveType);

    console.log("\n   leaveType別:");
    for (const row of leaveTypeStats) {
      console.log(`     - ${row.leaveType}: ${row.count}件`);
    }

    // 4. 12月のデータ確認
    console.log("\n4. 12月のデータ状況:");

    // 12月の希望休
    const decLeaves = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, 'approved'),
          sql`${leaveRequests.startDate} >= '2024-12-01'`,
          sql`${leaveRequests.startDate} <= '2024-12-31'`
        )
      );
    console.log(`   12月の希望休: ${decLeaves[0]?.count || 0}件`);

    // 12月の勤務希望
    const decWorkPrefs = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workPreferences)
      .where(
        and(
          eq(workPreferences.status, 'approved'),
          sql`${workPreferences.startDate} >= '2024-12-01'`,
          sql`${workPreferences.startDate} <= '2024-12-31'`
        )
      );
    console.log(`   12月の勤務希望: ${decWorkPrefs[0]?.count || 0}件`);

    // 5. データ整合性チェック
    console.log("\n5. データ整合性チェック:");

    // isFixed=trueだがsourceTypeがNULLのデータ
    const inconsistent1 = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.isFixed, true),
          sql`${shiftDetails.sourceType} IS NULL`
        )
      );
    console.log(`   ⚠️ isFixed=trueだがsourceType=NULL: ${inconsistent1[0]?.count || 0}件`);

    // generatedBy='leave_request'だがisFixed=falseのデータ
    const inconsistent2 = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(shiftDetails)
      .where(
        and(
          eq(shiftDetails.generatedBy, 'leave_request'),
          or(
            eq(shiftDetails.isFixed, false),
            sql`${shiftDetails.isFixed} IS NULL`
          )
        )
      );
    console.log(`   ⚠️ leave_request由来だがisFixed!=true: ${inconsistent2[0]?.count || 0}件`);

    console.log("\n✅ 状況確認完了");

  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  }
}

// スクリプト実行
checkFixedDataStatus().catch(console.error);