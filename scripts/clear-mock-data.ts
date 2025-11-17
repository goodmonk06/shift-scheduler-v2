/**
 * モックデータを削除するスクリプト
 *
 * 実行方法: pnpm tsx scripts/clear-mock-data.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function clearMockData() {
  // Remove ssl-mode parameter if present (not supported by mysql2)
  const connectionString = process.env.DATABASE_URL!.replace(/[?&]ssl-mode=[^&]*/g, '');
  const connection = await mysql.createConnection(connectionString);

  console.log('🗑️  モックデータを削除します...\n');

  try {
    // 外部キー制約を一時的に無効化
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 削除するテーブルとその件数を確認
    const tables = [
      'shiftDetails',
      'shiftActuals',
      'leaveRequests',
      'emergencyNotifications',
      'shifts',
      'employeeConstraints',
      'employees',
      'requiredStaffing',
      'workplaceRules',
      'workTimeSlots',
      'positionGroups',
      'changeProposals',
      'auditLogs',
      'pushSubscriptions',
      'staffSettings',
    ];

    console.log('📊 削除前のデータ件数:');
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const count = (rows as any)[0].count;
      console.log(`  ${table}: ${count}件`);
    }

    console.log('\n❓ 本当に削除しますか？ (5秒待機中...)');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // データを削除（逆順で削除して外部キー制約エラーを回避）
    for (const table of tables) {
      await connection.execute(`DELETE FROM ${table}`);
      console.log(`✅ ${table} をクリア`);
    }

    // 外部キー制約を再度有効化
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✨ すべてのモックデータを削除しました！');
    console.log('\n📝 次のステップ:');
    console.log('  1. 管理画面で職種グループを作成');
    console.log('  2. 勤務時間枠を作成');
    console.log('  3. 職員を登録');
    console.log('  4. 職場ルールを設定');
    console.log('  5. シフトを作成してAI自動生成');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

clearMockData().catch(console.error);
