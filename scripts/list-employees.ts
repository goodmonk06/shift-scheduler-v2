import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { employees } from "../drizzle/schema";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  const connection = await mysql.createPool(connectionString);
  const db = drizzle(connection);

  const allEmployees = await db.select().from(employees);

  console.log(`Total employees: ${allEmployees.length}\n`);

  allEmployees.forEach((emp) => {
    console.log(`ID: ${emp.id}, Name: "${emp.name}", EmployeeID: ${emp.employeeId}`);
  });

  await connection.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
