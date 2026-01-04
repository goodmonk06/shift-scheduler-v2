import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // シフトID 127 の基本情報を取得
  const [shiftInfo] = await connection.query(
    'SELECT * FROM shifts WHERE id = 127 LIMIT 1'
  );

  console.log('シフト基本情報:');
  console.log(JSON.stringify(shiftInfo[0], null, 2));

  // シフト詳細のうち、generatedBy = 'leave_request' のもの5件を取得
  const [details] = await connection.query(
    `SELECT id, shiftId, employeeId, date, status, generatedBy, displayText, isFixed
     FROM shiftDetails
     WHERE shiftId = 127 AND generatedBy = 'leave_request'
     LIMIT 5`
  );

  console.log('\n\ngeneratedBy = "leave_request" の詳細（5件）:');
  console.log(JSON.stringify(details, null, 2));

  // 職員情報も確認
  if (details.length > 0) {
    const employeeId = details[0].employeeId;
    const [employee] = await connection.query(
      'SELECT id, name, employeeId FROM employees WHERE id = ?',
      [employeeId]
    );

    console.log('\n\n対応する職員情報:');
    console.log(JSON.stringify(employee[0], null, 2));
  }

} finally {
  await connection.end();
}
