import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees, positionGroups } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Load .env file
config();

const employeeData = [
  { employeeId: "0029", name: "足立 豊子", role: "staff" },
  { employeeId: "0012", name: "足立 洋子", role: "staff" },
  { employeeId: "0038", name: "伊藤 美穂", role: "staff" },
  { employeeId: "0034", name: "上条 やえ子", role: "staff" },
  { employeeId: "0021", name: "海野 はるか", role: "staff" },
  { employeeId: "0003", name: "梅田 英津子", role: "staff" },
  { employeeId: "0025", name: "大橋 健一", role: "staff" },
  { employeeId: "0027", name: "桂川 美幸", role: "staff" },
  { employeeId: "0039", name: "加藤 広大", role: "staff" },
  { employeeId: "0010", name: "楠 美佐", role: "staff" },
  { employeeId: "0022", name: "近藤 由美子", role: "staff" },
  { employeeId: "0002", name: "杉山 美佳子", role: "staff" },
  { employeeId: "0032", name: "関田 あゆみ", role: "staff" },
  { employeeId: "0000", name: "髙野 幹成", role: "admin" },
  { employeeId: "0040", name: "宝本 龍騎", role: "staff" },
  { employeeId: "0037", name: "長山 真梨奈", role: "staff" },
  { employeeId: "0026", name: "野仲 彩香", role: "staff" },
  { employeeId: "0016", name: "平井 英子", role: "staff" },
  { employeeId: "0035", name: "藤野 麻紀子", role: "staff" },
  { employeeId: "0015", name: "松嵜 愛梨", role: "admin" },
  { employeeId: "1120", name: "馬渕 尊至", role: "admin" },
  { employeeId: "0001", name: "山口 夕香里", role: "admin" },
  { employeeId: "0006", name: "山田 明美", role: "staff" },
  { employeeId: "0024", name: "湯本 智子", role: "staff" },
  { employeeId: "0017", name: "若森 直子", role: "staff" },
  { employeeId: "0041", name: "大堀SHIRLEY TAN", role: "staff" },
  { employeeId: "0042", name: "岩崎 亜友美", role: "staff" },
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

  // Get position groups
  const groups = await db.select().from(positionGroups);
  console.log("Position groups:", groups.map(g => `${g.id}: ${g.name}`).join(", "));

  // Look for 正社員 or パート for staff, 管理者 for admin
  const staffGroup = groups.find(g => g.name.includes("正社員")) || groups.find(g => g.name.includes("パート"));
  const adminGroup = groups.find(g => g.name.includes("管理者"));

  if (!staffGroup) {
    throw new Error("Staff position group (正社員 or パート) not found. Please create it first.");
  }

  console.log(`Using position groups: Staff=${staffGroup.id} (${staffGroup.name}), Admin=${adminGroup?.id || 'N/A'} (${adminGroup?.name || 'N/A'})`);
  console.log(`\nImporting ${employeeData.length} employees...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const emp of employeeData) {
    try {
      // Determine position group
      const positionGroupId = emp.role === "admin" && adminGroup ? adminGroup.id : staffGroup.id;

      // Check if employee already exists
      const existing = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeId, emp.employeeId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing employee
        await db
          .update(employees)
          .set({
            name: emp.name,
            positionGroupId: positionGroupId,
          })
          .where(eq(employees.employeeId, emp.employeeId));
        console.log(`✓ Updated: ${emp.employeeId} ${emp.name}`);
        updated++;
      } else {
        // Insert new employee
        await db.insert(employees).values({
          employeeId: emp.employeeId,
          name: emp.name,
          positionGroupId: positionGroupId,
          skillLevel: 100,
          canWorkNightShift: false,
          displayOrder: 0,
        });
        console.log(`✓ Created: ${emp.employeeId} ${emp.name}`);
        created++;
      }
    } catch (error: any) {
      console.error(`✗ Failed to import ${emp.employeeId} ${emp.name}:`, error.message);
      skipped++;
    }
  }

  await connection.end();

  console.log("\n=== Import Summary ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${employeeData.length}`);
  console.log("✓ Bulk import completed!");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
