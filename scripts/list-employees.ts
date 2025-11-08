import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";

/**
 * List all employees in the database
 */
async function main() {
  console.log("📋 Listing all employees...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  const employees = await db.select().from(schema.employees);

  if (employees.length === 0) {
    console.log("❌ No employees found");
    return;
  }

  console.log(`Found ${employees.length} employee(s):\n`);
  employees.forEach((emp) => {
    console.log(`- ${emp.employeeId}: ${emp.name} (${emp.email || "no email"})`);
    console.log(`  Position Group ID: ${emp.positionGroupId}`);
    console.log(`  User ID: ${emp.userId || "not linked"}\n`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to list employees:", err);
    process.exit(1);
  });
