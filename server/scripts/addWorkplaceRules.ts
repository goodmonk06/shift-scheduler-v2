/**
 * 職場ルールとemploymentTypeを追加するスクリプト
 *
 * 実行方法:
 * DATABASE_URL='...' pnpm tsx server/scripts/addWorkplaceRules.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { employees, workplaceRules } from "../../drizzle/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL?.replace(/[?&]ssl-mode=[^&]*/g, '');
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const db = drizzle(connectionString);

  try {
    // 1. シフト時間枠マスタを追加
    console.log("\n=== 1. シフト時間枠マスタを追加 ===");
    await db.insert(workplaceRules).values({
      ruleType: "shift_patterns",
      employmentType: "all",
      ruleValue: {
        早番: "7～16",
        日勤: "9～18",
        遅番: "11～20",
        夜勤: "16～翌9"
      },
      description: "シフト時間枠の定義",
      isActive: true,
    });
    console.log("  追加完了: shift_patterns");

    // 2. 夜勤サイクルルールを追加
    console.log("\n=== 2. 夜勤サイクルルールを追加 ===");
    await db.insert(workplaceRules).values({
      ruleType: "night_shift_cycle",
      employmentType: "all",
      ruleValue: {
        pattern: ["夜", "明", "休"],
        明けは勤務扱い: true
      },
      description: "夜勤は「夜→明→休」の3日セット",
      isActive: true,
    });
    console.log("  追加完了: night_shift_cycle");

    // 3. 優先順位ルールを追加
    console.log("\n=== 3. 優先順位ルールを追加 ===");
    await db.insert(workplaceRules).values({
      ruleType: "constraint_priority",
      employmentType: "all",
      ruleValue: {
        priorities: [
          "固定休曜日(offDays)",
          "固定勤務曜日(fixedDays)",
          "禁止シフト(forbiddenShifts)",
          "月間勤務日数",
          "必要人数充足"
        ]
      },
      description: "制約の優先順位",
      isActive: true,
    });
    console.log("  追加完了: constraint_priority");

    // 4. employeesにemploymentTypeカラム追加
    console.log("\n=== 4. employeesにemploymentTypeカラム追加 ===");
    try {
      await db.execute('ALTER TABLE employees ADD COLUMN employmentType VARCHAR(20) DEFAULT "parttime"');
      console.log("  カラム追加完了: employmentType");
    } catch (e: any) {
      if (e.message.includes("Duplicate column")) {
        console.log("  カラムは既に存在します");
      } else {
        throw e;
      }
    }

    // 5. 正社員を設定
    console.log("\n=== 5. 正社員を設定 ===");
    const fullTimeStaff = ['山口 夕香里', '馬渕 尊至', '松嵜 愛梨', '杉山 美佳子', '梅田 英津子', '大橋 健一'];
    for (const name of fullTimeStaff) {
      await db.execute(`UPDATE employees SET employmentType = 'fulltime' WHERE name = '${name}'`);
      console.log(`  設定: ${name} → fulltime`);
    }

    console.log("\n=== 完了 ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
