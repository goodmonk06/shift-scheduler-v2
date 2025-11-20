import * as db from '../server/db';

async function checkNullTimes() {
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('No shift');
    process.exit(1);
  }

  const details = await db.getShiftDetailsByShiftId(shift.id);

  const withTimes = details.filter(d => d.startTime && d.endTime);
  const withoutTimes = details.filter(d => !d.startTime || !d.endTime);
  const working = details.filter(d => d.status === 'working');
  const workingWithTimes = working.filter(d => d.startTime && d.endTime);
  const workingWithoutTimes = working.filter(d => !d.startTime || !d.endTime);

  console.log(`Total shifts: ${details.length}`);
  console.log(`With times: ${withTimes.length}`);
  console.log(`Without times (null): ${withoutTimes.length}`);
  console.log();
  console.log(`Working shifts: ${working.length}`);
  console.log(`Working with times: ${workingWithTimes.length}`);
  console.log(`Working without times: ${workingWithoutTimes.length}`);

  if (workingWithoutTimes.length > 0) {
    console.log('\nSample working shift without times:');
    const sample = workingWithoutTimes[0];
    const emp = await db.getEmployeeById(sample.employeeId);
    console.log(`- ${emp?.name}: ${sample.date}, timeSlotId=${sample.timeSlotId}`);
  }

  process.exit(0);
}

checkNullTimes();
