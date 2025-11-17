import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";

/**
 * データベースの現在の状態を確認するスクリプト
 */
async function main() {
  console.log("📊 Checking database status...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // 各テーブルのレコード数を取得
  const userCount = await db.select().from(schema.users);
  const employeeCount = await db.select().from(schema.employees);
  const positionGroupCount = await db.select().from(schema.positionGroups);
  const workTimeSlotCount = await db.select().from(schema.workTimeSlots);
  const shiftCount = await db.select().from(schema.shifts);
  const shiftDetailCount = await db.select().from(schema.shiftDetails);
  const leaveRequestCount = await db.select().from(schema.leaveRequests);
  const changeProposalCount = await db.select().from(schema.changeProposals);
  const emergencyNotificationCount = await db.select().from(schema.emergencyNotifications);

  console.log("=== Current Database State ===\n");
  console.log(`👥 Users: ${userCount.length} records`);
  userCount.forEach(u => console.log(`   - ${u.name} (${u.email}) - Role: ${u.role}`));

  console.log(`\n👔 Position Groups: ${positionGroupCount.length} records`);
  positionGroupCount.forEach(p => console.log(`   - ${p.name} (${p.employmentType})`));

  console.log(`\n🕐 Work Time Slots: ${workTimeSlotCount.length} records`);
  workTimeSlotCount.forEach(w => console.log(`   - ${w.name} (${w.startTime} - ${w.endTime})`));

  console.log(`\n👷 Employees: ${employeeCount.length} records`);
  employeeCount.forEach(e => console.log(`   - ${e.employeeId}: ${e.name} (${e.email})`));

  console.log(`\n📅 Shifts: ${shiftCount.length} records`);
  shiftCount.forEach(s => console.log(`   - ${s.year}/${s.month} - ${s.name} (${s.status})`));

  console.log(`\n📋 Shift Details: ${shiftDetailCount.length} records`);
  console.log(`🏖️  Leave Requests: ${leaveRequestCount.length} records`);
  console.log(`🔄 Change Proposals: ${changeProposalCount.length} records`);
  console.log(`🚨 Emergency Notifications: ${emergencyNotificationCount.length} records`);

  console.log("\n=================================\n");

  if (userCount.length > 0 || employeeCount.length > 0) {
    console.log("⚠️  Database contains data!");
    console.log("   To clear all data and start fresh, run:");
    console.log("   pnpm clear-db");
  } else {
    console.log("✅ Database is empty and ready for production setup");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error checking database:", err);
  process.exit(1);
});
