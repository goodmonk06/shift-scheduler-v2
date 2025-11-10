import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('✓ Database initialized successfully');
process.exit(0);
