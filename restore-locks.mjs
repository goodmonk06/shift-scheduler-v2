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

  let restoredCount = 0;
  let skippedDifferent = 0;
  let skippedMissing = 0;

  console.log('=== ロック復元開始 ===\n');

  for (const cell of lockedCells) {
    const dateStr = cell.date instanceof Date ? cell.date.toISOString().substring(0, 10) : String(cell.date).substring(0, 10);

    // 訂正版④の同じセルを確認
    const [cellInV4] = await connection.query(
      `SELECT id, displayText, status, generatedBy FROM shiftDetails
       WHERE shiftId = 129 AND employeeId = ? AND date = ?`,
      [cell.employeeId, dateStr]
    );

    if (cellInV4.length === 0) {
      skippedMissing++;
      console.log(`[スキップ:不在] ${cell.employeeName} ${dateStr}`);
      continue;
    }

    const v4Cell = cellInV4[0];
    const v2Text = cell.displayText || cell.status;
    const v4Text = v4Cell.displayText || v4Cell.status;

    // 値が一致する場合のみロックを復元
    if (v2Text === v4Text) {
      // generatedByをleave_requestに更新
      await connection.query(
        `UPDATE shiftDetails SET generatedBy = 'leave_request' WHERE id = ?`,
        [v4Cell.id]
      );
      restoredCount++;
      if (restoredCount <= 10) {
        console.log(`[復元] ${cell.employeeName} ${dateStr}: 「${v4Text}」`);
      } else if (restoredCount === 11) {
        console.log('... (残りの復元は省略して表示)');
      }
    } else {
      skippedDifferent++;
      console.log(`[スキップ:値が異なる] ${cell.employeeName} ${dateStr}: 訂正版②「${v2Text}」→ 訂正版④「${v4Text}」`);
    }
  }

  console.log(`\n=== 復元完了 ===`);
  console.log(`ロック復元: ${restoredCount}件`);
  console.log(`スキップ(値が異なる): ${skippedDifferent}件`);
  console.log(`スキップ(不在): ${skippedMissing}件`);
  console.log(`合計: ${lockedCells.length}件`);

  // 確認：訂正版④のロック件数
  const [finalCount] = await connection.query(
    `SELECT COUNT(*) as count FROM shiftDetails
     WHERE shiftId = 129 AND (generatedBy = 'leave_request' OR generatedBy = 'work_preference')`
  );

  console.log(`\n訂正版④の最終ロック件数: ${finalCount[0].count}件`);

} finally {
  await connection.end();
}
