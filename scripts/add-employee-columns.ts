import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load .env file
config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", dbUrl ? "Found" : "Not found");

  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Remove ssl-mode parameter if present (not supported by mysql2)
  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');

  console.log("Connecting to database...");

  const connection = await mysql.createConnection(connectionString);

  console.log("Connected. Adding columns...");

  try {
    // Add workableDays column
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN workableDays json
    `);
    console.log("✓ Added workableDays column");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ workableDays column already exists");
    } else {
      console.error("Error adding workableDays:", error.message);
      throw error;
    }
  }

  try {
    // Add additionalConstraints column
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN additionalConstraints text
    `);
    console.log("✓ Added additionalConstraints column");
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ additionalConstraints column already exists");
    } else {
      console.error("Error adding additionalConstraints:", error.message);
      throw error;
    }
  }

  await connection.end();
  console.log("✓ Migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
