import mysql from 'mysql2/promise';

const CORRECT_STAFFING = {
  // 時間帯別の必要人数 (曜日: 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土)
  0: { all: 1 },  // 0時
  1: { all: 1 },  // 1時
  2: { all: 1 },  // 2時
  3: { all: 1 },  // 3時
  4: { all: 1 },  // 4時
  5: { all: 1 },  // 5時
  6: { all: 2 },  // 6時
  7: { all: 2 },  // 7時
  8: { all: 3 },  // 8時
  9: { 0: 4, 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 6 },  // 9時
  10: { 0: 4, 1: 8, 2: 7, 3: 8, 4: 7, 5: 7, 6: 5 }, // 10時
  11: { 0: 4, 1: 6, 2: 8, 3: 7, 4: 6, 5: 7, 6: 6 }, // 11時
  12: { all: 2 }, // 12時
  13: { 0: 3, 1: 6, 2: 7, 3: 6, 4: 6, 5: 6, 6: 6 }, // 13時
  14: { 0: 3, 1: 5, 2: 6, 3: 5, 4: 5, 5: 5, 6: 4 }, // 14時
  15: { 0: 3, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 }, // 15時
  16: { all: 3 }, // 16時
  17: { all: 2 }, // 17時
  18: { all: 2 }, // 18時
  19: { all: 2 }, // 19時
  20: { all: 1 }, // 20時
  21: { all: 1 }, // 21時
  22: { all: 1 }, // 22時
  23: { all: 1 }, // 23時
} as const;

async function updateRequiredStaffing() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    console.log('🔄 必要人員配置を正しい値に更新中...\n');

    // まず現在のデータを削除
    await conn.query('DELETE FROM requiredStaffing');
    console.log('✓ 既存データを削除しました');

    // 新しいデータを挿入
    let insertCount = 0;

    for (let hour = 0; hour < 24; hour++) {
      const staffing = CORRECT_STAFFING[hour as keyof typeof CORRECT_STAFFING];

      if ('all' in staffing) {
        // 全曜日共通
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          await conn.query(
            'INSERT INTO requiredStaffing (dayOfWeek, hour, requiredCount) VALUES (?, ?, ?)',
            [dayOfWeek, hour, staffing.all]
          );
          insertCount++;
        }
      } else {
        // 曜日別
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const count = staffing[dayOfWeek as keyof typeof staffing];
          await conn.query(
            'INSERT INTO requiredStaffing (dayOfWeek, hour, requiredCount) VALUES (?, ?, ?)',
            [dayOfWeek, hour, count]
          );
          insertCount++;
        }
      }
    }

    console.log('✓ 新しいデータを挿入しました:', insertCount + 'レコード');

    // 確認
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('設定確認 (サンプル):\n');

    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const sampleHours = [0, 6, 9, 10, 12, 16, 20];

    for (const hour of sampleHours) {
      const [results] = await conn.query(
        'SELECT dayOfWeek, requiredCount FROM requiredStaffing WHERE hour = ? ORDER BY dayOfWeek',
        [hour]
      ) as any;

      const counts = results.map((r: any) => r.requiredCount);
      const unique = [...new Set(counts)];

      if (unique.length === 1) {
        console.log(hour + '時: 全曜日 ' + unique[0] + '名');
      } else {
        console.log(hour + '時: ' + results.map((r: any, i: number) => dayNames[r.dayOfWeek] + r.requiredCount).join(', ') + '名');
      }
    }

    // 統計
    const [stats] = await conn.query(`
      SELECT
        COUNT(*) as totalRecords,
        SUM(requiredCount) as weeklyTotal,
        MAX(requiredCount) as maxRequired,
        MIN(requiredCount) as minRequired
      FROM requiredStaffing
    `) as any;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('統計情報:');
    console.log('- 総レコード数:', stats[0].totalRecords);
    console.log('- 週間延べ必要人数:', stats[0].weeklyTotal + '人');
    console.log('- 同時最大必要人数:', stats[0].maxRequired + '人');
    console.log('- 同時最小必要人数:', stats[0].minRequired + '人');
    console.log('\n✅ 必要人員配置の更新が完了しました！');

  } finally {
    await conn.end();
  }
}

updateRequiredStaffing().catch(console.error);
