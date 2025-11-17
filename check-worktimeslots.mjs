import { getDb } from './dist/db.js';
import { workTimeSlots } from './dist/drizzle/schema.js';

const db = await getDb();
if (!db) throw new Error('DB not available');

const slots = await db.select().from(workTimeSlots);
console.log('Work Time Slots:');
console.log(JSON.stringify(slots, null, 2));

process.exit(0);
