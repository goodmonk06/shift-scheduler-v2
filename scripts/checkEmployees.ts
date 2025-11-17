import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { employees } from '../drizzle/schema';

dotenv.config();

async function checkEmployees() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  const db = drizzle(connection);

  const allEmployees = await db.select().from(employees);
  console.log('Total employees:', allEmployees.length);
  console.log('\nEmployee list:');
  allEmployees.sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
    console.log(`  ID: ${e.id}, Name: "${e.name}"`);
  });

  await connection.end();
}

checkEmployees().catch(console.error);