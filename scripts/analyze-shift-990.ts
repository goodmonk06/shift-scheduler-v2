import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // シフト名で検索
  const [shifts] = await connection.query(
    'SELECT * FROM shifts WHERE name LIKE ? ORDER BY id DESC LIMIT 1',
    ['%12月シフト_20251122_990%']
  );

  if ((shifts as any[]).length === 0) {
    console.log('シフト「12月シフト_20251122_990」が見つかりませんでした。');
    console.log('\n最近保存されたシフト一覧:');
    const [allShifts] = await connection.query(
      'SELECT id, name, createdAt FROM shifts WHERE month = 12 ORDER BY createdAt DESC LIMIT 10'
    );
    console.table(allShifts);
    await connection.end();
    return;
  }

  const shift = (shifts as any[])[0];
  console.log(`\nシフトID: ${shift.id}`);
  console.log(`名前: ${shift.name}`);
  console.log(`作成日時: ${shift.createdAt}\n`);

  // 全データを取得
  const [details] = await connection.query(
    `SELECT e.name as employeeName, sd.date, sd.status, sd.displayText, sd.startTime, sd.endTime, sd.leaveType
     FROM shiftDetails sd
     JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = ?
     ORDER BY sd.date, e.name`,
    [shift.id]
  );

  const detailsArray = details as any[];
  console.log(`=== 全データ件数: ${detailsArray.length}件 ===\n`);

  // 日付ごとにグループ化
  const byDate: { [date: string]: any[] } = {};
  detailsArray.forEach((d: any) => {
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  });

  const dates = Object.keys(byDate).sort();

  console.log(`=== 日付一覧（${dates.length}日分） ===\n`);
  dates.forEach(date => {
    console.log(`${date}: ${byDate[date].length}名`);
  });

  // 12月19日を詳しく見る
  console.log('\n=== 12月19日の詳細 ===\n');

  if (byDate['2025-12-19']) {
    const dec19 = byDate['2025-12-19'];
    console.log(`合計: ${dec19.length}名\n`);

    dec19.forEach((d: any) => {
      const displayInfo = d.displayText ||
                         (d.startTime && d.endTime ? `${d.startTime}-${d.endTime}` : '') ||
                         d.leaveType ||
                         d.status ||
                         'null';
      console.log(`${d.employeeName.padEnd(20)} | ${displayInfo.padEnd(15)} | status: ${d.status}`);
    });

    // 8:00の人数カウント
    console.log('\n=== 8:00時点での勤務者（分析） ===\n');

    const parseShiftTime = (text: string | null, status: string): { start: number; end: number } | null => {
      if (!text) return null;
      if (text === '夜') return { start: 16, end: 24 };
      if (text === '休' || text === '' || text === '有' || text === '冬' || text === '明' || text === '研修') return null;
      if (text === '日') return { start: 9, end: 18 };
      if (text === '日A') return { start: 8, end: 17 };
      if (text === '日B') return { start: 9, end: 18 };
      if (text === '早') return { start: 7, end: 16 };
      if (text === '遅') return { start: 10, end: 19 };

      const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
      if (match) {
        let start = parseInt(match[1]);
        if (text.includes(match[1] + '半')) start += 0.5;
        let end = parseInt(match[2]);
        if (text.includes(match[2] + '半')) end += 0.5;
        return { start, end };
      }
      return { start: 9, end: 18 };
    };

    // 前日（18日）の夜勤チェック
    console.log('前日（12/18）の夜勤チェック:');
    if (byDate['2025-12-18']) {
      const dec18 = byDate['2025-12-18'];
      const nightWorkers = dec18.filter((d: any) => d.displayText === '夜');
      if (nightWorkers.length > 0) {
        nightWorkers.forEach((d: any) => {
          console.log(`  ${d.employeeName}: 夜勤 → 翌日0:00-9:00にカウント`);
        });
      } else {
        console.log('  なし');
      }
    } else {
      console.log('  12/18のデータなし');
    }

    console.log('\n8:00に勤務中のスタッフ:');
    let count8am = 0;

    // 前日夜勤
    if (byDate['2025-12-18']) {
      const dec18 = byDate['2025-12-18'];
      const nightWorkers = dec18.filter((d: any) => d.displayText === '夜');
      nightWorkers.forEach((d: any) => {
        console.log(`  ${d.employeeName} (前日夜勤)`);
        count8am++;
      });
    }

    // 当日勤務
    dec19.forEach((d: any) => {
      const time = parseShiftTime(d.displayText, d.status);
      if (time && time.start <= 8 && time.end > 8) {
        console.log(`  ${d.employeeName} (${d.displayText})`);
        count8am++;
      }
    });

    console.log(`\n8:00の合計人数: ${count8am}名`);
    console.log(`必要人数: 3名`);
    console.log(`差分: ${count8am - 3}名`);

    // 18:00の人数カウント
    console.log('\n=== 18:00時点での勤務者（分析） ===\n');

    let count6pm = 0;
    dec19.forEach((d: any) => {
      const time = parseShiftTime(d.displayText, d.status);
      if (time && time.start <= 18 && time.end > 18) {
        console.log(`  ${d.employeeName} (${d.displayText})`);
        count6pm++;
      }
    });

    console.log(`\n18:00の合計人数: ${count6pm}名`);
    console.log(`必要人数: 2名`);
    console.log(`差分: ${count6pm - 2}名`);

  } else {
    console.log('12月19日のデータがありません');
  }

  await connection.end();
}

main().catch(console.error);
