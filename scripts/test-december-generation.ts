import * as db from '../server/db';
import { generateShiftWithPhases } from '../server/phaseBasedShiftGenerator';

/**
 * 12月シフト生成テスト
 *
 * このスクリプトは段階的シフト生成を実行し、
 * パートタイム職員の個別条件が正しく反映されているかを検証します。
 */

async function testDecemberGeneration() {
  try {
    console.log('='.repeat(80));
    console.log('12月シフト段階的生成テスト');
    console.log('='.repeat(80));
    console.log('\n');

    // 2025年12月のシフトを取得または作成
    console.log('📅 2025年12月のシフトを確認中...\n');
    const existingShifts = await db.getShiftsByMonth(2025, 12);

    let shiftId: number;
    if (existingShifts.length > 0) {
      shiftId = existingShifts[0].id;
      console.log(`✅ 既存のシフト (ID: ${shiftId}) を使用します\n`);
    } else {
      console.log('⚠️  2025年12月のシフトが見つかりません。');
      console.log('先に以下のスクリプトを実行してください:');
      console.log('  pnpm tsx -r dotenv/config scripts/register-december-leaves.ts\n');
      process.exit(1);
    }

    // 段階的生成を実行
    console.log('🚀 段階的シフト生成を開始します...\n');
    const result = await generateShiftWithPhases(shiftId, 2025, 12);

    console.log('\n' + '='.repeat(80));
    console.log('生成結果サマリー');
    console.log('='.repeat(80));
    console.log(`Phase 1 (ハード制約): ${result.confirmedShifts.length}件`);
    console.log(`Phase 3 (ルールベース): ${result.ruleBasedShifts.length}件`);
    console.log(`合計: ${result.allShifts.length}件`);
    console.log('='.repeat(80));

    // 個別制約の検証
    console.log('\n');
    console.log('='.repeat(80));
    console.log('個別制約の検証');
    console.log('='.repeat(80));

    const employees = await db.getAllEmployees();
    const verifications = [
      {
        name: '足立洋子',
        check: (shifts: any[]) => {
          const mondays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 1 && s.status === 'working';
          });
          const thursdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 4 && s.status === 'working';
          });
          const mondayTimes = mondays.every((s: any) => s.startTime === '09:00' && s.endTime === '16:00');
          const thursdayTimes = thursdays.every((s: any) => s.startTime === '08:00' && s.endTime === '16:00');
          return {
            pass: mondays.length >= 4 && thursdays.length >= 4 && mondayTimes && thursdayTimes,
            message: `月曜日${mondays.length}回(9-16時)、木曜日${thursdays.length}回(8-16時)`,
          };
        },
      },
      {
        name: '桂川美幸',
        check: (shifts: any[]) => {
          const workDays = shifts.filter((s: any) => s.status === 'working');
          const correctDays = workDays.filter((s: any) => {
            const date = new Date(s.date);
            const dow = date.getDay();
            return (dow === 1 || dow === 3 || dow === 5 || dow === 0) &&
                   s.startTime === '18:00' && s.endTime === '20:00';
          });
          return {
            pass: workDays.length === correctDays.length && workDays.length >= 16,
            message: `月水金日のみ勤務${workDays.length}回、正しい時間${correctDays.length}回`,
          };
        },
      },
      {
        name: '加藤広大',
        check: (shifts: any[]) => {
          const tuesdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 2 && s.status === 'working';
          });
          const wednesdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 3 && s.status === 'working';
          });
          const saturdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 6 && s.status === 'working';
          });
          const wedTimes = wednesdays.every((s: any) => s.startTime === '11:00' && s.endTime === '20:00');
          const satTimes = saturdays.every((s: any) => s.startTime === '11:00' && s.endTime === '20:00');
          return {
            pass: tuesdays.length === 0 && wedTimes && satTimes,
            message: `火曜${tuesdays.length}回、水曜${wednesdays.length}回(11-20時)、土曜${saturdays.length}回(11-20時)`,
          };
        },
      },
      {
        name: '関田あゆみ',
        check: (shifts: any[]) => {
          const weekends = shifts.filter((s: any) => {
            const date = new Date(s.date);
            const dow = date.getDay();
            return (dow === 0 || dow === 6) && s.status === 'working';
          });
          const weekdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            const dow = date.getDay();
            return dow >= 1 && dow <= 5 && s.status === 'working';
          });
          return {
            pass: weekends.length === 0 && weekdays.length >= 18,
            message: `土日勤務${weekends.length}回、平日勤務${weekdays.length}回`,
          };
        },
      },
      {
        name: '平井英子',
        check: (shifts: any[]) => {
          const wednesdays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 3 && s.status === 'working';
          });
          const fridays = shifts.filter((s: any) => {
            const date = new Date(s.date);
            return date.getDay() === 5 && s.status === 'working';
          });
          const wedTimes = wednesdays.every((s: any) => s.startTime === '10:00' && s.endTime === '16:00');
          const friTimes = fridays.every((s: any) => s.startTime === '10:00' && s.endTime === '16:00');
          return {
            pass: wedTimes && friTimes,
            message: `水曜${wednesdays.length}回(10-16時)、金曜${fridays.length}回(10-16時)`,
          };
        },
      },
      {
        name: '伊藤美穂',
        check: (shifts: any[]) => {
          const workDays = shifts.filter((s: any) => s.status === 'working');
          const correctDays = workDays.filter((s: any) => {
            const date = new Date(s.date);
            const dow = date.getDay();
            return (dow === 2 || dow === 4 || dow === 6) &&
                   s.startTime === '11:30' && s.endTime === '17:00';
          });
          return {
            pass: workDays.length === correctDays.length && workDays.length >= 12,
            message: `火木土のみ勤務${workDays.length}回、正しい時間${correctDays.length}回`,
          };
        },
      },
    ];

    for (const verify of verifications) {
      const employee = employees.find(e => e.name === verify.name);
      if (!employee) {
        console.log(`⚠️  ${verify.name}: 従業員が見つかりません`);
        continue;
      }

      const employeeShifts = result.allShifts.filter(s => s.employeeId === employee.id);
      const checkResult = verify.check(employeeShifts);

      const icon = checkResult.pass ? '✅' : '❌';
      console.log(`${icon} ${verify.name}: ${checkResult.message}`);
    }

    console.log('\n' + '='.repeat(80));

    // 詳細な日別サマリー
    console.log('\n');
    console.log('='.repeat(80));
    console.log('日別配置サマリー（最初の7日間）');
    console.log('='.repeat(80));

    for (let day = 1; day <= 7; day++) {
      const date = `2025-12-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(date);
      const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

      const dayShifts = result.allShifts.filter(s => s.date === date);
      const working = dayShifts.filter(s => s.status === 'working').length;
      const off = dayShifts.filter(s => s.status !== 'working').length;

      console.log(`\n${date}(${dayName}): 勤務${working}名、休み${off}名`);

      // 固定シフトの表示
      const fixedShifts = dayShifts.filter(s =>
        s.status === 'working' && s.timeSlotId === null && s.generatedBy === 'rule_based'
      );

      if (fixedShifts.length > 0) {
        console.log('  固定シフト:');
        for (const shift of fixedShifts.slice(0, 5)) {
          const emp = employees.find(e => e.id === shift.employeeId);
          console.log(`    - ${emp?.name}: ${shift.startTime}-${shift.endTime}`);
        }
        if (fixedShifts.length > 5) {
          console.log(`    ... 他${fixedShifts.length - 5}名`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('テスト完了');
    console.log('='.repeat(80));

    // データベースには保存しない（テストのため）
    console.log('\n⚠️  注意: このテストではデータベースに保存していません。');
    console.log('実際にシフトを保存するには、別途保存スクリプトを実行してください。\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラー:', error);
    if (error instanceof Error) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

testDecemberGeneration();
