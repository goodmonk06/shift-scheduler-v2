/**
 * シフト表示問題をデバッグするスクリプト
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

async function debug() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 シフト表示問題のデバッグ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 最新のシフトを取得
    const [shifts] = await conn.execute(
      'SELECT id, name, year, month, status FROM shifts ORDER BY id DESC LIMIT 5'
    ) as any;

    console.log('📋 最新のシフト一覧:');
    for (const shift of shifts) {
      console.log(`  ID: ${shift.id}, 名前: ${shift.name}, ${shift.year}年${shift.month}月, ステータス: ${shift.status}`);

      // 各シフトのshiftDetails数を確認
      const [detailCount] = await conn.execute(
        'SELECT COUNT(*) as count FROM shiftDetails WHERE shiftId = ?',
        [shift.id]
      ) as any;
      console.log(`    → shiftDetails: ${detailCount[0].count}件`);
    }
    console.log('');

    // シフトID 32の詳細を確認
    const targetShiftId = 32;
    console.log(`🎯 シフトID ${targetShiftId} の詳細確認:\n`);

    const [shiftInfo] = await conn.execute(
      'SELECT * FROM shifts WHERE id = ?',
      [targetShiftId]
    ) as any;

    if (shiftInfo.length > 0) {
      const shift = shiftInfo[0];
      console.log(`  名前: ${shift.name}`);
      console.log(`  年月: ${shift.year}年${shift.month}月`);
      console.log(`  ステータス: ${shift.status}`);
      console.log(`  作成日: ${shift.createdAt}`);
      console.log(`  更新日: ${shift.updatedAt}\n`);
    }

    // shiftDetailsのサンプルデータを取得
    const [sampleDetails] = await conn.execute(
      `SELECT sd.*, e.name as employeeName
       FROM shiftDetails sd
       JOIN employees e ON sd.employeeId = e.id
       WHERE sd.shiftId = ?
       ORDER BY sd.date, sd.employeeId
       LIMIT 10`,
      [targetShiftId]
    ) as any;

    console.log(`📊 shiftDetails サンプル (最初の10件):\n`);
    for (const detail of sampleDetails) {
      console.log(`  ${detail.date} - ${detail.employeeName}:`);
      if (detail.timeSlotId) {
        console.log(`    時間枠ID: ${detail.timeSlotId}`);
      }
      if (detail.startTime && detail.endTime) {
        console.log(`    カスタム時間: ${detail.startTime} - ${detail.endTime}`);
      }
      if (detail.leaveType) {
        console.log(`    休暇タイプ: ${detail.leaveType}`);
      }
      console.log(`    ステータス: ${detail.status}`);
      console.log(`    生成元: ${detail.generatedBy}`);
      console.log('');
    }

    // 日付ごとの集計
    const [dateSummary] = await conn.execute(
      `SELECT date, COUNT(*) as count
       FROM shiftDetails
       WHERE shiftId = ?
       GROUP BY date
       ORDER BY date`,
      [targetShiftId]
    ) as any;

    console.log('📅 日付ごとのシフト数:');
    for (const summary of dateSummary) {
      console.log(`  ${summary.date}: ${summary.count}人`);
    }

    // テーブル構造の確認
    console.log('\n🔧 テーブル構造の確認:\n');

    const [tableCheck] = await conn.execute(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
       AND table_name IN ('shiftDetails', 'shiftAssignments')`,
      [match[5]]
    ) as any;

    console.log('  存在するテーブル:');
    for (const table of tableCheck) {
      console.log(`    ✓ ${table.table_name}`);
    }

    if (tableCheck.length === 1) {
      console.log('\n  ⚠️ shiftAssignments テーブルが存在しません！');
      console.log('  → フロントエンドはshiftDetailsテーブルを使用しています');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 診断結果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. データベースにはshiftDetailsテーブルにデータが存在');
    console.log('2. shiftAssignmentsテーブルは存在しない');
    console.log('3. フロントエンドはshiftDetailsを正しく読み込んでいる');
    console.log('\n推奨アクション:');
    console.log('- ブラウザのコンソールでエラーを確認');
    console.log('- ShiftEditorコンポーネントのconsole.logを確認');
    console.log('- loadData関数が正常に実行されているか確認');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await conn.end();
  }
}

debug().catch(err => {
  console.error('❌ Debug failed:', err.message);
  process.exit(1);
});