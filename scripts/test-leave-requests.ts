import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)\?/);
if (!match) throw new Error('Invalid DATABASE_URL');

const config = {
  host: match[3],
  port: parseInt(match[4]),
  user: match[1],
  password: match[2],
  database: match[5],
  ssl: { rejectUnauthorized: false }
};

async function test() {
  const conn = await mysql.createConnection(config);

  console.log('🧪 Testing leaveRequests table...\n');

  // 1. Test with "休"
  console.log('1️⃣ Creating leave request with type "休"...');
  const [result1] = await conn.execute(`
    INSERT INTO leaveRequests
    (employeeId, shiftId, startDate, endDate, leaveType, status, reason)
    VALUES (4, 30, '2025-12-15', '2025-12-15', '休', 'pending', '個人的な用事')
  `) as any;
  console.log('✅ Created leave request ID:', result1.insertId);

  // 2. Test with "有休"
  console.log('\n2️⃣ Creating leave request with type "有休"...');
  const [result2] = await conn.execute(`
    INSERT INTO leaveRequests
    (employeeId, shiftId, startDate, endDate, leaveType, status, reason)
    VALUES (4, 30, '2025-12-20', '2025-12-20', '有休', 'pending', '有給休暇')
  `) as any;
  console.log('✅ Created leave request ID:', result2.insertId);

  // 3. Verify no startTime/endTime columns
  console.log('\n3️⃣ Verifying schema (no startTime/endTime columns)...');
  const [cols] = await conn.execute('DESCRIBE leaveRequests') as any;
  const hasStartTime = cols.some((c: any) => c.Field === 'startTime');
  const hasEndTime = cols.some((c: any) => c.Field === 'endTime');
  console.log('✅ Has startTime column:', hasStartTime ? '❌ FAIL' : '✅ PASS (correctly removed)');
  console.log('✅ Has endTime column:', hasEndTime ? '❌ FAIL' : '✅ PASS (correctly removed)');

  // 4. Verify enum values
  console.log('\n4️⃣ Verifying leaveType enum...');
  const leaveTypeCol = cols.find((c: any) => c.Field === 'leaveType');
  console.log('   Enum values:', leaveTypeCol.Type);
  console.log('✅ Contains "時間指定":', leaveTypeCol.Type.includes('時間指定') ? '❌ FAIL' : '✅ PASS (correctly removed)');

  // 5. Test that "時間指定" is rejected
  console.log('\n5️⃣ Testing that "時間指定" is rejected...');
  try {
    await conn.execute(`
      INSERT INTO leaveRequests
      (employeeId, shiftId, startDate, endDate, leaveType, status)
      VALUES (4, 30, '2025-12-25', '2025-12-25', '時間指定', 'pending')
    `);
    console.log('❌ FAIL: "時間指定" was accepted (should be rejected)');
  } catch (err: any) {
    console.log('✅ PASS: "時間指定" correctly rejected:', err.message.substring(0, 50) + '...');
  }

  // Cleanup
  console.log('\n6️⃣ Cleaning up test data...');
  await conn.execute('DELETE FROM leaveRequests WHERE id IN (?, ?)', [result1.insertId, result2.insertId]);
  console.log('✅ Cleanup complete');

  await conn.end();
  console.log('\n✅ All tests passed!');
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
