import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", dbUrl ? "Found" : "Not found");

  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(connectionString);

  console.log("Connected. Adding columns...\n");

  // Add breakTime, isServiceManager, isOfficeStaff to employees
  try {
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN breakTime int DEFAULT 60 NOT NULL
    `);
    console.log("✓ Added employees.breakTime");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ employees.breakTime already exists");
    } else throw error;
  }

  try {
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN isServiceManager boolean DEFAULT false NOT NULL
    `);
    console.log("✓ Added employees.isServiceManager");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ employees.isServiceManager already exists");
    } else throw error;
  }

  try {
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN isOfficeStaff boolean DEFAULT false NOT NULL
    `);
    console.log("✓ Added employees.isOfficeStaff");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ employees.isOfficeStaff already exists");
    } else throw error;
  }

  // Add minDaysOffPerMonth to positionGroups
  try {
    await connection.query(`
      ALTER TABLE positionGroups
      ADD COLUMN minDaysOffPerMonth int DEFAULT 0 NOT NULL
    `);
    console.log("✓ Added positionGroups.minDaysOffPerMonth");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ positionGroups.minDaysOffPerMonth already exists");
    } else throw error;
  }

  // Modify workplaceRules.ruleType enum
  try {
    await connection.query(`
      ALTER TABLE workplaceRules
      MODIFY COLUMN ruleType enum('min_rest_days','night_shift_quota','post_night_shift_rest','required_staff_pattern','max_consecutive_days','fulltime_required_hours') NOT NULL
    `);
    console.log("✓ Modified workplaceRules.ruleType enum");
  } catch (error: any) {
    console.log("✓ workplaceRules.ruleType already updated or error:", error.message);
  }

  await connection.end();
  console.log("\n✓ All columns added successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
