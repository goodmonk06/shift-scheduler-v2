/**
 * シフト表示問題を直接テストするスクリプト
 */
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

async function testShiftDisplay() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 シフト表示テスト（最新シフト）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 最新のシフトIDを取得
    const [shifts] = await conn.execute(
      'SELECT id, name, year, month, status FROM shifts ORDER BY id DESC LIMIT 1'
    ) as any;

    if (shifts.length === 0) {
      console.log('❌ シフトが見つかりません');
      return;
    }

    const shiftId = shifts[0].id;
    const shiftName = shifts[0].name;

    console.log(`📋 対象シフト: ${shiftName} (ID: ${shiftId})`);
    console.log(`   ${shifts[0].year}年${shifts[0].month}月\n`);

    // 職員データの確認
    const [employees] = await conn.execute(
      'SELECT id, employeeId, name FROM employees ORDER BY id LIMIT 5'
    ) as any;

    console.log('👥 職員データサンプル:');
    for (const emp of employees) {
      console.log(`  ID: ${emp.id}, employeeId: ${emp.employeeId}, 名前: ${emp.name}`);
    }
    console.log('');

    // shiftDetailsの確認
    const [details] = await conn.execute(
      `SELECT
        sd.id,
        sd.employeeId,
        sd.date,
        sd.timeSlotId,
        sd.startTime,
        sd.endTime,
        sd.status,
        sd.leaveType,
        e.employeeId as empEmployeeId,
        e.name as empName
      FROM shiftDetails sd
      JOIN employees e ON sd.employeeId = e.id
      WHERE sd.shiftId = ?
      ORDER BY sd.date, sd.employeeId
      LIMIT 10`,
      [shiftId]
    ) as any;

    console.log(`📊 shiftDetails サンプル (${details.length}件):`)
    for (const detail of details) {
      console.log(`\n  ${detail.date} - ${detail.empName} (DB ID: ${detail.employeeId}, Display ID: ${detail.empEmployeeId})`);

      if (detail.timeSlotId) {
        console.log(`    時間枠ID: ${detail.timeSlotId}`);
      }
      if (detail.startTime && detail.endTime) {
        console.log(`    時間: ${detail.startTime} - ${detail.endTime}`);
      }
      if (detail.leaveType) {
        console.log(`    休暇: ${detail.leaveType}`);
      }
      console.log(`    ステータス: ${detail.status}`);
    }

    // 問題の診断
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 ID マッピング診断');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ 正しいマッピング:');
    console.log('  - shiftDetails.employeeId = employees.id (数値)');
    console.log('  - employees.employeeId = 表示用ID (例: "EMP001")');
    console.log('');

    console.log('⚠️ フロントエンドでの注意点:');
    console.log('  1. ShiftAssignmentで employeeDbId に数値IDを設定');
    console.log('  2. convertAssignmentToCell で employeeDbId を employeeId として使用');
    console.log('  3. ShiftTableV2 の cells Map のキーは "{数値ID}-{日付}"');
    console.log('  4. ShiftTableV2 の employees 配列の id も数値ID である必要がある');
    console.log('');

    // フロントエンドでの期待値
    console.log('📝 フロントエンドでの期待値:');
    const sampleDetail = details[0];
    if (sampleDetail) {
      const expectedCellKey = `${sampleDetail.employeeId}-${sampleDetail.date}`;
      console.log(`  Cell Map のキー: "${expectedCellKey}"`);
      console.log(`  employees 配列の要素: { id: ${sampleDetail.employeeId}, name: "${sampleDetail.empName}", ... }`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await conn.end();
  }
}

testShiftDisplay().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});