import { config } from "dotenv";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createConnection(connectionString);

  console.log("Applying migration: add parentShiftId and ai_generated status...\n");

  const migrationPath = join(__dirname, "../drizzle/0016_add_parent_shift_and_ai_status.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Split by statement breakpoint and execute each statement
  const statements = migrationSQL
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      await connection.query(statement);
      console.log("✓ Success\n");
    } catch (error: any) {
      if (error.message.includes("Duplicate column")) {
        console.log("✓ Column already exists, skipping\n");
      } else if (error.message.includes("Duplicate key")) {
        console.log("✓ Constraint already exists, skipping\n");
      } else {
        throw error;
      }
    }
  }

  console.log("Migration completed successfully!");
  await connection.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
