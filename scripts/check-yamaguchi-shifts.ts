import * as db from '../server/db';

async function checkYamaguchiShifts() {
  console.log('================================================================================');
  console.log('山口夕香里さんのシフト詳細確認');
  console.log('================================================================================\n');

  // 山口夕香里さんのemployeeIdを取得
  const employees = await db.getAllEmployees();
  const yamaguchi = employees.find(e => e.name === '山口 夕香里');

  if (!yamaguchi) {
    console.log('❌ 山口夕香里さんが見つかりません');
    process.exit(1);
  }

  console.log(`✅ 山口夕香里さん (ID: ${yamaguchi.id}, Display: ${yamaguchi.displayId})\n`);

  // 12月シフトを取得
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('❌ 2025年12月のシフトが見つかりません');
    process.exit(1);
  }

  // 山口さんのシフト詳細を取得
  const allDetails = await db.getShiftDetailsByShiftId(shift.id);
  const yamaguchiShifts = allDetails
    .filter(d => d.employeeId === yamaguchi.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`📊 シフト総数: ${yamaguchiShifts.length}件\n`);
  console.log('================================================================================');
  console.log('日付順シフト一覧');
  console.log('================================================================================\n');

  // workTimeSlotsを取得
  const slots = await db.getAllWorkTimeSlots();
  const slotMap = new Map(slots.map(s => [s.id, s]));

  for (const detail of yamaguchiShifts) {
    const date = new Date(detail.date);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    let shiftInfo = '';

    if (detail.status === 'requested_off') {
      shiftInfo = `休 (${detail.leaveType || '希望休'})`;
    } else if (detail.status === 'working') {
      if (detail.timeSlotId) {
        const slot = slotMap.get(detail.timeSlotId);
        shiftInfo = `${slot?.name || '不明'} (${detail.startTime || slot?.startTime}-${detail.endTime || slot?.endTime})`;
      } else if (detail.startTime && detail.endTime) {
        shiftInfo = `夜勤明け？ (${detail.startTime}-${detail.endTime})`;
      } else {
        shiftInfo = `不明 (timeSlot: null, 時刻: なし)`;
      }
    } else {
      shiftInfo = `その他 (${detail.status})`;
    }

    console.log(`  ${dateStr}: ${shiftInfo} [${detail.generatedBy || 'unknown'}]`);
  }

  console.log('\n================================================================================');
  console.log('生成方法別集計');
  console.log('================================================================================\n');

  const byGenerated = yamaguchiShifts.reduce((acc, d) => {
    const method = d.generatedBy || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [method, count] of Object.entries(byGenerated)) {
    console.log(`  ${method}: ${count}件`);
  }

  console.log('\n================================================================================');
  console.log('夜勤シフト確認');
  console.log('================================================================================\n');

  const nightShifts = yamaguchiShifts.filter(d =>
    d.status === 'working' && d.startTime === '16:00' && d.endTime === '09:00'
  );

  console.log(`夜勤入り: ${nightShifts.length}件\n`);

  for (const nightShift of nightShifts) {
    const nightDate = new Date(nightShift.date);
    const day2 = new Date(nightDate);
    day2.setDate(day2.getDate() + 1);
    const day3 = new Date(nightDate);
    day3.setDate(day3.getDate() + 2);

    const day2Str = day2.toISOString().split('T')[0];
    const day3Str = day3.toISOString().split('T')[0];

    const day2Shift = yamaguchiShifts.find(d => d.date === day2Str);
    const day3Shift = yamaguchiShifts.find(d => d.date === day3Str);

    console.log(`【夜勤サイクル: ${nightShift.date}】`);
    console.log(`  Day 1 (${nightShift.date}): 夜勤入り ${nightShift.startTime}-${nightShift.endTime}`);

    if (day2Shift) {
      if (day2Shift.status === 'working' && day2Shift.startTime === '00:00' && day2Shift.endTime === '09:00') {
        console.log(`  Day 2 (${day2Str}): ✅ 夜勤明け ${day2Shift.startTime}-${day2Shift.endTime}`);
      } else if (day2Shift.status === 'working') {
        console.log(`  Day 2 (${day2Str}): ❌ 別の勤務 (${day2Shift.startTime}-${day2Shift.endTime})`);
      } else {
        console.log(`  Day 2 (${day2Str}): ⚠️  休み (${day2Shift.status})`);
      }
    } else {
      console.log(`  Day 2 (${day2Str}): ❌ シフトなし（夜勤明けがない）`);
    }

    if (day3Shift) {
      if (day3Shift.status === 'requested_off') {
        console.log(`  Day 3 (${day3Str}): ✅ 休み (${day3Shift.leaveType || '希望休'})`);
      } else {
        console.log(`  Day 3 (${day3Str}): ❌ 勤務配置あり`);
      }
    } else {
      console.log(`  Day 3 (${day3Str}): ❌ シフトなし`);
    }
    console.log();
  }

  console.log('================================================================================');
  console.log('✅ 確認完了');
  console.log('================================================================================\n');

  process.exit(0);
}

checkYamaguchiShifts();
