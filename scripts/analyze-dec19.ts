import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  // シフト名で検索
  const [shifts] = await connection.query(
    'SELECT * FROM shifts WHERE name LIKE ? ORDER BY id DESC LIMIT 1',
    ['%12月シフト_20251122_742%']
  );

  if ((shifts as any[]).length === 0) {
    console.log('シフトが見つかりませんでした。');
    console.log('保存されているシフト一覧:');
    const [allShifts] = await connection.query(
      'SELECT id, name, createdAt FROM shifts WHERE month = 12 ORDER BY createdAt DESC LIMIT 10'
    );
    console.table(allShifts);
    await connection.end();
    return;
  }

  const shift = (shifts as any[])[0];
  console.log(`シフトID: ${shift.id}, 名前: ${shift.name}\n`);

  // 12月19日のデータを取得（employeesテーブルと結合）
  const [details] = await connection.query(
    `SELECT e.name as employeeName, sd.date, sd.status, sd.displayText, sd.startTime, sd.endTime, sd.leaveType
     FROM shiftDetails sd
     JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = ? AND sd.date = '2025-12-19'
     ORDER BY e.name`,
    [shift.id]
  );

  console.log('=== 12月19日（金）の勤務状況 ===\n');

  const detailsArray = details as any[];
  detailsArray.forEach((d: any) => {
    const displayInfo = d.displayText || `${d.startTime || ''}-${d.endTime || ''}` || d.status || d.leaveType || '?';
    console.log(`${d.employeeName.padEnd(15)} | ${displayInfo}`);
  });

  console.log(`\n合計: ${detailsArray.length}名のデータ`);

  // 時間別カウント
  console.log('\n=== 時間別カウント（30分刻み） ===\n');

  // 正社員リスト
  const FULL_TIME_STAFF = ['山口 夕香里', '馬渕 尊至', '松嵜 愛梨', '櫻井 香澄', '山本 美夢', '杉浦 秀樹'];
  const CLERK = '長嶋 恵里花';

  // 時間解析関数
  const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
    if (text === '夜' || type === 'NIGHT') return { start: 16, end: 24 };
    if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '明' || text === '研修') return null;
    if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
    if (text === '日A') return { start: 8, end: 17 };
    if (text === '日B') return { start: 9, end: 18 };
    if (text === '早' || type === 'EARLY') return { start: 7, end: 16 };
    if (text === '遅' || type === 'LATE') return { start: 10, end: 19 };

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

  const halfHourCounts = new Array(48).fill(0);
  const halfHourFullTimeCounts = new Array(48).fill(0);
  const staffAtTime: { [slot: number]: string[] } = {};

  // 前日（18日）の夜勤をチェック
  const [prevDetails] = await connection.query(
    `SELECT e.name as employeeName, sd.date, sd.status, sd.displayText, sd.startTime, sd.endTime
     FROM shiftDetails sd
     JOIN employees e ON sd.employeeId = e.id
     WHERE sd.shiftId = ? AND sd.date = '2025-12-18'`,
    [shift.id]
  );

  console.log('\n前日（12/18）の夜勤チェック:');
  (prevDetails as any[]).forEach((d: any) => {
    if (d.displayText === '夜' || (d.startTime === '16:00' && d.endTime === '09:00')) {
      console.log(`  ${d.employeeName}: 夜勤 → 翌日0:00-9:00にカウント`);
      // 0:00～9:00 = slot 0～17
      for (let slot = 0; slot < 18; slot++) {
        halfHourCounts[slot]++;
        if (!staffAtTime[slot]) staffAtTime[slot] = [];
        staffAtTime[slot].push(`${d.employeeName}(前日夜勤)`);
        if (FULL_TIME_STAFF.includes(d.employeeName)) {
          halfHourFullTimeCounts[slot]++;
        }
      }
    }
  });

  console.log('\n当日（12/19）の勤務:');
  detailsArray.forEach((d: any) => {
    const displayText = d.displayText || `${d.startTime}-${d.endTime}`;
    const time = parseShiftTime(displayText, d.status);
    if (!time) {
      console.log(`  ${d.employeeName}: ${displayText} → カウントなし`);
      return;
    }

    console.log(`  ${d.employeeName}: ${displayText} → ${time.start}:00-${time.end}:00`);

    let start = time.start;
    let end = time.end;
    if (end > 24) end = 24;

    const startSlot = Math.floor(start * 2);
    const endSlot = Math.floor(end * 2);

    for (let slot = startSlot; slot < endSlot; slot++) {
      if (slot >= 0 && slot < 48) {
        halfHourCounts[slot]++;
        if (!staffAtTime[slot]) staffAtTime[slot] = [];
        staffAtTime[slot].push(d.employeeName);

        if (FULL_TIME_STAFF.includes(d.employeeName)) {
          halfHourFullTimeCounts[slot]++;
        }
        if (d.employeeName === CLERK && slot >= 18 && slot < 36) {
          halfHourFullTimeCounts[slot]++;
        }
      }
    }
  });

  // 金曜日の必要人数
  const REQUIRED_FRIDAY = [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1];

  console.log('\n=== 30分刻みでの人数チェック ===\n');

  for (let slot = 0; slot < 48; slot++) {
    const hour = Math.floor(slot / 2);
    const minute = (slot % 2) === 0 ? '00' : '30';
    const timeLabel = `${String(hour).padStart(2, '0')}:${minute}`;
    const required = REQUIRED_FRIDAY[slot];
    const current = halfHourCounts[slot];
    const fullTime = halfHourFullTimeCounts[slot];
    const diff = current - required;

    let status = '';
    if (diff >= 0) {
      status = '✓ OK';
    } else {
      status = `✗ 不足${Math.abs(diff)}名`;
    }

    // 9:00-16:00の正社員チェック
    let fullTimeStatus = '';
    if (slot >= 18 && slot < 32) {
      if (fullTime < 1) {
        fullTimeStatus = ' [正社員不足]';
      }
    }

    console.log(`${timeLabel} | 必要:${required}名 実際:${current}名 (正社員:${fullTime}名) | ${status}${fullTimeStatus}`);

    if (diff < 0 || (slot >= 18 && slot < 32 && fullTime < 1)) {
      console.log(`       スタッフ: ${staffAtTime[slot]?.join(', ') || 'なし'}`);
    }
  }

  await connection.end();
}

main().catch(console.error);
