import { config } from "dotenv";
import mysql from "mysql2/promise";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createConnection(connectionString);

  console.log("Checking requiredStaffing table structure...\n");

  const [columns] = await connection.query(`
    SHOW COLUMNS FROM requiredStaffing
  `);

  console.log("Columns:");
  console.log(columns);

  console.log("\nChecking existing data count...\n");

  const [countResult] = await connection.query(`
    SELECT COUNT(*) as count FROM requiredStaffing
  `);

  console.log("Existing records:", countResult);

  await connection.end();
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
