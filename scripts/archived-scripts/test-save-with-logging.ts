import * as db from '../server/db';
import { generateShiftWithPhases } from '../server/phaseBasedShiftGenerator';

async function testSave() {
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('No shift found');
    process.exit(1);
  }

  console.log('Generating shifts...\n');
  const result = await generateShiftWithPhases(shift.id, 2025, 12);

  console.log(`\nGenerated ${result.allShifts.length} total shifts`);

  // Count by status
  const byStatus = result.allShifts.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nGenerated shifts by status:');
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  ${status}: ${count}`);
  }

  // Sample a few shifts
  console.log('\nSample generated shifts:');
  for (const s of result.allShifts.slice(0, 5)) {
    console.log(`  ${s.date} employee${s.employeeId}: status=${s.status}, time=${s.startTime}-${s.endTime}, generated=${s.generatedBy}`);
  }

  // Check for night shifts
  const nightShifts = result.allShifts.filter(s =>
    s.startTime === '16:00' && s.endTime === '09:00'
  );
  console.log(`\nNight shifts in result: ${nightShifts.length}`);
  if (nightShifts.length > 0) {
    console.log('Sample night shift:');
    console.log(nightShifts[0]);
  }

  process.exit(0);
}

testSave();
