import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute(
  "SELECT id, name, year, month, status, isDevelopment, createdAt FROM shifts WHERE name LIKE '%1月シフト_20251222_開発データ%' OR (year = 2026 AND month = 1) OR (year = 2025 AND month = 1) ORDER BY createdAt DESC LIMIT 30"
);

console.log('=== 1月関連のシフトデータ（最新30件） ===');
console.log(JSON.stringify(rows, null, 2));

await connection.end();
