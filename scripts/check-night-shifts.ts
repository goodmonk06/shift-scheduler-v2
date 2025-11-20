import * as db from '../server/db';

async function checkNightShifts() {
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('No shift found');
    process.exit(1);
  }

  const shiftDetails = await db.getShiftDetailsByShiftId(shift.id);

  // Sample first 5 working shifts
  const working = shiftDetails.filter(sd => sd.status === 'working').slice(0, 5);

  console.log('Sample working shifts:');
  for (const sd of working) {
    const emp = await db.getEmployeeById(sd.employeeId);
    console.log(`- ${emp?.name}: ${sd.date} ${sd.startTime}-${sd.endTime} (timeSlotId: ${sd.timeSlotId})`);
  }

  // Check for shifts with 16:00 start
  const nightStarts = shiftDetails.filter(sd => sd.startTime && sd.startTime.includes('16:'));
  console.log(`\nShifts starting at 16:00: ${nightStarts.length}`);

  // Check all unique time patterns
  const timePatterns = new Set();
  for (const sd of shiftDetails.filter(sd => sd.status === 'working')) {
    if (sd.startTime && sd.endTime) {
      timePatterns.add(`${sd.startTime}-${sd.endTime}`);
    }
  }

  console.log('\nAll time patterns:');
  for (const pattern of Array.from(timePatterns).sort()) {
    const count = shiftDetails.filter(sd =>
      sd.status === 'working' &&
      sd.startTime && sd.endTime &&
      `${sd.startTime}-${sd.endTime}` === pattern
    ).length;
    console.log(`  ${pattern}: ${count}件`);
  }

  process.exit(0);
}

checkNightShifts();
