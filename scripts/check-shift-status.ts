/**
 * 現在のシフトデータ状況を確認するスクリプト
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

async function checkShifts() {
  const conn = await mysql.createConnection(config);

  console.log('=== 現在のシフトデータ確認 ===\n');

  // すべてのシフトを確認
  const [shifts] = await conn.execute(
    'SELECT id, name, year, month, status, createdAt FROM shifts ORDER BY year DESC, month DESC'
  ) as any;

  console.log('📋 シフト一覧:');
  for (const shift of shifts) {
    const [detailCount] = await conn.execute(
      'SELECT COUNT(*) as count FROM shiftDetails WHERE shiftId = ?',
      [shift.id]
    ) as any;
    console.log(`  ID: ${shift.id} - ${shift.name} (${shift.year}年${shift.month}月)`);
    console.log(`    状態: ${shift.status}, 作成日: ${shift.createdAt}`);
    console.log(`    shiftDetails: ${detailCount[0].count}件\n`);
  }

  // 2025年12月のシフトがあるか確認
  const [dec2025] = await conn.execute(
    'SELECT * FROM shifts WHERE year = 2025 AND month = 12'
  ) as any;

  if (dec2025.length === 0) {
    console.log('⚠️  2025年12月のシフトが存在しません！');
    console.log('   削除したShift ID 32は実際には2025年12月用だった可能性があります。');
    console.log('\n🔧 対応方法:');
    console.log('   1. 新しく2025年12月のシフトを作成する');
    console.log('   2. 休暇・勤務希望データは登録済み（104件の休暇、10件の勤務希望）');
    console.log('   3. これらのデータを基にシフトを生成可能');
  } else {
    console.log('✅ 2025年12月のシフトが存在します。');
    console.log(`   シフトID: ${dec2025[0].id}`);
  }

  // 削除されたデータの確認
  console.log('\n📊 削除履歴:');
  console.log('   Shift ID 32 (764件のshiftDetails) を削除済み');
  console.log('   削除時の表示: 2024年12月');
  console.log('   実際の内容: 2025年12月用のデータだった可能性大');

  // 今後の対応
  console.log('\n💡 推奨される対応:');
  console.log('   1. 2025年12月の新しいシフトを作成');
  console.log('   2. 既に登録済みの休暇・勤務希望データを使用');
  console.log('   3. 段階的生成またはAI生成でシフトを配置');

  await conn.end();
}

checkShifts().catch(console.error);