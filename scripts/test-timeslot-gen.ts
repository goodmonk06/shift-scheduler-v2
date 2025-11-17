import { generateShiftTimeSlotBased } from "../server/timeSlotBasedGeneratorApi";
import { getDb } from "../server/db";
import { shiftDetails } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function testTimeSlotGeneration() {
  console.log("=== 時間スロットベース生成テスト ===\n");

  try {
    const shiftId = 8; // 12月のシフトID
    const year = 2024;
    const month = 12;

    console.log("📌 時間スロットベース生成を実行中...");
    console.log(`  対象: ${year}年${month}月\n`);

    const startTime = Date.now();

    // 時間スロットベース生成を実行
    const result = await generateShiftTimeSlotBased({ shiftId, year, month });

    const endTime = Date.now();

    console.log(`\n✅ 生成完了 (処理時間: ${(endTime - startTime) / 1000}秒)`);
    console.log(`  成功: ${result.success}`);
    console.log(`  生成されたシフト詳細数: ${result.assignmentsCreated}`);

    if (result.errors.length > 0) {
      console.log(`  エラー: ${result.errors.length}件`);
      result.errors.forEach((error, i) => {
        console.log(`    ${i + 1}. ${error}`);
      });
    }

    // 生成結果の分析
    const db = await getDb();
    if (db) {
      console.log("\n📌 生成結果の分析:");

      const allDetails = await db.select().from(shiftDetails)
        .where(eq(shiftDetails.shiftId, shiftId));

      console.log(`  総シフト詳細数: ${allDetails.length}`);

      // generatedBy別の集計
      const byGenerator: Record<string, number> = {};
      const shiftTypeCount: Record<string, number> = {};
      const employeeWorkDays: Map<number, { name: string, days: Set<string>, nightCount: number, offCount: number }> = new Map();

      allDetails.forEach((detail: any) => {
        // 生成元別
        const gen = detail.generatedBy || "manual";
        byGenerator[gen] = (byGenerator[gen] || 0) + 1;

        // シフト種別
        const shiftType = detail.timeSlotName || "不明";
        shiftTypeCount[shiftType] = (shiftTypeCount[shiftType] || 0) + 1;

        // 職員別の勤務日数集計
        if (!employeeWorkDays.has(detail.employeeDbId)) {
          employeeWorkDays.set(detail.employeeDbId, {
            name: detail.employeeName || `ID:${detail.employeeDbId}`,
            days: new Set(),
            nightCount: 0,
            offCount: 0
          });
        }

        const empData = employeeWorkDays.get(detail.employeeDbId)!;

        if (shiftType === '休') {
          empData.offCount++;
        } else {
          empData.days.add(detail.date);
          if (shiftType === '夜' || shiftType === '明') {
            empData.nightCount++;
          }
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

      // 職員別統計（勤務日数順）
      console.log("\n  職員別統計（勤務日数順 上位10名）:");
      const sortedEmployees = Array.from(employeeWorkDays.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          workDays: data.days.size,
          nightShifts: data.nightCount,
          offDays: data.offCount
        }))
        .sort((a, b) => b.workDays - a.workDays)
        .slice(0, 10);

      sortedEmployees.forEach(emp => {
        console.log(`    ${emp.name}: 勤務${emp.workDays}日, 夜勤関連${emp.nightShifts}回, 休み${emp.offDays}日`);
      });

      // 1日あたりの平均人数
      const daysInMonth = new Date(year, month, 0).getDate();
      const workingDetails = allDetails.filter((d: any) => d.timeSlotName !== '休');
      const avgPerDay = Math.round(workingDetails.length / daysInMonth);
      console.log(`\n  1日あたりの平均勤務人数: 約${avgPerDay}名`);

      // 日別の勤務人数
      console.log("\n  日別勤務人数（最初の7日間）:");
      for (let day = 1; day <= 7; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDetails = allDetails.filter((d: any) => d.date === dateStr && d.timeSlotName !== '休');
        const shiftTypes: Record<string, number> = {};
        dayDetails.forEach((d: any) => {
          const type = d.timeSlotName || '不明';
          shiftTypes[type] = (shiftTypes[type] || 0) + 1;
        });
        const summary = Object.entries(shiftTypes)
          .map(([type, count]) => `${type}:${count}`)
          .join(', ');
        console.log(`    ${month}/${day}: ${dayDetails.length}名 (${summary || 'なし'})`);
      }
    }

    console.log("\n=== テスト完了 ===");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

testTimeSlotGeneration();