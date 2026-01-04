import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 過去の開発シフトを詳しく調査
  const shiftIds = [127, 128, 126, 125]; // 1月シフト_20251229_訂正版②など

  for (const shiftId of shiftIds) {
    console.log(`\n========== シフトID: ${shiftId} ==========`);

    // シフト情報を取得
    const [shiftInfo] = await connection.query(
      `SELECT id, name, year, month, createdAt FROM shifts WHERE id = ?`,
      [shiftId]
    );

    if (shiftInfo.length > 0) {
      console.log(`シフト名: ${shiftInfo[0].name}`);
      console.log(`作成日: ${shiftInfo[0].createdAt}`);
    }

    // 全フィールドを取得して確認
    const [allData] = await connection.query(
      `SELECT id, date, employeeId, status, generatedBy, isFixed, isChanged,
              sourceType, sourceId, displayText, startTime, endTime
       FROM shiftDetails
       WHERE shiftId = ?
       LIMIT 20`,
      [shiftId]
    );

    console.log(`\n全データサンプル（20件）:`);
    console.log(JSON.stringify(allData, null, 2));

    // isFixedの分布
    const [fixedDist] = await connection.query(
      `SELECT isFixed, COUNT(*) as count
       FROM shiftDetails
       WHERE shiftId = ?
       GROUP BY isFixed`,
      [shiftId]
    );

    console.log(`\nisFixedの分布:`);
    console.log(JSON.stringify(fixedDist, null, 2));

    // sourceTypeの分布
    const [sourceTypeDist] = await connection.query(
      `SELECT sourceType, COUNT(*) as count
       FROM shiftDetails
       WHERE shiftId = ?
       GROUP BY sourceType`,
      [shiftId]
    );

    console.log(`\nsourceTypeの分布:`);
    console.log(JSON.stringify(sourceTypeDist, null, 2));

    // 何かしらロックっぽいデータを探す
    const [possibleLocks] = await connection.query(
      `SELECT *
       FROM shiftDetails
       WHERE shiftId = ? AND (isFixed = 1 OR sourceType IS NOT NULL OR isChanged = 1)
       LIMIT 10`,
      [shiftId]
    );

    console.log(`\nロックの可能性があるデータ（10件）:`);
    console.log(JSON.stringify(possibleLocks, null, 2));
  }

} finally {
  await connection.end();
}
