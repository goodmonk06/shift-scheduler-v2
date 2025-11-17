import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Load .env file
config();

// 指定された順番
const orderByName = [
  "髙野 幹成",
  "山口 夕香里",
  "馬渕 尊至",
  "松嵜 愛梨",
  "杉山 美佳子",
  "梅田 英津子",
  "大橋 健一",
  "上条 やえ子",
  "若森 直子",
  "足立 洋子",
  "野仲 彩香",
  "桂川 美幸",
  "加藤 広大",
  "湯本 智子",
  "楠 美佐",
  "平井 英子",
  "海野 はるか",
  "山田 明美",
  "足立 豊子",
  "関田 あゆみ",
  "長山 真梨奈",
  "近藤 由美子",
  "大堀SHIRLEY TAN", // または "大堀 シェリー"
  "宝本 龍騎",
  "岩崎 亜友美",
  "伊藤 美穂",
  "淺野 穂菜美",
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", dbUrl ? "Found" : "Not found");

  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Remove ssl-mode parameter if present
  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');

  console.log("Connecting to database...");
  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  console.log("Fetching all employees...");
  const allEmployees = await db.select().from(employees);

  console.log(`Found ${allEmployees.length} employees in database`);
  console.log("\nUpdating display order...\n");

  let updated = 0;
  let notFound = 0;

  for (let i = 0; i < orderByName.length; i++) {
    const targetName = orderByName[i];
    const displayOrder = i + 1; // 1から始まる順序

    // 名前で職員を検索（スペースの全角半角を考慮）
    const employee = allEmployees.find(emp => {
      const empName = emp.name.replace(/\s+/g, ' ').trim();
      const searchName = targetName.replace(/\s+/g, ' ').trim();

      // 完全一致
      if (empName === searchName) return true;

      // スペースなし比較
      if (empName.replace(/\s/g, '') === searchName.replace(/\s/g, '')) return true;

      // "大堀SHIRLEY TAN" と "大堀 シェリー" の特殊ケース
      if (searchName.includes("大堀") && empName.includes("大堀")) return true;

      return false;
    });

    if (employee) {
      await db
        .update(employees)
        .set({ displayOrder })
        .where(eq(employees.id, employee.id));

      console.log(`✓ ${displayOrder.toString().padStart(2, ' ')}. ${employee.name} (ID: ${employee.employeeId})`);
      updated++;
    } else {
      console.log(`✗ ${displayOrder.toString().padStart(2, ' ')}. ${targetName} - NOT FOUND`);
      notFound++;
    }
  }

  await connection.end();

  console.log("\n=== Reorder Summary ===");
  console.log(`Updated: ${updated}`);
  console.log(`Not Found: ${notFound}`);
  console.log(`Total: ${orderByName.length}`);
  console.log("✓ Reorder completed!");
}

main().catch((err) => {
  console.error("Reorder failed:", err);
  process.exit(1);
});
