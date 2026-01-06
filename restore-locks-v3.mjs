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

  console.log('=== 訂正版③へのロック復元開始 ===\n');

  for (const cell of lockedCells) {
    const dateStr = cell.date instanceof Date ? cell.date.toISOString().substring(0, 10) : String(cell.date).substring(0, 10);

    // 訂正版③の同じセルを確認（シフトID: 128）
    const [cellInV3] = await connection.query(
      `SELECT id, displayText, status, generatedBy FROM shiftDetails
       WHERE shiftId = 128 AND employeeId = ? AND date = ?`,
      [cell.employeeId, dateStr]
    );

    if (cellInV3.length === 0) {
      skippedMissing++;
      continue;
    }

    const v3Cell = cellInV3[0];
    const v2Text = cell.displayText || cell.status;
    const v3Text = v3Cell.displayText || v3Cell.status;

    // 値が一致する場合のみロックを復元
    if (v2Text === v3Text) {
      // generatedByをleave_requestに更新
      await connection.query(
        `UPDATE shiftDetails SET generatedBy = 'leave_request' WHERE id = ?`,
        [v3Cell.id]
      );
      restoredCount++;
      if (restoredCount <= 10) {
        console.log(`[復元] ${cell.employeeName} ${dateStr}: 「${v3Text}」`);
      } else if (restoredCount === 11) {
        console.log('... (残りの復元は省略して表示)');
      }
    } else {
      skippedDifferent++;
      if (skippedDifferent <= 5) {
        console.log(`[スキップ:値が異なる] ${cell.employeeName} ${dateStr}: 訂正版②「${v2Text}」→ 訂正版③「${v3Text}」`);
      }
    }
  }

  console.log(`\n=== 復元完了 ===`);
  console.log(`ロック復元: ${restoredCount}件`);
  console.log(`スキップ(値が異なる): ${skippedDifferent}件`);
  console.log(`スキップ(不在): ${skippedMissing}件`);
  console.log(`合計: ${lockedCells.length}件`);

  // 確認：訂正版③のロック件数
  const [finalCount] = await connection.query(
    `SELECT COUNT(*) as count FROM shiftDetails
     WHERE shiftId = 128 AND (generatedBy = 'leave_request' OR generatedBy = 'work_preference')`
  );

  console.log(`\n訂正版③の最終ロック件数: ${finalCount[0].count}件`);

} finally {
  await connection.end();
}
