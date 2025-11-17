import { getDb } from "../server/db";
import { shiftDetails, shifts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateShiftRuleBased } from "../server/ruleBasedShiftGeneratorApi";

async function testRuleGeneration() {
  const db = await getDb();

  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  console.log("=== ルールベース生成テスト ===\n");

  try {
    const shiftId = 8; // 12月のシフトID
    const year = 2024;
    const month = 12;

    // 1. 既存のルールベース生成されたシフト詳細を削除
    console.log("📌 既存のルールベース生成データを削除中...");
    const deleteResult = await db.delete(shiftDetails)
      .where(
        and(
          eq(shiftDetails.shiftId, shiftId),
          eq(shiftDetails.generatedBy, "rule_based")
        )
      );
    console.log(`  削除した詳細数: ${deleteResult.rowsAffected || 0}\n`);

    // 2. ルールベース生成を実行
    console.log("📌 ルールベース生成を実行中...");
    console.log(`  対象: ${year}年${month}月\n`);

    const startTime = Date.now();

    // API関数を使用
    await generateShiftRuleBased({ shiftId, year, month });

    const endTime = Date.now();

    console.log(`\n✅ 生成完了 (処理時間: ${(endTime - startTime) / 1000}秒)`);

    // 3. 生成結果の分析
    console.log("\n📌 生成結果の分析:");

    // 全シフト詳細を取得
    const allDetails = await db.select().from(shiftDetails)
      .where(eq(shiftDetails.shiftId, shiftId));

    console.log(`  総シフト詳細数: ${allDetails.length}`);

    // generatedBy別の集計
    const byGenerator: Record<string, number> = {};
    const shiftTypeCount: Record<string, number> = {};
    const nightShiftDays = new Set<string>();
    const offDays = new Set<string>();

    allDetails.forEach((detail: any) => {
      // 生成元別
      const gen = detail.generatedBy || "manual";
      byGenerator[gen] = (byGenerator[gen] || 0) + 1;

      // シフト種別
      const shiftType = detail.timeSlotName || "不明";
      shiftTypeCount[shiftType] = (shiftTypeCount[shiftType] || 0) + 1;

      // 夜勤と休みの日を記録
      if (shiftType.includes("夜")) {
        nightShiftDays.add(`${detail.employeeDbId}-${detail.date}`);
      }
      if (shiftType.includes("休")) {
        offDays.add(`${detail.employeeDbId}-${detail.date}`);
      }
    });

    console.log("\n  生成元別:");
    Object.entries(byGenerator).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}件`);
    });

    console.log("\n  シフト種別分布:");
    Object.entries(shiftTypeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, value]) => {
        console.log(`    ${key}: ${value}件`);
      });

    console.log(`\n  夜勤割り当て: ${nightShiftDays.size}件`);
    console.log(`  休み割り当て: ${offDays.size}件`);

    // 1日あたりの平均人数
    const daysInMonth = new Date(year, month, 0).getDate();
    const avgPerDay = Math.round(allDetails.filter((d: any) => !d.timeSlotName?.includes("休")).length / daysInMonth);
    console.log(`\n  1日あたりの平均勤務人数: 約${avgPerDay}名`);

    // 職員別の統計
    console.log("\n📌 職員別統計（上位5名）:");
    const employeeStats: Record<number, { name: string, workDays: number, nightShifts: number, offDays: number }> = {};

    allDetails.forEach((detail: any) => {
      if (!employeeStats[detail.employeeDbId]) {
        employeeStats[detail.employeeDbId] = {
          name: detail.employeeName || "不明",
          workDays: 0,
          nightShifts: 0,
          offDays: 0
        };
      }

      const shiftType = detail.timeSlotName || "";
      if (shiftType.includes("休")) {
        employeeStats[detail.employeeDbId].offDays++;
      } else {
        employeeStats[detail.employeeDbId].workDays++;
        if (shiftType.includes("夜")) {
          employeeStats[detail.employeeDbId].nightShifts++;
        }
      }
    });

    Object.entries(employeeStats)
      .sort((a, b) => b[1].workDays - a[1].workDays)
      .slice(0, 5)
      .forEach(([id, stats]) => {
        console.log(`  ${stats.name}: 勤務${stats.workDays}日, 夜勤${stats.nightShifts}回, 休日${stats.offDays}日`);
      });

    console.log("\n=== テスト完了 ===");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

testRuleGeneration();