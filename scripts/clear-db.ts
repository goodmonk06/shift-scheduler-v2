import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * データベースのすべてのテーブルをクリアするスクリプト
 * ⚠️ 注意: このスクリプトはすべてのデータを削除します！
 */
async function main() {
  console.log("⚠️  WARNING: This will delete ALL data from the database!");
  console.log("⏳ Starting database cleanup in 3 seconds...\n");

  await new Promise(resolve => setTimeout(resolve, 3000));

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  console.log("🗑️  Clearing database...\n");

  // 外部キー制約を一時的に無効化
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  try {
    // 依存関係の順番で削除（子テーブル → 親テーブル）
    await db.delete(schema.shiftActuals);
    console.log("✅ Cleared: shiftActuals");

    await db.delete(schema.pushSubscriptions);
    console.log("✅ Cleared: pushSubscriptions");

    await db.delete(schema.auditLogs);
    console.log("✅ Cleared: auditLogs");

    await db.delete(schema.shiftFeedback);
    console.log("✅ Cleared: shiftFeedback");

    await db.delete(schema.emergencyNotifications);
    console.log("✅ Cleared: emergencyNotifications");

    await db.delete(schema.changeProposals);
    console.log("✅ Cleared: changeProposals");

    await db.delete(schema.leaveRequests);
    console.log("✅ Cleared: leaveRequests");

    await db.delete(schema.shiftDetails);
    console.log("✅ Cleared: shiftDetails");

    await db.delete(schema.shifts);
    console.log("✅ Cleared: shifts");

    await db.delete(schema.requiredStaffing);
    console.log("✅ Cleared: requiredStaffing");

    await db.delete(schema.workplaceRules);
    console.log("✅ Cleared: workplaceRules");

    await db.delete(schema.employeeConstraints);
    console.log("✅ Cleared: employeeConstraints");

    await db.delete(schema.staffSettings);
    console.log("✅ Cleared: staffSettings");

    await db.delete(schema.employees);
    console.log("✅ Cleared: employees");

    await db.delete(schema.workTimeSlots);
    console.log("✅ Cleared: workTimeSlots");

    await db.delete(schema.positionGroups);
    console.log("✅ Cleared: positionGroups");

    await db.delete(schema.users);
    console.log("✅ Cleared: users");

    console.log("\n🎉 All data has been cleared!");
    console.log("\n📝 Next steps:");
    console.log("  1. Run 'pnpm setup-admin' to create an admin account");
    console.log("  2. Login to the admin panel and start setting up:");
    console.log("     - Position Groups (役職グループ)");
    console.log("     - Work Time Slots (勤務時間枠)");
    console.log("     - Employees (職員)");
    console.log("     - Workplace Rules (職場ルール)");
    console.log("     - Required Staffing (必要人数設定)");

  } finally {
    // 外部キー制約を再度有効化
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error clearing database:", err);
  process.exit(1);
});
