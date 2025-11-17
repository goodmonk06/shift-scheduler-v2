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
      { id: 4, name: "夜勤入り", displayLabel: "夜", startTime: "16:00", endTime: "00:00", requiredStaff: 1 },
      { id: 5, name: "夜勤明け", displayLabel: "明", startTime: "00:00", endTime: "09:00", requiredStaff: 0 },
      { id: 7, name: "早番", displayLabel: "早", startTime: "06:00", endTime: "15:00", requiredStaff: 2 },
      { id: 8, name: "日勤A", displayLabel: "日A", startTime: "08:00", endTime: "17:00", requiredStaff: 2 },
      { id: 9, name: "日勤B", displayLabel: "日B", startTime: "09:00", endTime: "18:00", requiredStaff: 2 },
      { id: 10, name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", requiredStaff: 2 },
    ];

    for (const slot of correctSlots) {
      await db.update(workTimeSlots)
        .set({
          name: slot.name,
          displayLabel: slot.displayLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          requiredStaff: slot.requiredStaff
        })
        .where(eq(workTimeSlots.id, slot.id));

      console.log(`✅ ${slot.name}(${slot.displayLabel}): ${slot.startTime}-${slot.endTime} 必要人数:${slot.requiredStaff}`);
    }

    console.log("\n📌 更新後の確認:");
    const updatedSlots = await db.select().from(workTimeSlots);
    updatedSlots.forEach((slot: any) => {
      console.log(`  ID:${slot.id} ${slot.name}(${slot.displayLabel}) ${slot.startTime}-${slot.endTime} 必要:${slot.requiredStaff}人 夜勤:${slot.isNightShift ? '○' : '×'}`);
    });

    console.log("\n=== 修正完了 ===");

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

fixTimeSlots();