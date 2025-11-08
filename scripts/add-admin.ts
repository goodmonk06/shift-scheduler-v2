import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Add ADMIN001 employee if it doesn't exist
 */
async function main() {
  console.log("🔍 Checking for ADMIN001 employee...");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // Check if ADMIN001 already exists
  const existing = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.employeeId, "ADMIN001"))
    .limit(1);

  if (existing.length > 0) {
    console.log("✅ ADMIN001 already exists");
    return;
  }

  // Get the first position group (正社員)
  const positionGroups = await db
    .select()
    .from(schema.positionGroups)
    .where(eq(schema.positionGroups.employmentType, "fulltime"))
    .limit(1);

  if (positionGroups.length === 0) {
    throw new Error("No position groups found. Please run seed script first.");
  }

  // Insert ADMIN001
  await db.insert(schema.employees).values({
    employeeId: "ADMIN001",
    name: "管理者",
    email: "admin@example.com",
    positionGroupId: positionGroups[0].id,
    isActive: true,
  });

  console.log("✅ Added ADMIN001 employee");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to add ADMIN001:", err);
    process.exit(1);
  });
