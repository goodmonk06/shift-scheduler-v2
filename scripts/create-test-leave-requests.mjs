import { drizzle } from "drizzle-orm/mysql2";
import { leaveRequests, employees } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function createTestLeaveRequests() {
  console.log("テスト用希望休データを作成します...");

  try {
    const employeeList = await db.select().from(employees).limit(3);

    if (employeeList.length === 0) {
      console.log("職員データが見つかりません。先にテストデータを作成してください。");
      process.exit(1);
    }

    // 希望休データ1: 承認待ち
    await db.insert(leaveRequests).values({
      employeeId: employeeList[0].id,
      startDate: "2025-11-15",
      endDate: "2025-11-15",
      reason: "私用のため",
      status: "pending",
    });
    console.log(`✓ ${employeeList[0].name}の希望休（承認待ち）を作成しました`);

    // 希望休データ2: 承認済み
    if (employeeList.length > 1) {
      await db.insert(leaveRequests).values({
        employeeId: employeeList[1].id,
        startDate: "2025-11-20",
        endDate: "2025-11-21",
        reason: "家族の用事",
        status: "approved",
      });
      console.log(`✓ ${employeeList[1].name}の希望休（承認済み）を作成しました`);
    }

    // 希望休データ3: 却下済み
    if (employeeList.length > 2) {
      await db.insert(leaveRequests).values({
        employeeId: employeeList[2].id,
        startDate: "2025-11-25",
        endDate: "2025-11-25",
        reason: "体調不良",
        status: "rejected",
      });
      console.log(`✓ ${employeeList[2].name}の希望休（却下済み）を作成しました`);
    }

    console.log("\n✓ テスト用希望休データの作成が完了しました");
    console.log("\n管理者画面の「希望休管理」から確認できます。");

  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }

  process.exit(0);
}

createTestLeaveRequests();
