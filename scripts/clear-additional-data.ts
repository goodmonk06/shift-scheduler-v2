import 'dotenv/config';
import mysql from 'mysql2/promise';

async function clearAdditionalData() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log('🗑️  追加データを削除します...\n');

  try {
    // 外部キー制約を一時的に無効化
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tables = ['leaveRequests', 'changeProposals'];

    console.log('📊 削除前のデータ件数:');
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const count = (rows as any)[0].count;
      console.log(`  ${table}: ${count}件`);
    }

    if ((await connection.execute(`SELECT COUNT(*) as count FROM leaveRequests`))[0] as any)[0].count === 0 &&
        (await connection.execute(`SELECT COUNT(*) as count FROM changeProposals`))[0] as any)[0].count === 0) {
      console.log('\n✨ 削除するデータはありません');
      await connection.end();
      return;
    }

    console.log('\n❓ 本当に削除しますか？ (3秒待機中...)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    for (const table of tables) {
      await connection.execute(`DELETE FROM ${table}`);
      console.log(`✅ ${table} をクリア`);
    }

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✨ 追加データを削除しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

clearAdditionalData().catch(console.error);
