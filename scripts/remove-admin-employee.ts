import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Remove ADMIN001 from employees table
 * Admins should not be employees
 */
async function main() {
  console.log("🗑️  Removing ADMIN001 from employees table...");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // Delete ADMIN001 from employees
  await db
    .delete(schema.employees)
    .where(eq(schema.employees.employeeId, "ADMIN001"));

  console.log("✅ ADMIN001 removed from employees table");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to remove ADMIN001:", err);
    process.exit(1);
  });
