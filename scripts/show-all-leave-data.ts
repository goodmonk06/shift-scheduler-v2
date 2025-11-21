import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);

console.log('=== 2024年12月のデータ ===\n');
const [rows2024] = await connection.execute(
  'SELECT lr.*, e.name as employeeName FROM leaveRequests lr LEFT JOIN employees e ON lr.employeeId = e.id WHERE YEAR(lr.startDate) = 2024 AND MONTH(lr.startDate) = 12 ORDER BY e.name, lr.startDate'
);

(rows2024 as any[]).forEach((row: any) => {
  console.log(`${row.employeeName}: ${row.startDate} - ${row.endDate} (タイプ: ${row.leaveType || 'なし'}, 追加: ${row.isAdditional ? 'はい' : 'いいえ'})`);
});

console.log('\n\n=== 2025年12月のデータ ===\n');
const [rows2025] = await connection.execute(
  'SELECT lr.*, e.name as employeeName FROM leaveRequests lr LEFT JOIN employees e ON lr.employeeId = e.id WHERE YEAR(lr.startDate) = 2025 AND MONTH(lr.startDate) = 12 ORDER BY e.name, lr.startDate'
);

const employeeGroups: Record<string, any[]> = {};
(rows2025 as any[]).forEach((row: any) => {
  if (!employeeGroups[row.employeeName]) {
    employeeGroups[row.employeeName] = [];
  }
  employeeGroups[row.employeeName].push(row);
});

Object.keys(employeeGroups).sort().forEach(name => {
  console.log(`\n【${name}】`);
  employeeGroups[name].forEach(row => {
    const startDate = row.startDate instanceof Date ? row.startDate.toISOString().split('T')[0] : row.startDate;
    const endDate = row.endDate instanceof Date ? row.endDate.toISOString().split('T')[0] : row.endDate;
    console.log(`  - ${startDate} ～ ${endDate}`);
    console.log(`    タイプ: ${row.leaveType || 'なし'}, 追加: ${row.isAdditional ? 'はい' : 'いいえ'}, ステータス: ${row.status}`);
  });
});

console.log(`\n\n合計: 2024年12月 ${(rows2024 as any[]).length}件, 2025年12月 ${(rows2025 as any[]).length}件`);

await connection.end();
