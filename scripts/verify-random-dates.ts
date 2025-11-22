import mysql from 'mysql2/promise';

// parseShiftTime関数（最新版）
const parseShiftTime = (text: string | null, status: string): { start: number; end: number } | null => {
  if (!text) return null;
  if (text === '夜') return { start: 16, end: 24 };
  if (text === '明') return { start: 0, end: 9 };
  if (text === '休' || text === '' || text === '有' || text === '冬' || text === '研修') return null;
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

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // シフト取得
  const [shifts] = await connection.query(
    'SELECT * FROM shifts WHERE name LIKE ? ORDER BY id DESC LIMIT 1',
    ['%12月シフト_20251122_990%']
  );

  if ((shifts as any[]).length === 0) {
    console.log('シフトが見つかりませんでした');
    await connection.end();
    return;
  }

  const shift = (shifts as any[])[0];
  console.log(`シフト: ${shift.name} (ID: ${shift.id})\n`);

  // 全データ取得
  const [details] = await connection.query(
    `SELECT e.id as employeeId, e.name as employeeName, sd.date, sd.displayText
     FROM shiftDetails sd
     JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = ?
     ORDER BY sd.date, e.name`,
    [shift.id]
  );

  const detailsArray = details as any[];

  // 日付ごとにグループ化
  const byDate: { [date: string]: any[] } = {};
  detailsArray.forEach((d: any) => {
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  });

  const dates = Object.keys(byDate).sort().filter(d => d.startsWith('2025-12'));

  // ランダムに5日選択
  const selectedDates: string[] = [];
  const datesCopy = [...dates];
  for (let i = 0; i < 5 && datesCopy.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * datesCopy.length);
    selectedDates.push(datesCopy[randomIndex]);
    datesCopy.splice(randomIndex, 1);
  }

  selectedDates.sort();

  console.log('=== ランダムに選択した5日分の検証 ===\n');

  const FULL_TIME_STAFF = ['山口 夕香里', '馬渕 尊至', '松嵜 愛梨', '櫻井 香澄', '山本 美夢', '杉浦 秀樹'];
  const CLERK_ID = '27'; // 淺野 穂菜美

  // 必要人数設定（金曜日）
  const REQUIRED_FRIDAY = [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1];
  const REQUIRED_MONDAY = [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 8,8, 6,6, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1];

  for (const dateStr of selectedDates) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=日, 1=月, ..., 6=土
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    console.log(`\n━━━ ${dateStr}（${dayNames[dayOfWeek]}） ━━━\n`);

    const todayData = byDate[dateStr] || [];

    // 前日データ取得
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevData = byDate[prevDateStr] || [];

    // 人数カウント
    const halfHourCounts = new Array(48).fill(0);
    const halfHourFullTimeCounts = new Array(48).fill(0);

    // 前日夜勤チェック
    prevData.forEach((d: any) => {
      if (d.displayText === '夜') {
        // 翌日に「明」があるかチェック
        const todayPerson = todayData.find((t: any) => t.employeeId === d.employeeId);
        if (todayPerson && todayPerson.displayText === '明') {
          return; // 「明」でカウントされるのでスキップ
        }
        // 「明」がない場合、0-9時をカウント
        for (let slot = 0; slot < 18; slot++) {
          if (d.employeeId !== CLERK_ID) {
            halfHourCounts[slot]++;
          }
          if (FULL_TIME_STAFF.includes(d.employeeName)) {
            halfHourFullTimeCounts[slot]++;
          }
        }
      }
    });

    // 当日カウント
    todayData.forEach((d: any) => {
      const time = parseShiftTime(d.displayText, 'working');
      if (!time) return;

      let start = time.start;
      let end = time.end;
      if (end > 24) end = 24;

      const startSlot = Math.floor(start * 2);
      const endSlot = Math.floor(end * 2);

      for (let slot = startSlot; slot < endSlot; slot++) {
        if (slot >= 0 && slot < 48) {
          // 事務員除外
          if (d.employeeId !== CLERK_ID) {
            halfHourCounts[slot]++;
          }
          if (FULL_TIME_STAFF.includes(d.employeeName)) {
            halfHourFullTimeCounts[slot]++;
          }
          // 事務員は9-18で正社員カウント
          if (d.employeeId === CLERK_ID && slot >= 18 && slot < 36) {
            halfHourFullTimeCounts[slot]++;
          }
        }
      }
    });

    // 不足チェック
    const required = dayOfWeek === 5 ? REQUIRED_FRIDAY : REQUIRED_MONDAY; // 簡易版
    let hasShortage = false;
    const shortageSlots: string[] = [];

    for (let slot = 0; slot < 48; slot++) {
      const hour = Math.floor(slot / 2);
      const min = (slot % 2) === 0 ? '00' : '30';
      const timeLabel = `${String(hour).padStart(2, '0')}:${min}`;
      const req = required[slot];
      const curr = halfHourCounts[slot];
      const diff = curr - req;

      if (diff < 0) {
        hasShortage = true;
        shortageSlots.push(`${timeLabel}(${diff})`);
      }

      // 正社員チェック（9:00-16:00）
      if (slot >= 18 && slot < 32) {
        if (halfHourFullTimeCounts[slot] < 1) {
          hasShortage = true;
          if (!shortageSlots.includes(`${timeLabel}(正社員不足)`)) {
            shortageSlots.push(`${timeLabel}(正社員不足)`);
          }
        }
      }
    }

    // 代表的な時間帯を表示
    const checkSlots = [16, 18, 20, 24, 26, 36]; // 8:00, 9:00, 10:00, 12:00, 13:00, 18:00
    checkSlots.forEach(slot => {
      const hour = Math.floor(slot / 2);
      const min = (slot % 2) === 0 ? '00' : '30';
      const timeLabel = `${String(hour).padStart(2, '0')}:${min}`;
      const req = required[slot];
      const curr = halfHourCounts[slot];
      const fullTime = halfHourFullTimeCounts[slot];
      const diff = curr - req;
      const status = diff >= 0 ? '✓' : '✗';

      console.log(`${timeLabel} | 必要:${req}名 実際:${curr}名 (正社員:${fullTime}名) | ${status} ${diff >= 0 ? '+' + diff : diff}`);
    });

    if (hasShortage) {
      console.log(`\n⚠️ 不足あり: ${shortageSlots.slice(0, 5).join(', ')}${shortageSlots.length > 5 ? '...' : ''}`);
    } else {
      console.log('\n✅ すべての時間帯でOK');
    }
  }

  await connection.end();
}

main().catch(console.error);
