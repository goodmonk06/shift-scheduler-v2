import * as db from '../server/db';

async function checkTimeSlots() {
  try {
    console.log('🔍 現在のworkTimeSlotsを確認中...\n');

    const slots = await db.getAllWorkTimeSlots();

    if (slots.length === 0) {
      console.log('❌ workTimeSlotsにデータがありません');
      return;
    }

    console.log(`✅ ${slots.length}件のデータが登録されています:\n`);

    const EXPECTED = [
      { name: "夜勤", startTime: "16:00", endTime: "09:00", isNightShift: true, requiredStaff: 1 },
      { name: "早番", startTime: "06:00", endTime: "15:00", isNightShift: false, requiredStaff: 2 },
      { name: "日勤A", startTime: "08:00", endTime: "17:00", isNightShift: false, requiredStaff: 3 },
      { name: "日勤B", startTime: "09:00", endTime: "18:00", isNightShift: false, requiredStaff: 3 },
      { name: "遅番", startTime: "11:00", endTime: "20:00", isNightShift: false, requiredStaff: 2 },
    ];

    let allCorrect = true;

    slots.forEach((slot, index) => {
      const expected = EXPECTED.find(e => e.name === slot.name);
      const isCorrect = expected &&
        slot.startTime === expected.startTime &&
        slot.endTime === expected.endTime &&
        slot.isNightShift === expected.isNightShift &&
        slot.requiredStaff === expected.requiredStaff;

      const status = isCorrect ? '✅' : '❌';
      console.log(`${status} ${slot.name} (${slot.displayLabel}): ${slot.startTime}～${slot.endTime}, 夜勤=${slot.isNightShift}, 必要人数=${slot.requiredStaff}`);

      if (!isCorrect) {
        allCorrect = false;
        if (expected) {
          console.log(`   期待値: ${expected.startTime}～${expected.endTime}, 夜勤=${expected.isNightShift}, 必要人数=${expected.requiredStaff}`);
        }
      }
    });

    console.log('\n' + (allCorrect ? '🎉 すべて正しく設定されています！' : '⚠️  修正が必要なデータがあります'));

    process.exit(allCorrect ? 0 : 1);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkTimeSlots();
