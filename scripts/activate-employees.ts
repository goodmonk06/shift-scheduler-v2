import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Activate all employees
 */
async function main() {
  console.log("🔄 Activating all employees...");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // Get all employees
  const employees = await db.select().from(schema.employees);

  // Update each employee to be active
  for (const emp of employees) {
    await db
      .update(schema.employees)
      .set({ isActive: true })
      .where(eq(schema.employees.id, emp.id));
  }

  console.log(`✅ Activated ${employees.length} employee(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to activate employees:", err);
    process.exit(1);
  });
