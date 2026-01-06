import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 訂正版②のロックデータを取得
  const [lockedCells] = await connection.query(
    `SELECT sd.employeeId, e.name as employeeName, sd.date, sd.displayText, sd.status
     FROM shiftDetails sd
     LEFT JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = 127
     AND (sd.generatedBy = 'leave_request' OR sd.generatedBy = 'work_preference')`
  );

  console.log(`訂正版②のロック対象セル: ${lockedCells.length}件\n`);

  // 訂正版④の同じセルのデータを確認
  let matchCount = 0;
  let differentCount = 0;
  let missingCount = 0;

  console.log('=== 訂正版④との比較 ===\n');

  for (const cell of lockedCells) {
    const dateStr = cell.date instanceof Date ? cell.date.toISOString().substring(0, 10) : String(cell.date).substring(0, 10);

    const [cellInV4] = await connection.query(
      `SELECT displayText, status, generatedBy FROM shiftDetails
       WHERE shiftId = 129 AND employeeId = ? AND date = ?`,
      [cell.employeeId, dateStr]
    );

    if (cellInV4.length === 0) {
      missingCount++;
      console.log(`[不在] ${cell.employeeName} ${dateStr}: 訂正版②では「${cell.displayText || cell.status}」`);
    } else {
      const v4Cell = cellInV4[0];
      const v2Text = cell.displayText || cell.status;
      const v4Text = v4Cell.displayText || v4Cell.status;

      if (v2Text === v4Text) {
        matchCount++;
      } else {
        differentCount++;
        console.log(`[差異] ${cell.employeeName} ${dateStr}: 訂正版②「${v2Text}」→ 訂正版④「${v4Text}」 (generatedBy: ${v4Cell.generatedBy})`);
      }
    }
  }

  console.log(`\n=== 集計結果 ===`);
  console.log(`一致: ${matchCount}件`);
  console.log(`値が異なる: ${differentCount}件`);
  console.log(`訂正版④に存在しない: ${missingCount}件`);
  console.log(`合計: ${lockedCells.length}件`);

} finally {
  await connection.end();
}
