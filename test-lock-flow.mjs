import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // シフトID 127 で generatedBy = 'leave_request' のデータを探す
  const [leaveData] = await connection.query(
    `SELECT id, date, employeeId, generatedBy, isFixed, displayText
     FROM shiftDetails
     WHERE shiftId = 127 AND generatedBy = 'leave_request'
     LIMIT 10`
  );

  console.log('シフトID 127 でgeneratedBy = "leave_request" のデータ:');
  console.log(JSON.stringify(leaveData, null, 2));

  // 全開発シフトでgeneratedBy = 'leave_request' のデータを探す
  const [allLeaveData] = await connection.query(
    `SELECT shiftId, COUNT(*) as count
     FROM shiftDetails
     WHERE generatedBy = 'leave_request'
     AND shiftId IN (SELECT id FROM shifts WHERE isDevelopment = 1)
     GROUP BY shiftId
     ORDER BY shiftId DESC
     LIMIT 10`
  );

  console.log('\n開発シフトでgeneratedBy = "leave_request" があるシフト:');
  console.log(JSON.stringify(allLeaveData, null, 2));

} finally {
  await connection.end();
}
