import * as db from '../server/db';

async function verifyDecemberShifts() {
  try {
    console.log('================================================================================');
    console.log('12月シフト検証');
    console.log('================================================================================\n');

    // シフトを取得
    const shift = await db.getShiftByYearMonth(2025, 12);
    if (!shift) {
      console.log('❌ 2025年12月のシフトが見つかりません');
      process.exit(1);
    }

    console.log(`✅ シフトID: ${shift.id}\n`);

    // シフト詳細を取得
    const shiftDetails = await db.getShiftDetailsByShiftId(shift.id);
    console.log(`✅ 総シフト件数: ${shiftDetails.length}件\n`);

    // 従業員を取得
    const employees = await db.getAllEmployees();

    // ステータス別集計
    const byStatus = shiftDetails.reduce((acc, sd) => {
      acc[sd.status] = (acc[sd.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('ステータス別集計:');
    for (const [status, count] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${count}件`);
    }
    console.log();

    // 生成方法別集計
    const byGenerated = shiftDetails.reduce((acc, sd) => {
      const method = sd.generatedBy || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('生成方法別集計:');
    for (const [method, count] of Object.entries(byGenerated)) {
      console.log(`  ${method}: ${count}件`);
    }
    console.log();

    // 従業員別集計
    console.log('================================================================================');
    console.log('従業員別集計（勤務日数・休み日数）');
    console.log('================================================================================\n');

    const employeeStats = employees.map(emp => {
      const empShifts = shiftDetails.filter(sd => sd.employeeId === emp.id);
      const working = empShifts.filter(sd => sd.status === 'working').length;
      const off = empShifts.filter(sd => sd.status === 'requested_off' || sd.status === 'off').length;
      const pending = empShifts.filter(sd => sd.status === 'pending').length;
      const canNight = emp.canWorkNightShift === true;

      return {
        name: emp.name,
        canNight,
        total: empShifts.length,
        working,
        off,
        pending
      };
    });

    // 正社員（夜勤可能=正社員）
    console.log('【正社員（夜勤可能）】');
    const fullTimeStats = employeeStats.filter(s => s.canNight);
    for (const stat of fullTimeStats) {
      console.log(`  ${stat.name.padEnd(15)} - 勤務:${String(stat.working).padStart(2)}日、休み:${String(stat.off).padStart(2)}日、保留:${String(stat.pending).padStart(2)}日、合計:${stat.total}日`);
    }
    console.log();

    // パート（夜勤不可）
    console.log('【パートタイム（夜勤不可）】');
    const partTimeStats = employeeStats.filter(s => !s.canNight);
    for (const stat of partTimeStats) {
      console.log(`  ${stat.name.padEnd(15)} - 勤務:${String(stat.working).padStart(2)}日、休み:${String(stat.off).padStart(2)}日、保留:${String(stat.pending).padStart(2)}日、合計:${stat.total}日`);
    }
    console.log();

    // 個別制約検証
    console.log('================================================================================');
    console.log('個別制約検証（サンプル）');
    console.log('================================================================================\n');

    // 足立洋子: 月曜9-16時、木曜8-16時
    const adachi = employees.find(e => e.name === '足立 洋子');
    if (adachi) {
      const adachiShifts = shiftDetails.filter(sd =>
        sd.employeeId === adachi.id && sd.status === 'working'
      );
      const mondays = adachiShifts.filter(sd => {
        const date = new Date(sd.date);
        return date.getDay() === 1;
      });
      const thursdays = adachiShifts.filter(sd => {
        const date = new Date(sd.date);
        return date.getDay() === 4;
      });

      console.log(`足立 洋子:`);
      console.log(`  月曜勤務: ${mondays.length}回`);
      if (mondays.length > 0) {
        console.log(`    - ${mondays[0].date}: ${mondays[0].startTime}-${mondays[0].endTime}`);
      }
      console.log(`  木曜勤務: ${thursdays.length}回`);
      if (thursdays.length > 0) {
        console.log(`    - ${thursdays[0].date}: ${thursdays[0].startTime}-${thursdays[0].endTime}`);
      }
      console.log();
    }

    // 桂川美幸: 月水金日 18-20時
    const katsura = employees.find(e => e.name === '桂川 美幸');
    if (katsura) {
      const katsuraShifts = shiftDetails.filter(sd =>
        sd.employeeId === katsura.id && sd.status === 'working'
      );
      const targetDays = katsuraShifts.filter(sd => {
        const date = new Date(sd.date);
        const dow = date.getDay();
        return dow === 1 || dow === 3 || dow === 5 || dow === 0;
      });
      const wrongDays = katsuraShifts.filter(sd => {
        const date = new Date(sd.date);
        const dow = date.getDay();
        return dow !== 1 && dow !== 3 && dow !== 5 && dow !== 0;
      });

      console.log(`桂川 美幸:`);
      console.log(`  月水金日勤務: ${targetDays.length}回`);
      if (targetDays.length > 0) {
        console.log(`    - ${targetDays[0].date}: ${targetDays[0].startTime}-${targetDays[0].endTime}`);
      }
      console.log(`  その他曜日勤務: ${wrongDays.length}回 ${wrongDays.length > 0 ? '⚠️' : '✅'}`);
      console.log();
    }

    // 伊藤美穂: 休職（全期間休み）
    const ito = employees.find(e => e.name === '伊藤 美穂');
    if (ito) {
      const itoShifts = shiftDetails.filter(sd => sd.employeeId === ito.id);
      const working = itoShifts.filter(sd => sd.status === 'working').length;
      const off = itoShifts.filter(sd => sd.status === 'requested_off' || sd.status === 'off').length;

      console.log(`伊藤 美穂（休職）:`);
      console.log(`  休み: ${off}日（全${itoShifts.length}日）`);
      console.log(`  勤務: ${working}日 ${working > 0 ? '⚠️' : '✅'}`);
      console.log();
    }

    // 夜勤職員の検証
    console.log('================================================================================');
    console.log('夜勤配置検証');
    console.log('================================================================================\n');

    const nightShifts = shiftDetails.filter(sd =>
      sd.status === 'working' && sd.startTime === '16:00' && sd.endTime === '09:00'
    );

    console.log(`夜勤シフト総数: ${nightShifts.length}件`);

    // 夜勤職員別集計
    const nightStaff = nightShifts.reduce((acc, sd) => {
      acc[sd.employeeId] = (acc[sd.employeeId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('夜勤職員別:');
    for (const [empId, count] of Object.entries(nightStaff)) {
      const emp = employees.find(e => e.id === Number(empId));
      console.log(`  ${emp?.name}: ${count}回`);
    }
    console.log();

    console.log('================================================================================');
    console.log('✅ 検証完了');
    console.log('================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

verifyDecemberShifts();
