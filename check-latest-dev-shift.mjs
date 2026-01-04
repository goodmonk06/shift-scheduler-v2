import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 開発専用の最新シフトを取得
  const [shifts] = await connection.query(
    `SELECT id, name, year, month, createdAt, isDevelopment
     FROM shifts
     WHERE isDevelopment = 1
     ORDER BY createdAt DESC
     LIMIT 5`
  );

  console.log('開発専用シフト（最新5件）:');
  console.log(JSON.stringify(shifts, null, 2));

  if (shifts.length > 0) {
    const latestShiftId = shifts[0].id;
    console.log(`\n最新の開発シフトID: ${latestShiftId} (${shifts[0].name})`);

    // このシフトのgeneratedBy分布を確認
    const [distribution] = await connection.query(
      `SELECT generatedBy, COUNT(*) as count
       FROM shiftDetails
       WHERE shiftId = ?
       GROUP BY generatedBy`,
      [latestShiftId]
    );

    console.log('\ngeneratedByの分布:');
    console.log(JSON.stringify(distribution, null, 2));

    // isFixedの分布を確認
    const [fixedDistribution] = await connection.query(
      `SELECT isFixed, COUNT(*) as count
       FROM shiftDetails
       WHERE shiftId = ?
       GROUP BY isFixed`,
      [latestShiftId]
    );

    console.log('\nisFixedの分布:');
    console.log(JSON.stringify(fixedDistribution, null, 2));

    // 希望休のサンプルデータを確認
    const [leaveRequests] = await connection.query(
      `SELECT id, date, employeeId, generatedBy, isFixed, displayText, startTime, endTime
       FROM shiftDetails
       WHERE shiftId = ? AND generatedBy IN ('leave_request', 'work_preference')
       LIMIT 10`,
      [latestShiftId]
    );

    console.log('\n希望休・勤務希望のサンプル（10件）:');
    console.log(JSON.stringify(leaveRequests, null, 2));
  }

} finally {
  await connection.end();
}
