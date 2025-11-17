import { getDb } from "../server/db";
import { workTimeSlots } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixTimeSlots() {
  const db = await getDb();

  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  console.log("=== 勤務時間枠の修正 ===\n");

  try {
    // 正しい勤務時間枠の定義
    const correctSlots = [
      { id: 4, name: "夜", displayName: "夜勤入り", startTime: "16:00", endTime: "00:00", requiredStaff: 1 },
      { id: 5, name: "明", displayName: "夜勤明け", startTime: "00:00", endTime: "09:00", requiredStaff: 0 },
      { id: 7, name: "早", displayName: "早番", startTime: "06:00", endTime: "15:00", requiredStaff: 2 },
      { id: 8, name: "日A", displayName: "日勤A", startTime: "08:00", endTime: "17:00", requiredStaff: 2 },
      { id: 9, name: "日B", displayName: "日勤B", startTime: "09:00", endTime: "18:00", requiredStaff: 2 },
      { id: 10, name: "遅", displayName: "遅番", startTime: "11:00", endTime: "20:00", requiredStaff: 2 },
    ];

    for (const slot of correctSlots) {
      await db.update(workTimeSlots)
        .set({
          name: slot.name,
          displayName: slot.displayName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          requiredStaff: slot.requiredStaff
        })
        .where(eq(workTimeSlots.id, slot.id));

      console.log(`✅ ${slot.displayName}(${slot.name}): ${slot.startTime}-${slot.endTime} 必要人数:${slot.requiredStaff}`);
    }

    console.log("\n📌 更新後の確認:");
    const updatedSlots = await db.select().from(workTimeSlots);
    updatedSlots.forEach((slot: any) => {
      console.log(`  ID:${slot.id} ${slot.displayName}(${slot.name}) ${slot.startTime}-${slot.endTime} 必要:${slot.requiredStaff}人 夜勤:${slot.isNightShift ? '○' : '×'}`);
    });

    console.log("\n=== 修正完了 ===");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

fixTimeSlots();