import "dotenv/config";
import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";

/**
 * 初回のテストデータを投入するスクリプト
 * 必要に応じてデータを追加してください
 */
async function main() {
  console.log("🌱 Seeding database...");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // 初期ユーザーの作成（管理者）
  await db.insert(schema.users).values({
    openId: "admin-001",
    name: "管理者",
    email: "admin@example.com",
    role: "admin",
  });
  console.log("✅ Created admin user");

  // 役職グループの作成
  const positionGroups = await db.insert(schema.positionGroups).values([
    { name: "正社員", employmentType: "fulltime", displayOrder: 1 },
    { name: "パート", employmentType: "parttime", displayOrder: 2 },
  ]).$returningId();
  console.log("✅ Created position groups");

  const positionGroup1Id = positionGroups[0].id;
  const positionGroup2Id = positionGroups[1].id;

  // 勤務時間枠の作成
  await db.insert(schema.workTimeSlots).values([
    { name: "早番", displayLabel: "早", startTime: "07:00", endTime: "16:00", isNightShift: false },
    { name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", isNightShift: false },
    { name: "夜勤", displayLabel: "夜", startTime: "16:00", endTime: "09:00", isNightShift: true },
  ]);
  console.log("✅ Created work time slots");

  // テスト職員の作成（管理者は職員ではないので含めない）
  const employees = await db.insert(schema.employees).values([
    {
      employeeId: "EMP00001",
      name: "山田太郎",
      email: "yamada@example.com",
      positionGroupId: positionGroup1Id,
      skillLevel: 100,
      canWorkNightShift: true,
      displayOrder: 1,
    },
    {
      employeeId: "EMP00002",
      name: "佐藤花子",
      email: "sato@example.com",
      positionGroupId: positionGroup1Id,
      skillLevel: 100,
      canWorkNightShift: true,
      displayOrder: 2,
    },
    {
      employeeId: "EMP00003",
      name: "田中次郎",
      email: "tanaka@example.com",
      positionGroupId: positionGroup2Id,
      skillLevel: 50,
      canWorkNightShift: false,
      displayOrder: 3,
    },
  ]).$returningId();
  console.log("✅ Created test employees (3 users)");

  const employeeIds = employees.map(e => e.id);

  // 管理者ユーザーの取得（shifts作成用）
  const adminUser = await db.select().from(schema.users).where(
    (user) => user.email === "admin@example.com"
  ).limit(1);
  const adminUserId = adminUser[0]?.id || 1;

  // テストシフトの作成
  const testShifts = await db.insert(schema.shifts).values([
    {
      userId: adminUserId,
      year: 2025,
      month: 12,
      name: "2025年12月シフト（下書き）",
      status: "draft",
      generatedBy: "manual",
      leaveRequestDeadline: new Date("2025-11-25T23:59:59"),
    },
    {
      userId: adminUserId,
      year: 2025,
      month: 11,
      name: "2025年11月シフト（仮確定）",
      status: "tentative",
      generatedBy: "ai",
      leaveRequestDeadline: new Date("2025-10-25T23:59:59"),
      additionalRequestDeadline: new Date("2025-11-15T23:59:59"),
      tentativePublishedAt: new Date("2025-11-01T10:00:00"),
    },
  ]).$returningId();
  console.log("✅ Created test shifts (2 shifts)");

  const draftShiftId = testShifts[0].id;
  const tentativeShiftId = testShifts[1].id;

  // テスト希望休の作成
  await db.insert(schema.leaveRequests).values([
    {
      employeeId: employeeIds[0], // 山田太郎
      shiftId: tentativeShiftId,
      requestDate: "2025-11-10",
      startDate: "2025-11-10",
      endDate: "2025-11-10",
      leaveType: "休",
      status: "pending",
      isAdditional: false,
    },
    {
      employeeId: employeeIds[1], // 佐藤花子
      shiftId: tentativeShiftId,
      requestDate: "2025-11-15",
      startDate: "2025-11-15",
      endDate: "2025-11-15",
      leaveType: "時間指定",
      startTime: "14:00",
      endTime: "18:00",
      status: "approved",
      isAdditional: true,
    },
    {
      employeeId: employeeIds[2], // 田中次郎
      shiftId: draftShiftId,
      requestDate: "2025-12-20",
      startDate: "2025-12-20",
      endDate: "2025-12-22",
      leaveType: "有休",
      status: "pending",
      isAdditional: false,
    },
  ]);
  console.log("✅ Created test leave requests (3 requests)");

  console.log("\n🎉 Seeding complete!");
  console.log("\n📝 Test Data Summary:");
  console.log("  - Admin user: admin@example.com");
  console.log("  - Employees: EMP00001 (山田太郎), EMP00002 (佐藤花子), EMP00003 (田中次郎)");
  console.log("  - Position groups: 正社員, パート");
  console.log("  - Work time slots: 早番, 遅番, 夜勤");
  console.log("  - Shifts: 2025年11月 (tentative), 2025年12月 (draft)");
  console.log("  - Leave requests: 3 requests");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
