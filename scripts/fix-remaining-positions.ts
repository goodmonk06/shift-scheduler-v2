import { getDb } from "../server/db";
import { positionGroups } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixRemainingPositions() {
  const db = await getDb();

  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  console.log("=== 残りの勤務区分の最低休日数を設定 ===\n");

  try {
    // 事務員: 月10日休み（週休2日相当）
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 10 })
      .where(eq(positionGroups.name, "事務員"));
    console.log("  事務員: 10日/月に設定");

    // 管理者兼サ責: 月8日休み（管理職相当）
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 8 })
      .where(eq(positionGroups.name, "管理者兼サ責"));
    console.log("  管理者兼サ責: 8日/月に設定");

    // サ責: 月9日休み（正社員相当）
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 9 })
      .where(eq(positionGroups.name, "サ責"));
    console.log("  サ責: 9日/月に設定");

    console.log("\n✅ 設定完了\n");

    // 最終確認
    const allPositionGroups = await db.select().from(positionGroups);
    console.log("📌 全勤務区分の最低休日数:");
    allPositionGroups.forEach((group: any) => {
      console.log(`  ${group.name}: 最低休日数 ${group.minDaysOffPerMonth}日/月`);
    });

    console.log("\n=== すべての勤務区分の設定が完了しました ===");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

fixRemainingPositions();