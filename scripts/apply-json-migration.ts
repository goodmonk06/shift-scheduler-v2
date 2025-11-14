import { config } from "dotenv";
import mysql from "mysql2/promise";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", dbUrl ? "Found" : "Not found");

  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(connectionString);

  console.log("Connected. Applying migration...\\n");

  try {
    // 既存のテキストデータをクリア
    console.log("Clearing existing text data...");
    await connection.query(`
      UPDATE employees
      SET additionalConstraints = NULL
      WHERE additionalConstraints IS NOT NULL
    `);
    console.log("✓ Cleared existing text data");

    // additionalConstraintsをJSON型に変更
    console.log("Converting to JSON type...");
    await connection.query(`
      ALTER TABLE employees
      MODIFY COLUMN additionalConstraints json
    `);
    console.log("✓ Modified employees.additionalConstraints to JSON type");
  } catch (error: any) {
    console.log("✗ Migration error:", error.message);
    throw error;
  }

  await connection.end();
  console.log("\\n✓ Migration applied successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
