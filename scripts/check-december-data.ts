import * as db from '../server/db';

async function checkDecemberData() {
  try {
    console.log('🔍 12月のデータを確認中...\n');

    // 従業員数と職位グループ
    const employees = await db.getAllEmployees();
    const positionGroups = await db.getAllPositionGroups();
    console.log(`✅ 従業員数: ${employees.length}名`);

    const fullTime = employees.filter(e => {
      const group = positionGroups.find(g => g.id === e.positionGroupId);
      return group?.employmentType === 'fulltime';
    });
    console.log(`   - 正社員: ${fullTime.length}名`);
    console.log(`   - パート: ${employees.length - fullTime.length}名`);

    // 職位グループの詳細
    console.log('\n職位グループ:');
    positionGroups.forEach(g => {
      const count = employees.filter(e => e.positionGroupId === g.id).length;
      console.log(`   - ${g.name} (${g.employmentType}): ${count}名`);
    });

    // 勤務時間枠
    const timeSlots = await db.getAllWorkTimeSlots();
    console.log(`\n✅ 勤務時間枠: ${timeSlots.length}件`);
    timeSlots.forEach(slot => {
      console.log(`   - ${slot.name}: ${slot.startTime}～${slot.endTime} (必要人数=${slot.requiredStaff})`);
    });

    // 必要人数設定
    const requiredStaffing = await db.getAllRequiredStaffing();
    console.log(`\n✅ 必要人数設定: ${requiredStaffing.length}件`);
    if (requiredStaffing.length > 0) {
      console.log('   サンプル（月曜9時～16時）:');
      for (let hour = 9; hour <= 16; hour++) {
        const req = requiredStaffing.find(r => r.dayOfWeek === 1 && r.hour === hour);
        if (req) {
          console.log(`   - ${hour}時: ${req.requiredCount}名`);
        }
      }
    }

    console.log('\n準備完了！段階的生成をテストできます。');
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkDecemberData();
