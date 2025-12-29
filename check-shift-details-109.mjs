import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// シフトID 109の基本情報
const [shiftInfo] = await connection.execute(
  "SELECT * FROM shifts WHERE id = 109"
);

console.log('=== シフト基本情報（ID: 109） ===');
console.log(JSON.stringify(shiftInfo, null, 2));

// シフトID 109のシフト詳細データ数を確認
const [detailCount] = await connection.execute(
  "SELECT COUNT(*) as count FROM shiftDetails WHERE shiftId = 109"
);

console.log('\n=== シフト詳細データ数 ===');
console.log(JSON.stringify(detailCount, null, 2));

// 最初の10件のシフト詳細データ
const [detailSample] = await connection.execute(
  "SELECT sd.*, e.name as employeeName FROM shiftDetails sd LEFT JOIN employees e ON sd.employeeId = e.id WHERE sd.shiftId = 109 ORDER BY sd.date ASC, e.name ASC LIMIT 10"
);

console.log('\n=== シフト詳細データサンプル（最初の10件） ===');
console.log(JSON.stringify(detailSample, null, 2));

await connection.end();
