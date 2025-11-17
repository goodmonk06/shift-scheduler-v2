import { getDb } from './server/db';
import { workTimeSlots, shiftDetails } from './drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';

const db = await getDb();
if (!db) throw new Error('DB not available');

console.log('Loading workTimeSlots...');
const slots = await db.select().from(workTimeSlots);
console.log('WorkTimeSlots:', slots.length);

// Create mapping from name/displayLabel to id
const nameToId: Record<string, number> = {};
slots.forEach(slot => {
  nameToId[slot.name] = slot.id;
  nameToId[slot.displayLabel] = slot.id;
});

console.log('\nName to ID mapping:');
console.log(nameToId);

console.log('\nFinding shiftDetails with null timeSlotId...');
const nullDetails = await db.select().from(shiftDetails).where(isNull(shiftDetails.timeSlotId));
console.log('Found:', nullDetails.length);

// Group by timeSlotName to see what we have
const nameGroups: Record<string, number> = {};
nullDetails.forEach(d => {
  const name = d.timeSlotName || 'undefined';
  nameGroups[name] = (nameGroups[name] || 0) + 1;
});

console.log('\nTimeSlotName distribution (null timeSlotId):');
console.log(nameGroups);

console.log('\n=== Starting update ===');
let updated = 0;
let skipped = 0;

for (const detail of nullDetails) {
  if (!detail.timeSlotName) {
    skipped++;
    continue;
  }

  // Try to find matching timeSlotId
  const timeSlotId = nameToId[detail.timeSlotName];

  if (timeSlotId) {
    await db.update(shiftDetails)
      .set({ timeSlotId })
      .where(eq(shiftDetails.id, detail.id));
    updated++;

    if (updated % 50 === 0) {
      console.log(`Updated ${updated} records...`);
    }
  } else {
    console.log(`Warning: No matching timeSlotId for name: "${detail.timeSlotName}"`);
    skipped++;
  }
}

console.log(`\n=== Complete ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total: ${nullDetails.length}`);

// Verify
console.log('\n=== Verification ===');
const afterUpdate = await db.select().from(shiftDetails).where(isNull(shiftDetails.timeSlotId));
console.log('Remaining null timeSlotId:', afterUpdate.length);

const afterCounts: Record<string, number> = {};
const allAfter = await db.select().from(shiftDetails);
allAfter.forEach(d => {
  const id = d.timeSlotId?.toString() || 'null';
  afterCounts[id] = (afterCounts[id] || 0) + 1;
});
console.log('TimeSlotId distribution after update:', afterCounts);

process.exit(0);
