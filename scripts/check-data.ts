import 'dotenv/config';
import mysql from 'mysql2/promise';

async function checkData() {
  // Remove ssl-mode parameter if present (not supported by mysql2)
  const connectionString = process.env.DATABASE_URL!.replace(/[?&]ssl-mode=[^&]*/g, '');
  const connection = await mysql.createConnection(connectionString);

  console.log('\n=== データベース状態確認 ===\n');

  // 役職グループ
  const [positionGroups] = await connection.execute('SELECT * FROM positionGroups');
  console.log(`📋 役職グループ: ${(positionGroups as any[]).length}件`);
  if ((positionGroups as any[]).length > 0) {
    console.log('内容:', JSON.stringify(positionGroups, null, 2));
  }

  // 職員
  const [employees] = await connection.execute('SELECT * FROM employees');
  console.log(`\n👥 職員: ${(employees as any[]).length}件`);
  if ((employees as any[]).length > 0) {
    console.log('内容:', JSON.stringify(employees, null, 2));
  }

  // 勤務時間枠
  const [workTimeSlots] = await connection.execute('SELECT * FROM workTimeSlots');
  console.log(`\n⏰ 勤務時間枠: ${(workTimeSlots as any[]).length}件`);
  if ((workTimeSlots as any[]).length > 0) {
    console.log('内容:', JSON.stringify(workTimeSlots, null, 2));
  }

  // 希望休
  const [leaveRequests] = await connection.execute('SELECT * FROM leaveRequests');
  console.log(`\n🌸 希望休: ${(leaveRequests as any[]).length}件`);
  if ((leaveRequests as any[]).length > 0) {
    console.log('内容:', JSON.stringify(leaveRequests, null, 2));
  }

  // 変更提案
  const [changeProposals] = await connection.execute('SELECT * FROM changeProposals');
  console.log(`\n💡 変更提案: ${(changeProposals as any[]).length}件`);
  if ((changeProposals as any[]).length > 0) {
    console.log('内容:', JSON.stringify(changeProposals, null, 2));
  }

  // シフト
  const [shifts] = await connection.execute('SELECT * FROM shifts');
  console.log(`\n📅 シフト: ${(shifts as any[]).length}件`);
  if ((shifts as any[]).length > 0) {
    console.log('内容:', JSON.stringify(shifts, null, 2));
  }

  await connection.end();
  console.log('\n✅ 確認完了\n');
}

checkData().catch(console.error);
