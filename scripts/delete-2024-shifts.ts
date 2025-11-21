/**
 * 2024年の古いシフトデータを削除するスクリプト
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

async function deleteOldShifts() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗑️ 2024年の古いシフトデータを削除');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // トランザクション開始
    await conn.beginTransaction();

    // 2024年のシフト一覧を確認
    const [oldShifts] = await conn.execute(
      'SELECT id, name, year, month FROM shifts WHERE year = 2024'
    ) as any;

    if (oldShifts.length === 0) {
      console.log('✅ 2024年のシフトは見つかりませんでした');
      await conn.rollback();
      return;
    }

    console.log('🔍 2024年のシフト一覧:');
    for (const shift of oldShifts) {
      console.log(`  ID: ${shift.id}, ${shift.name} (${shift.year}年${shift.month}月)`);

      // 関連するshiftDetailsの数を確認
      const [detailCount] = await conn.execute(
        'SELECT COUNT(*) as count FROM shiftDetails WHERE shiftId = ?',
        [shift.id]
      ) as any;
      console.log(`    → shiftDetails: ${detailCount[0].count}件`);

      // 関連するleaveRequestsの数を確認
      const [leaveCount] = await conn.execute(
        'SELECT COUNT(*) as count FROM leaveRequests WHERE shiftId = ?',
        [shift.id]
      ) as any;
      console.log(`    → leaveRequests: ${leaveCount[0].count}件`);

      // 関連するworkPreferencesの数を確認
      const [workPrefCount] = await conn.execute(
        'SELECT COUNT(*) as count FROM workPreferences WHERE shiftId = ?',
        [shift.id]
      ) as any;
      console.log(`    → workPreferences: ${workPrefCount[0].count}件\n`);
    }

    console.log('\n⚠️  以下のデータを削除します:');
    console.log('  1. 2024年のすべてのshiftsレコード');
    console.log('  2. 関連するすべてのshiftDetails');
    console.log('  3. 関連するすべてのleaveRequests');
    console.log('  4. 関連するすべてのworkPreferences\n');

    // ユーザー確認（自動実行のため確認はスキップ）
    console.log('🗑️  削除を実行中...\n');

    for (const shift of oldShifts) {
      console.log(`  削除中: Shift ID ${shift.id} (${shift.name})...`);

      // workPreferencesを削除
      const [workPrefResult] = await conn.execute(
        'DELETE FROM workPreferences WHERE shiftId = ?',
        [shift.id]
      ) as any;
      if (workPrefResult.affectedRows > 0) {
        console.log(`    ✅ workPreferences ${workPrefResult.affectedRows}件削除`);
      }

      // leaveRequestsを削除
      const [leaveResult] = await conn.execute(
        'DELETE FROM leaveRequests WHERE shiftId = ?',
        [shift.id]
      ) as any;
      if (leaveResult.affectedRows > 0) {
        console.log(`    ✅ leaveRequests ${leaveResult.affectedRows}件削除`);
      }

      // shiftDetailsを削除
      const [detailResult] = await conn.execute(
        'DELETE FROM shiftDetails WHERE shiftId = ?',
        [shift.id]
      ) as any;
      if (detailResult.affectedRows > 0) {
        console.log(`    ✅ shiftDetails ${detailResult.affectedRows}件削除`);
      }

      // shiftsを削除
      const [shiftResult] = await conn.execute(
        'DELETE FROM shifts WHERE id = ?',
        [shift.id]
      ) as any;
      if (shiftResult.affectedRows > 0) {
        console.log(`    ✅ shift本体を削除`);
      }
    }

    // コミット
    await conn.commit();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 削除完了!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 残っているシフトを確認
    const [remainingShifts] = await conn.execute(
      'SELECT id, name, year, month FROM shifts ORDER BY year DESC, month DESC'
    ) as any;

    console.log('📋 残っているシフト:');
    for (const shift of remainingShifts) {
      console.log(`  ID: ${shift.id}, ${shift.name} (${shift.year}年${shift.month}月)`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

deleteOldShifts().catch(err => {
  console.error('❌ Delete failed:', err.message);
  process.exit(1);
});