import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../drizzle/schema";

/**
 * 初回のテストデータを投入するスクリプト
 * 必要に応じてデータを追加してください
 */
async function main() {
  console.log("🌱 Seeding database...");

  // 例：初期ユーザーの作成（管理者）
  // await db.insert(schema.users).values({
  //   openId: "admin-001",
  //   name: "管理者",
  //   email: "admin@example.com",
  //   role: "admin",
  // });

  // 例：役職グループの作成
  // await db.insert(schema.positionGroups).values([
  //   { name: "正社員", employmentType: "fulltime", displayOrder: 1 },
  //   { name: "パート", employmentType: "parttime", displayOrder: 2 },
  // ]);

  // 例：勤務時間枠の作成
  // await db.insert(schema.workTimeSlots).values([
  //   { name: "早番", displayLabel: "早", startTime: "07:00", endTime: "16:00", isNightShift: false },
  //   { name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", isNightShift: false },
  //   { name: "夜勤", displayLabel: "夜", startTime: "16:00", endTime: "09:00", isNightShift: true },
  // ]);

  console.log("✅ Seeding complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
