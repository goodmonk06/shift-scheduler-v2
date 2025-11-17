import { getDb } from "../server/db";
import { workTimeSlots, positionGroups, employees, shiftDetails, shifts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function validateAll() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 システム全体検証開始");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log();

  const db = await getDb();
  if (!db) {
    console.error("❌ データベース接続失敗");
    process.exit(1);
  }

  let allPassed = true;
  const results: { category: string; test: string; passed: boolean; message: string }[] = [];

  // 1. 勤務時間枠の検証
  console.log("1️⃣ 勤務時間枠の検証");
  try {
    const slots = await db.select().from(workTimeSlots);

    // 必要なスロットが存在するか
    const requiredSlots = [
      { id: 4, name: "夜勤入り", displayLabel: "夜", startTime: "16:00", endTime: "00:00", requiredStaff: 1 },
      { id: 5, name: "夜勤明け", displayLabel: "明", startTime: "00:00", endTime: "09:00", requiredStaff: 0 },
      { id: 7, name: "早番", displayLabel: "早", startTime: "06:00", endTime: "15:00", requiredStaff: 2 },
      { id: 8, name: "日勤A", displayLabel: "日A", startTime: "08:00", endTime: "17:00", requiredStaff: 2 },
      { id: 9, name: "日勤B", displayLabel: "日B", startTime: "09:00", endTime: "18:00", requiredStaff: 2 },
      { id: 10, name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", requiredStaff: 2 },
    ];

    for (const required of requiredSlots) {
      const slot = slots.find(s => s.id === required.id);
      if (!slot) {
        results.push({
          category: "勤務時間枠",
          test: `ID:${required.id} 存在確認`,
          passed: false,
          message: "スロットが存在しません"
        });
        allPassed = false;
      } else {
        const checks = [
          { field: "name", expected: required.name, actual: slot.name },
          { field: "displayLabel", expected: required.displayLabel, actual: slot.displayLabel },
          { field: "startTime", expected: required.startTime, actual: slot.startTime },
          { field: "endTime", expected: required.endTime, actual: slot.endTime },
          { field: "requiredStaff", expected: required.requiredStaff, actual: slot.requiredStaff }
        ];

        let slotPassed = true;
        for (const check of checks) {
          if (check.expected !== check.actual) {
            results.push({
              category: "勤務時間枠",
              test: `${required.name} - ${check.field}`,
              passed: false,
              message: `期待値: ${check.expected}, 実際: ${check.actual}`
            });
            slotPassed = false;
            allPassed = false;
          }
        }

        if (slotPassed) {
          results.push({
            category: "勤務時間枠",
            test: required.name,
            passed: true,
            message: "✓ 正しく設定されています"
          });
        }
      }
    }

    // 1日の必要人数合計
    const totalRequired = slots
      .filter(s => s.requiredStaff > 0)
      .reduce((sum, s) => sum + s.requiredStaff, 0);

    results.push({
      category: "勤務時間枠",
      test: "1日の必要人数合計",
      passed: totalRequired === 9,
      message: `${totalRequired}名 (期待値: 9名)`
    });
    if (totalRequired !== 9) allPassed = false;

  } catch (error: any) {
    results.push({
      category: "勤務時間枠",
      test: "データ取得",
      passed: false,
      message: error.message
    });
    allPassed = false;
  }

  // 2. 勤務区分の最低休日数の検証
  console.log("\n2️⃣ 勤務区分の最低休日数の検証");
  try {
    const groups = await db.select().from(positionGroups);

    const expectedMinDaysOff: Record<string, number> = {
      "管理者": 8,
      "正社員": 9,
      "パート": 12,
      "事務員": 10,
      "管理者兼サ責": 8,
      "サ責": 9
    };

    for (const group of groups) {
      const expected = expectedMinDaysOff[group.name];
      if (expected !== undefined) {
        const passed = group.minDaysOffPerMonth === expected;
        results.push({
          category: "勤務区分",
          test: `${group.name} 最低休日数`,
          passed,
          message: `${group.minDaysOffPerMonth}日/月 (期待値: ${expected}日/月)`
        });
        if (!passed) allPassed = false;
      }
    }
  } catch (error: any) {
    results.push({
      category: "勤務区分",
      test: "データ取得",
      passed: false,
      message: error.message
    });
    allPassed = false;
  }

  // 3. 12月シフトデータの検証
  console.log("\n3️⃣ 12月シフトデータの検証");
  try {
    const decemberShifts = await db.select().from(shiftDetails)
      .where(eq(shiftDetails.shiftId, 8));

    const totalShifts = decemberShifts.length;
    const byGenerator: Record<string, number> = {};
    const byTimeSlot: Record<string, number> = {};

    decemberShifts.forEach(detail => {
      const gen = detail.generatedBy || "不明";
      byGenerator[gen] = (byGenerator[gen] || 0) + 1;

      const slotId = detail.timeSlotId;
      if (slotId) {
        byTimeSlot[slotId] = (byTimeSlot[slotId] || 0) + 1;
      }
    });

    results.push({
      category: "12月シフト",
      test: "総シフト数",
      passed: totalShifts > 0,
      message: `${totalShifts}件`
    });

    // 生成元別
    for (const [gen, count] of Object.entries(byGenerator)) {
      results.push({
        category: "12月シフト",
        test: `生成元: ${gen}`,
        passed: true,
        message: `${count}件`
      });
    }

    // 1日あたりの平均
    const daysInMonth = 31;
    const avgPerDay = Math.round(totalShifts / daysInMonth);
    results.push({
      category: "12月シフト",
      test: "1日あたり平均人数",
      passed: avgPerDay >= 8 && avgPerDay <= 10,
      message: `約${avgPerDay}名`
    });
    if (avgPerDay < 8 || avgPerDay > 10) allPassed = false;

  } catch (error: any) {
    results.push({
      category: "12月シフト",
      test: "データ取得",
      passed: false,
      message: error.message
    });
    allPassed = false;
  }

  // 4. 職員データの整合性
  console.log("\n4️⃣ 職員データの整合性検証");
  try {
    const employeesData = await db.select().from(employees);
    const totalEmployees = employeesData.length;
    const nightCapable = employeesData.filter(e => e.canWorkNightShift).length;

    results.push({
      category: "職員データ",
      test: "総職員数",
      passed: totalEmployees > 0,
      message: `${totalEmployees}名`
    });

    results.push({
      category: "職員データ",
      test: "夜勤可能職員数",
      passed: nightCapable >= 3,
      message: `${nightCapable}名 (最低3名必要)`
    });
    if (nightCapable < 3) allPassed = false;

    // 勤務区分分布
    const byPositionGroup: Record<number, number> = {};
    employeesData.forEach(emp => {
      if (emp.positionGroupId) {
        byPositionGroup[emp.positionGroupId] = (byPositionGroup[emp.positionGroupId] || 0) + 1;
      }
    });

    const groups = await db.select().from(positionGroups);
    for (const group of groups) {
      const count = byPositionGroup[group.id] || 0;
      results.push({
        category: "職員データ",
        test: `${group.name}の人数`,
        passed: true,
        message: `${count}名`
      });
    }

  } catch (error: any) {
    results.push({
      category: "職員データ",
      test: "データ取得",
      passed: false,
      message: error.message
    });
    allPassed = false;
  }

  // 結果表示
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 検証結果サマリー");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const categories = Array.from(new Set(results.map(r => r.category)));

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.passed).length;
    const total = categoryResults.length;
    const allCategoryPassed = passed === total;

    console.log(`【${category}】 ${allCategoryPassed ? '✅' : '⚠️'} ${passed}/${total} 合格`);

    for (const result of categoryResults) {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      console.log(`  ${color}${icon}${reset} ${result.test}: ${result.message}`);
    }
    console.log();
  }

  // 総合結果
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (allPassed) {
    console.log("🎉 全ての検証項目に合格しました！");
  } else {
    const failedCount = results.filter(r => !r.passed).length;
    console.log(`⚠️ ${failedCount}個の検証項目で問題が見つかりました`);
    console.log("\n推奨される対処:");
    console.log("1. scripts/fix-timeslots-correct.ts を実行して勤務時間枠を修正");
    console.log("2. scripts/fix-remaining-positions.ts を実行して勤務区分を修正");
    console.log("3. scripts/test-timeslot-gen.ts を実行してシフト生成をテスト");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(allPassed ? 0 : 1);
}

validateAll().catch(console.error);