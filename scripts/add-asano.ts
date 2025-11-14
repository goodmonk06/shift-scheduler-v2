import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees } from "../drizzle/schema";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, '');

  console.log("Connecting to database...");
  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  await db.insert(employees).values({
    employeeId: '0043',
    name: '淺野 穂菜美',
    positionGroupId: 7, // 正社員
    skillLevel: 100,
    canWorkNightShift: false,
    displayOrder: 27,
  });

  console.log('✓ Added 淺野 穂菜美 (ID: 0043, 正社員, displayOrder: 27)');
  await connection.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
