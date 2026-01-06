import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // シフトID 127（訂正版②）のロックデータを全て取得
  const [lockData] = await connection.query(
    `SELECT sd.employeeId, e.name as employeeName, sd.date, sd.status, sd.displayText, sd.generatedBy
     FROM shiftDetails sd
     LEFT JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = 127
     AND (sd.generatedBy = 'leave_request' OR sd.generatedBy = 'work_preference')
     ORDER BY e.name, sd.date`
  );

  console.log(`訂正版②のロックされているセル（全${lockData.length}件）:\n`);

  // 職員ごとにグループ化
  const byEmployee = {};
  lockData.forEach(row => {
    const empName = row.employeeName || `ID:${row.employeeId}`;
    if (!byEmployee[empName]) {
      byEmployee[empName] = [];
    }
    byEmployee[empName].push(row);
  });

  // 職員ごとに表示
  Object.keys(byEmployee).sort().forEach(empName => {
    const rows = byEmployee[empName];
    console.log(`${empName} (${rows.length}件):`);
    rows.forEach(row => {
      const dateStr = row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date).substring(0, 10);
      console.log(`  ${dateStr}: ${row.displayText || row.status} (generatedBy: ${row.generatedBy})`);
    });
    console.log('');
  });

  // CSV形式でも出力
  console.log('\n=== CSV形式 ===');
  console.log('職員名,日付,表示テキスト,generatedBy');
  Object.keys(byEmployee).sort().forEach(empName => {
    const rows = byEmployee[empName];
    rows.forEach(row => {
      const dateStr = row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date).substring(0, 10);
      console.log(`${empName},${dateStr},${row.displayText || row.status},${row.generatedBy}`);
    });
  });

} finally {
  await connection.end();
}
