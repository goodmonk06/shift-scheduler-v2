import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees, positionGroups, workTimeSlots, workplaceRules } from "../drizzle/schema";
import { eq } from "drizzle-orm";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');
  console.log("Connecting to database...\n");

  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  // 1. 馬渕 尊至さんをサービス提供責任者に設定
  console.log("1. Setting 馬渕 尊至 as Service Manager...");
  await db.update(employees)
    .set({ isServiceManager: true, canWorkNightShift: false })
    .where(eq(employees.employeeId, "1120"));
  console.log("✓ 馬渕 尊至 (ID: 1120) → isServiceManager=true, canWorkNightShift=false\n");

  // 2. 淺野 穂菜美さんを事務員に設定
  console.log("2. Setting 淺野 穂菜美 as Office Staff...");
  await db.update(employees)
    .set({ isOfficeStaff: true, canWorkNightShift: false })
    .where(eq(employees.employeeId, "0043"));
  console.log("✓ 淺野 穂菜美 (ID: 0043) → isOfficeStaff=true, canWorkNightShift=false\n");

  // 3. 正社員グループの公休日数を9日/月に設定
  console.log("3. Setting fulltime position group min days off...");
  const groups = await db.select().from(positionGroups);
  const fulltimeGroup = groups.find(g => g.name.includes("正社員"));
  if (fulltimeGroup) {
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 9 })
      .where(eq(positionGroups.id, fulltimeGroup.id));
    console.log(`✓ ${fulltimeGroup.name} (ID: ${fulltimeGroup.id}) → minDaysOffPerMonth=9\n`);
  } else {
    console.log("⚠ 正社員グループが見つかりません\n");
  }

  // 4. 勤務パターンを登録
  console.log("4. Adding work time slots...");
  const slots = [
    { name: "夜勤", displayLabel: "夜", startTime: "16:00", endTime: "09:00", isNightShift: true },
    { name: "早番", displayLabel: "早", startTime: "06:00", endTime: "15:00", isNightShift: false },
    { name: "日勤A", displayLabel: "日A", startTime: "08:00", endTime: "17:00", isNightShift: false },
    { name: "日勤B", displayLabel: "日B", startTime: "09:00", endTime: "18:00", isNightShift: false },
    { name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", isNightShift: false },
  ];

  for (const slot of slots) {
    try {
      await db.insert(workTimeSlots).values(slot);
      console.log(`✓ Added: ${slot.name} (${slot.startTime}-${slot.endTime})`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`✓ ${slot.name} already exists`);
      } else {
        throw error;
      }
    }
  }
  console.log();

  // 5. 職場ルールを登録
  console.log("5. Adding workplace rules...");

  const rules = [
    {
      ruleType: "max_consecutive_days" as const,
      employmentType: "all" as const,
      ruleValue: { maxDays: 4 },
      description: "連勤上限4日（夜勤入り～夜勤明け=2連勤扱い）",
    },
    {
      ruleType: "post_night_shift_rest" as const,
      employmentType: "all" as const,
      ruleValue: { restDays: 2 },
      description: "夜勤入り翌日=夜勤明け、夜勤明け翌日=休み",
    },
    {
      ruleType: "fulltime_required_hours" as const,
      employmentType: "fulltime" as const,
      ruleValue: { startTime: "09:00", endTime: "16:00", minCount: 1 },
      description: "9:00-16:00の間、最低1名は正社員を配置",
    },
  ];

  for (const rule of rules) {
    try {
      await db.insert(workplaceRules).values(rule);
      console.log(`✓ Added: ${rule.description}`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`✓ Rule already exists: ${rule.description}`);
      } else {
        throw error;
      }
    }
  }

  await connection.end();
  console.log("\n✓ Workplace setup completed!");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
