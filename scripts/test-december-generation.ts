/**
 * 12月のシフト生成テスト
 * 改善されたシフト生成モジュールを使用
 */

import { getDb } from "../server/db";
import { shifts, shiftDetails } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateImprovedShift } from "../server/improvedShiftGenerator";

async function testDecemberGeneration() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== 12月のシフト生成テスト開始 ===\n");

  try {
    // 1. 12月のシフトを確認または作成
    console.log("1. 12月のシフトを確認...");

    let decemberShift = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.year, 2024),
          eq(shifts.month, 12)
        )
      )
      .limit(1);

    let shiftId: number;

    if (decemberShift.length === 0) {
      console.log("   12月のシフトが存在しないため新規作成");
      const newShift = await db.insert(shifts).values({
        year: 2024,
        month: 12,
        name: "2024年12月シフト（テスト）",
        status: "vacation_only",
        generatedBy: "manual",
        leaveRequestDeadline: "2024-11-20",
        additionalRequestDeadline: "2024-12-10",
      });

      shiftId = newShift.insertId;
      console.log(`   ✅ 新規シフト作成: ID ${shiftId}`);
    } else {
      shiftId = decemberShift[0].id;
      console.log(`   ✅ 既存シフト使用: ID ${shiftId}`);
      console.log(`      状態: ${decemberShift[0].status}`);
      console.log(`      名前: ${decemberShift[0].name}`);
    }

    // 2. 既存のシフト詳細を確認
    console.log("\n2. 既存のシフト詳細を確認...");

    const existingDetails = await db
      .select({
        total: sql<number>`COUNT(*)`,
        fixed: sql<number>`SUM(CASE WHEN isFixed = TRUE THEN 1 ELSE 0 END)`,
        generated: sql<number>`SUM(CASE WHEN isFixed = FALSE OR isFixed IS NULL THEN 1 ELSE 0 END)`,
      })
      .from(shiftDetails)
      .where(eq(shiftDetails.shiftId, shiftId));

    console.log(`   総件数: ${existingDetails[0].total}件`);
    console.log(`   固定データ: ${existingDetails[0].fixed}件`);
    console.log(`   生成データ: ${existingDetails[0].generated}件`);

    // 3. ユーザーに確認
    console.log("\n3. シフト生成オプション:");
    console.log("   - 承認済み希望休・勤務希望を保持: はい");
    console.log("   - 手動編集を保持: いいえ");
    console.log("   - 生成方法: 段階的生成");

    // 4. シフト生成を実行
    console.log("\n4. 改善されたシフト生成を実行...");

    const startTime = Date.now();

    const result = await generateImprovedShift(
      shiftId,
      2024,
      12,
      {
        keepApprovedRequests: true,  // 承認済みデータを保持
        keepManualEdits: false,       // 手動編集は削除
        usePhased: true,              // 段階的生成を使用
        useAI: false,
      }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ シフト生成完了（${elapsedTime}秒）`);
    console.log("\n=== 生成結果 ===");
    console.log(`📌 固定シフト: ${result.fixedShifts.length}件`);
    console.log(`🔧 生成シフト: ${result.generatedShifts.length}件`);
    console.log(`📊 合計: ${result.totalShifts}件`);

    // 5. 統計情報の表示
    if (result.statistics?.employeeStats) {
      console.log("\n=== 職員別統計 ===");
      console.log("職員ID | 勤務日数 | 休日数 | 研修日数");
      console.log("-------|---------|--------|----------");

      // 上位10名のみ表示
      const topEmployees = result.statistics.employeeStats.slice(0, 10);
      for (const stat of topEmployees) {
        console.log(
          `${String(stat.employeeId).padEnd(7)}| ` +
          `${String(stat.workDays).padEnd(9)}| ` +
          `${String(stat.offDays).padEnd(8)}| ` +
          `${stat.trainingDays}`
        );
      }

      if (result.statistics.employeeStats.length > 10) {
        console.log(`... 他${result.statistics.employeeStats.length - 10}名`);
      }
    }

    // 6. 生成後の確認
    console.log("\n6. 生成後のデータ確認...");

    const finalDetails = await db
      .select({
        total: sql<number>`COUNT(*)`,
        fixed: sql<number>`SUM(CASE WHEN isFixed = TRUE THEN 1 ELSE 0 END)`,
        generated: sql<number>`SUM(CASE WHEN isFixed = FALSE OR isFixed IS NULL THEN 1 ELSE 0 END)`,
        workingCount: sql<number>`SUM(CASE WHEN status = 'working' THEN 1 END)`,
        offCount: sql<number>`SUM(CASE WHEN status IN ('off', 'requested_off') THEN 1 END)`,
      })
      .from(shiftDetails)
      .where(eq(shiftDetails.shiftId, shiftId));

    console.log(`   総件数: ${finalDetails[0].total}件`);
    console.log(`   固定データ: ${finalDetails[0].fixed}件`);
    console.log(`   生成データ: ${finalDetails[0].generated}件`);
    console.log(`   勤務: ${finalDetails[0].workingCount}件`);
    console.log(`   休み: ${finalDetails[0].offCount}件`);

    // 7. 特定日のスタッフ数確認（サンプル）
    console.log("\n7. サンプル日付のスタッフ数:");

    const sampleDates = ["2024-12-01", "2024-12-15", "2024-12-25", "2024-12-31"];
    for (const date of sampleDates) {
      const staffCount = await db
        .select({
          working: sql<number>`COUNT(CASE WHEN status = 'working' THEN 1 END)`,
          off: sql<number>`COUNT(CASE WHEN status IN ('off', 'requested_off') THEN 1 END)`,
          training: sql<number>`COUNT(CASE WHEN status = 'working' AND sourceType = 'work_preference' AND EXISTS (
            SELECT 1 FROM workPreferences wp
            WHERE wp.id = sourceId AND wp.preferenceType = 'training'
          ) THEN 1 END)`,
        })
        .from(shiftDetails)
        .where(
          and(
            eq(shiftDetails.shiftId, shiftId),
            eq(shiftDetails.date, date)
          )
        );

      console.log(
        `   ${date}: 勤務 ${staffCount[0].working}名, ` +
        `休み ${staffCount[0].off}名, ` +
        `研修 ${staffCount[0].training}名`
      );
    }

    console.log("\n✅ テスト完了");
    console.log("\n💡 ヒント: 生成結果に問題がある場合は、以下を確認してください:");
    console.log("   - 希望休・勤務希望が正しく登録されているか");
    console.log("   - 固定データが保護されているか");
    console.log("   - 必要人数の設定が適切か");

  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    console.error("\nスタックトレース:");
    console.error((error as Error).stack);
  }
}

// スクリプト実行
testDecemberGeneration().catch(console.error);