import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 全シフトからgeneratedByがleave_requestまたはwork_preferenceのものを確認
  const [leaveRequests] = await connection.query(
    `SELECT shiftId, date, employeeId, generatedBy, isFixed, displayText
     FROM shiftDetails
     WHERE generatedBy IN ('leave_request', 'work_preference')
     LIMIT 20`
  );

  console.log('希望休・勤務希望のデータ（20件）:');
  console.log(JSON.stringify(leaveRequests, null, 2));

  // 統計を取得
  const [stats] = await connection.query(
    `SELECT generatedBy, COUNT(*) as count
     FROM shiftDetails
     GROUP BY generatedBy`
  );

  console.log('\n全シフトのgeneratedBy分布:');
  console.log(JSON.stringify(stats, null, 2));

  // isFixedが1のデータがあるか確認
  const [fixedData] = await connection.query(
    `SELECT shiftId, date, employeeId, generatedBy, isFixed, displayText
     FROM shiftDetails
     WHERE isFixed = 1
     LIMIT 20`
  );

  console.log('\nisFixed=1のデータ（20件）:');
  console.log(JSON.stringify(fixedData, null, 2));

} finally {
  await connection.end();
}
