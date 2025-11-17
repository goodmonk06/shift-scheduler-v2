import { getDb } from './server/db';
import { workTimeSlots, shiftDetails } from './drizzle/schema';
import { eq, isNull, and, isNotNull } from 'drizzle-orm';

const db = await getDb();
if (!db) throw new Error('DB not available');

console.log('Loading workTimeSlots...');
const slots = await db.select().from(workTimeSlots);
console.log('WorkTimeSlots:', slots.length);

// Create mapping from id to name
const idToName: Record<number, string> = {};
slots.forEach(slot => {
  idToName[slot.id] = slot.name;
});

console.log('\nID to Name mapping:');
console.log(idToName);

console.log('\nFinding shiftDetails with timeSlotId but no timeSlotName...');
const detailsToFix = await db.select().from(shiftDetails).where(
  and(
    isNotNull(shiftDetails.timeSlotId),
    isNull(shiftDetails.timeSlotName)
  )
);
console.log('Found:', detailsToFix.length);

console.log('\n=== Starting update ===');
let updated = 0;

for (const detail of detailsToFix) {
  if (!detail.timeSlotId) continue;

  const timeSlotName = idToName[detail.timeSlotId];

  if (timeSlotName) {
    await db.update(shiftDetails)
      .set({ timeSlotName })
      .where(eq(shiftDetails.id, detail.id));
    updated++;

    if (updated % 50 === 0) {
      console.log(`Updated ${updated} records...`);
    }
  } else {
    console.log(`Warning: No timeSlotName for timeSlotId: ${detail.timeSlotId}`);
  }
}

console.log(`\n=== Complete ===`);
console.log(`Updated: ${updated}`);

// Verify
console.log('\n=== Verification ===');
const afterUpdate = await db.select().from(shiftDetails).where(
  and(
    isNotNull(shiftDetails.timeSlotId),
    isNull(shiftDetails.timeSlotName)
  )
);
console.log('Remaining records with timeSlotId but no timeSlotName:', afterUpdate.length);

process.exit(0);
