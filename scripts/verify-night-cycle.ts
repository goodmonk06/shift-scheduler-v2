import * as db from '../server/db';

async function verifyNightCycle() {
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('No shift found');
    process.exit(1);
  }

  const shiftDetails = await db.getShiftDetailsByShiftId(shift.id);

  // Get all night shifts
  const nightShifts = shiftDetails.filter(sd =>
    sd.status === 'working' && sd.startTime === '16:00' && sd.endTime === '09:00'
  );

  console.log('================================================================================');
  console.log('夜→明→休 3日間サイクル検証');
  console.log('================================================================================\n');

  // Track first 5 night shift employees
  const trackedShifts = nightShifts.slice(0, 5);

  for (const nightShift of trackedShifts) {
    const emp = await db.getEmployeeById(nightShift.employeeId);
    const nightDate = new Date(nightShift.date);

    console.log(`【${emp?.name}】`);
    console.log(`  Day 1 (${nightShift.date}): 夜勤入り ${nightShift.startTime}-${nightShift.endTime}`);

    // Check day 2 (day-off)
    const day2 = new Date(nightDate);
    day2.setDate(day2.getDate() + 1);
    const day2Str = day2.toISOString().split('T')[0];
    const day2Shift = shiftDetails.find(sd =>
      sd.employeeId === nightShift.employeeId && sd.date === day2Str
    );

    if (day2Shift) {
      if (day2Shift.status === 'working') {
        console.log(`  Day 2 (${day2Str}): ❌ 勤務配置あり（本来は明け）- ${day2Shift.startTime}-${day2Shift.endTime}`);
      } else {
        console.log(`  Day 2 (${day2Str}): ✅ 配置なし（夜勤明け）`);
      }
    } else {
      console.log(`  Day 2 (${day2Str}): ✅ シフトなし（夜勤明け）`);
    }

    // Check day 3 (rest)
    const day3 = new Date(nightDate);
    day3.setDate(day3.getDate() + 2);
    const day3Str = day3.toISOString().split('T')[0];
    const day3Shift = shiftDetails.find(sd =>
      sd.employeeId === nightShift.employeeId && sd.date === day3Str
    );

    if (day3Shift) {
      if (day3Shift.status === 'working') {
        console.log(`  Day 3 (${day3Str}): ❌ 勤務配置あり（本来は休み）- ${day3Shift.startTime}-${day3Shift.endTime}`);
      } else {
        console.log(`  Day 3 (${day3Str}): ✅ 配置なし（休み）`);
      }
    } else {
      console.log(`  Day 3 (${day3Str}): ✅ シフトなし（休み）`);
    }

    console.log();
  }

  console.log('================================================================================');
  console.log('✅ 検証完了');
  console.log('================================================================================\n');

  process.exit(0);
}

verifyNightCycle();
