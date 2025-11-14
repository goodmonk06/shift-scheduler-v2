import { config } from "dotenv";
import mysql from "mysql2/promise";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createConnection(connectionString);

  console.log("Adding staffingDetails column to requiredStaffing table...\n");

  try {
    await connection.query(`
      ALTER TABLE requiredStaffing ADD staffingDetails json
    `);
    console.log("✓ Column added successfully");
  } catch (error: any) {
    if (error.message.includes("Duplicate column")) {
      console.log("✓ Column already exists");
    } else {
      throw error;
    }
  }

  await connection.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
