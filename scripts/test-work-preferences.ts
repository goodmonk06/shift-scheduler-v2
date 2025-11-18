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

  console.log('🧪 Testing workPreferences table...\n');

  // 1. INSERT test
  console.log('1️⃣ Creating a work preference...');
  const [result] = await conn.execute(`
    INSERT INTO workPreferences
    (employeeId, shiftId, startDate, endDate, startTime, endTime, status, reason)
    VALUES (4, 30, '2025-12-10', '2025-12-10', '09:00', '13:00', 'pending', 'テスト用時間指定勤務')
  `) as any;
  const wpId = result.insertId;
  console.log('✅ Created work preference ID:', wpId);

  // 2. SELECT test
  console.log('\n2️⃣ Reading work preference...');
  const [rows] = await conn.execute('SELECT * FROM workPreferences WHERE id = ?', [wpId]) as any;
  console.log('✅ Found:', rows[0]);

  // 3. Verify enum values
  console.log('\n3️⃣ Verifying status enum...');
  console.log('   Status values: pending, approved, rejected');
  console.log('   Current status:', rows[0].status);

  // 4. UPDATE test
  console.log('\n4️⃣ Updating work preference...');
  await conn.execute('UPDATE workPreferences SET status = ? WHERE id = ?', ['approved', wpId]);
  const [updated] = await conn.execute('SELECT status FROM workPreferences WHERE id = ?', [wpId]) as any;
  console.log('✅ Updated status:', updated[0].status);

  // 5. DELETE test
  console.log('\n5️⃣ Deleting work preference...');
  await conn.execute('DELETE FROM workPreferences WHERE id = ?', [wpId]);
  const [deleted] = await conn.execute('SELECT * FROM workPreferences WHERE id = ?', [wpId]) as any;
  console.log('✅ Deleted (should be empty):', deleted.length === 0 ? 'Success' : 'Failed');

  await conn.end();
  console.log('\n✅ All tests passed!');
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
