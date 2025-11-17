import { config } from "dotenv";
import mysql from "mysql2/promise";

config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connectionString = dbUrl.replace(/[?&]ssl-mode=[^&]*/g, "");
  console.log("Connecting to database...\n");

  const connection = await mysql.createConnection(connectionString);

  // 12月の希望休を確認
  console.log("=== Checking Leave Requests for December 2025 ===\n");
  const [leaveRequests] = await connection.query(`
    SELECT lr.*, e.name as employeeName
    FROM leaveRequests lr
    LEFT JOIN employees e ON lr.employeeId = e.id
    WHERE lr.startDate LIKE '2025-12%'
    ORDER BY lr.employeeId, lr.startDate
  `);

  console.log(`Found ${(leaveRequests as any[]).length} leave requests for December 2025:\n`);

  if ((leaveRequests as any[]).length > 0) {
    console.table((leaveRequests as any[]).map((lr: any) => ({
      id: lr.id,
      employeeId: lr.employeeId,
      employeeName: lr.employeeName,
      startDate: lr.startDate,
      leaveType: lr.leaveType,
      status: lr.status,
      shiftId: lr.shiftId,
      submittedAt: lr.submittedAt,
    })));
  }

  // 12月のシフトを確認
  console.log("\n=== Checking Shifts for December 2025 ===\n");
  const [shifts] = await connection.query(`
    SELECT id, year, month, name, status, createdAt
    FROM shifts
    WHERE year = 2025 AND month = 12
    ORDER BY id DESC
  `);

  console.log(`Found ${(shifts as any[]).length} shifts for December 2025:\n`);

  if ((shifts as any[]).length > 0) {
    console.table(shifts);
  } else {
    console.log("⚠️  No shift found for December 2025!");
  }

  // 上条やえ子さんの情報を確認
  console.log("\n=== Checking Employee 上条やえ子 ===\n");
  const [employees] = await connection.query(`
    SELECT * FROM employees WHERE name LIKE '%上条%' OR name LIKE '%やえ子%'
  `);

  if ((employees as any[]).length > 0) {
    console.table(employees);
  } else {
    console.log("⚠️  Employee not found with name containing '上条' or 'やえ子'");
  }

  await connection.end();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
