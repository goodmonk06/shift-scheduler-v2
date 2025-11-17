import { getDb } from "../server/db";
import { workTimeSlots, positionGroups } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixRuleGenConfig() {
  const db = await getDb();

  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  console.log("=== ルールベース生成設定を修正 ===\n");

  try {
    // 1. 勤務時間枠の必要人数を修正
    console.log("📌 勤務時間枠の必要人数を修正中...");

    // 夜勤 (16:00-00:00) - 1名必要（変更なし）
    await db.update(workTimeSlots)
      .set({ requiredStaff: 1 })
      .where(eq(workTimeSlots.id, 4));
    console.log("  夜勤 (16:00-00:00): 1名に設定");

    // 夜勤明け (00:00-09:00) - 0名必要（自動割り当て）
    await db.update(workTimeSlots)
      .set({ requiredStaff: 0 })
      .where(eq(workTimeSlots.id, 5));
    console.log("  夜勤明け (00:00-09:00): 0名に設定（自動）");

    // 早番 (07:00-16:00) - 2名必要
    await db.update(workTimeSlots)
      .set({ requiredStaff: 2 })
      .where(eq(workTimeSlots.id, 7));
    console.log("  早番 (07:00-16:00): 2名に設定");

    // 日勤A (08:00-17:00) - 2名必要
    await db.update(workTimeSlots)
      .set({ requiredStaff: 2 })
      .where(eq(workTimeSlots.id, 8));
    console.log("  日勤A (08:00-17:00): 2名に設定");

    // 日勤B (09:00-18:00) - 2名必要
    await db.update(workTimeSlots)
      .set({ requiredStaff: 2 })
      .where(eq(workTimeSlots.id, 9));
    console.log("  日勤B (09:00-18:00): 2名に設定");

    // 遅番 (11:00-20:00) - 2名必要
    await db.update(workTimeSlots)
      .set({ requiredStaff: 2 })
      .where(eq(workTimeSlots.id, 10));
    console.log("  遅番 (11:00-20:00): 2名に設定");

    console.log("\n✅ 勤務時間枠の設定完了（1日合計：9名）\n");

    // 2. 勤務区分別の最低休日数を設定
    console.log("📌 勤務区分別の最低休日数を修正中...");

    // 管理者: 月8日休み
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 8 })
      .where(eq(positionGroups.name, "管理者"));
    console.log("  管理者: 8日/月に設定");

    // 正社員: 月9日休み（既存のまま）
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 9 })
      .where(eq(positionGroups.name, "正社員"));
    console.log("  正社員: 9日/月に設定");

    // パート: 月12日休み（週3-4勤務想定）
    await db.update(positionGroups)
      .set({ minDaysOffPerMonth: 12 })
      .where(eq(positionGroups.name, "パート"));
    console.log("  パート: 12日/月に設定");

    console.log("\n✅ 勤務区分の設定完了\n");

    // 3. 設定後の確認
    console.log("📌 更新後の設定を確認:");

    const updatedTimeSlots = await db.select().from(workTimeSlots);
    console.log("\n勤務時間枠:");
    updatedTimeSlots.forEach((slot: any) => {
      console.log(`  ID:${slot.id} ${slot.name} (${slot.startTime}-${slot.endTime}) 必要人数:${slot.requiredStaff} 夜勤:${slot.isNightShift ? '○' : '×'}`);
    });

    const updatedPositionGroups = await db.select().from(positionGroups);
    console.log("\n勤務区分:");
    updatedPositionGroups.forEach((group: any) => {
      console.log(`  ${group.name}: 最低休日数 ${group.minDaysOffPerMonth}日/月`);
    });

    console.log("\n=== 設定修正完了 ===");
    console.log("次のステップ: ルールベース生成を再実行してください");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

fixRuleGenConfig();