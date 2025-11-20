/**
 * シンプルなシフト生成テスト
 * 既存の12月シフトを使用して生成テスト
 */

import { getDb } from "../server/db";
import { shifts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function simpleTestGeneration() {
  const db = await getDb();
  if (!db) {
    console.error("❌ データベースに接続できません");
    return;
  }

  console.log("=== シンプル生成テスト ===\n");

  try {
    // 1. 12月のシフトを確認
    console.log("1. 既存の12月シフトを確認...");

    const decemberShift = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.year, 2024),
          eq(shifts.month, 12)
        )
      );

    if (decemberShift.length === 0) {
      console.log("   ❌ 12月のシフトが存在しません");
      console.log("   先にSQLで作成してください:");
      console.log(`
INSERT INTO shifts (year, month, name, status, generatedBy, leaveRequestDeadline, additionalRequestDeadline, createdAt, updatedAt)
VALUES (2024, 12, '2024年12月シフト（テスト）', 'vacation_only', 'manual', '2024-11-20', '2024-12-10', NOW(), NOW());
      `);
      return;
    }

    for (const shift of decemberShift) {
      console.log(`   ✅ ID: ${shift.id}`);
      console.log(`      名前: ${shift.name}`);
      console.log(`      状態: ${shift.status}`);
    }

    // 最初のシフトを使用
    const shiftId = decemberShift[0].id;

    // 2. 改善された生成モジュールを呼び出し
    console.log("\n2. 改善されたシフト生成を呼び出し...");

    const { generateImprovedShift } = await import("../server/improvedShiftGenerator");

    console.log("   実行中...");
    const startTime = Date.now();

    const result = await generateImprovedShift(
      shiftId,
      2024,
      12,
      {
        keepApprovedRequests: true,
        keepManualEdits: false,
        usePhased: true,
        useAI: false,
      }
    );

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   ✅ 完了（${elapsedTime}秒）`);

    // 3. 結果表示
    console.log("\n=== 生成結果 ===");
    console.log(`📌 固定シフト: ${result.fixedShifts.length}件`);
    console.log(`🔧 生成シフト: ${result.generatedShifts.length}件`);
    console.log(`📊 合計: ${result.totalShifts}件`);

    // 4. サンプル表示（最初の5件）
    if (result.fixedShifts.length > 0) {
      console.log("\n固定シフトのサンプル（最初の5件）:");
      for (const shift of result.fixedShifts.slice(0, 5)) {
        console.log(`   - 職員${shift.employeeId}: ${shift.date} ${shift.status}`);
      }
    }

    if (result.generatedShifts.length > 0) {
      console.log("\n生成シフトのサンプル（最初の5件）:");
      for (const shift of result.generatedShifts.slice(0, 5)) {
        console.log(`   - 職員${shift.employeeId}: ${shift.date} ${shift.status}`);
      }
    }

    console.log("\n✅ テスト完了");

  } catch (error) {
    console.error("\n❌ エラー:", error);
    if (error instanceof Error) {
      console.error("メッセージ:", error.message);
      console.error("スタック:", error.stack);
    }
  }
}

// 実行
simpleTestGeneration().catch(console.error);