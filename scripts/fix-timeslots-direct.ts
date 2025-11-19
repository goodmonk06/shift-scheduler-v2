import * as db from '../server/db';

const CORRECT_TIME_SLOTS = [
  { name: "夜勤", displayLabel: "夜", startTime: "16:00", endTime: "09:00", isNightShift: true, requiredStaff: 1 },
  { name: "早番", displayLabel: "早", startTime: "06:00", endTime: "15:00", isNightShift: false, requiredStaff: 2 },
  { name: "日勤A", displayLabel: "日A", startTime: "08:00", endTime: "17:00", isNightShift: false, requiredStaff: 3 },
  { name: "日勤B", displayLabel: "日B", startTime: "09:00", endTime: "18:00", isNightShift: false, requiredStaff: 3 },
  { name: "遅番", displayLabel: "遅", startTime: "11:00", endTime: "20:00", isNightShift: false, requiredStaff: 2 },
];

async function fixTimeSlots() {
  try {
    console.log('🔧 勤務時間枠を修正中...');

    const database = await db.getDb();

    await database.transaction(async (tx) => {
      // 既存データを削除
      console.log('📝 既存データを削除...');
      await tx.execute({ sql: "DELETE FROM workTimeSlots" });

      // 正しいデータを追加
      console.log('📝 正しいデータを追加...');
      for (const slot of CORRECT_TIME_SLOTS) {
        await db.createWorkTimeSlot(slot);
        console.log(`  ✅ ${slot.name} (${slot.startTime}～${slot.endTime})`);
      }
    });

    // 確認
    const updated = await db.getAllWorkTimeSlots();
    console.log('\n✅ 修正完了！以下のデータが登録されました:');
    console.log(JSON.stringify(updated, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

fixTimeSlots();
