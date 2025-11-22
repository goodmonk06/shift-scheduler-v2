import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Check shift with ID 30
const shifts = await db.select().from(schema.shifts).where(eq(schema.shifts.id, 30));

console.log('Shift data for ID 30:');
console.log(JSON.stringify(shifts, null, 2));

if (shifts.length > 0) {
  console.log('\nShift found!');
  console.log('Name:', shifts[0].name);
  console.log('Year:', shifts[0].year);
  console.log('Month:', shifts[0].month);
  console.log('Status:', shifts[0].status);
  
  // Count shift details
  const details = await db.select().from(schema.shiftDetails).where(eq(schema.shiftDetails.shiftId, 30));
  console.log('Number of shift details:', details.length);
}

await connection.end();
