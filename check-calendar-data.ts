import { getDb } from './server/db';
import { workTimeSlots, shiftDetails } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

const db = await getDb();
if (!db) throw new Error('DB not available');

console.log('=== WorkTimeSlots ===');
const slots = await db.select().from(workTimeSlots);
console.log('Count:', slots.length);
slots.forEach(slot => {
  console.log(`ID: ${slot.id}, Name: ${slot.name}, Label: ${slot.displayLabel}, Time: ${slot.startTime}-${slot.endTime}, Required: ${slot.requiredStaff}`);
});

console.log('\n=== Sample ShiftDetails for shiftId=8, date=2025-12-01 ===');
const details = await db.select().from(shiftDetails).where(
  and(
    eq(shiftDetails.shiftId, 8),
    eq(shiftDetails.date, '2025-12-01')
  )
).limit(10);

console.log('Count:', details.length);
details.forEach(detail => {
  console.log(`Employee: ${detail.employeeId}, TimeSlotId: ${detail.timeSlotId}, TimeSlotName: ${detail.timeSlotName}`);
});

console.log('\n=== TimeSlotId Distribution for shiftId=8 ===');
const allDetails = await db.select().from(shiftDetails).where(eq(shiftDetails.shiftId, 8));
const timeSlotCounts: Record<string, number> = {};
allDetails.forEach(d => {
  const id = d.timeSlotId?.toString() || 'null';
  timeSlotCounts[id] = (timeSlotCounts[id] || 0) + 1;
});
console.log('TimeSlotId counts:', timeSlotCounts);

process.exit(0);
