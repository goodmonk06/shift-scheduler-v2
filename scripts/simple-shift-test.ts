/**
 * workableDays制約の動作を確認する簡単なテスト
 */
import mysql from 'mysql2/promise';
import * as db from '../server/db';
import {
  getEmployeeAvailability,
  type Employee as EmployeeAvail,
} from '../server/utils/employeeAvailability';

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

async function simpleTest() {
  const conn = await mysql.createConnection(config);

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        🧪 workableDays制約の動作確認（簡易テスト）          ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const shiftId = 30;
    const employees = await db.getAllEmployees();

    // EmployeeAvail形式に変換
    const employeesAvail: EmployeeAvail[] = employees.map(e => ({
      id: e.id,
      name: e.name,
      workableDays: e.workableDays || [],
      canWorkNightShift: e.canWorkNightShift || false,
      skillLevel: e.skillLevel || 100,
    }));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テスト対象職員\n');

    const testCases = [
      {
        name: '足立 洋子',
        testDates: [
          { date: '2025-12-01', day: '月', expected: true },
          { date: '2025-12-02', day: '火', expected: false },
          { date: '2025-12-04', day: '木', expected: true },
          { date: '2025-12-05', day: '金', expected: false },
          { date: '2025-12-06', day: '土', expected: false },
          { date: '2025-12-07', day: '日', expected: false },
        ]
      },
      {
        name: '海野 はるか',
        testDates: [
          { date: '2025-12-01', day: '月', expected: true },
          { date: '2025-12-02', day: '火', expected: true },
          { date: '2025-12-05', day: '金', expected: true },
          { date: '2025-12-06', day: '土', expected: false },
          { date: '2025-12-07', day: '日', expected: false },
        ]
      },
      {
        name: '楠 美佐',
        testDates: [
          { date: '2025-12-01', day: '月', expected: true },
          { date: '2025-12-02', day: '火', expected: false },
          { date: '2025-12-03', day: '水', expected: true },
          { date: '2025-12-06', day: '土', expected: false },
          { date: '2025-12-07', day: '日', expected: false },
        ]
      }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of testCases) {
      const emp = employees.find(e => e.name.includes(testCase.name.split(' ')[0]));
      if (!emp) {
        console.log(`⚠️  ${testCase.name} が見つかりません\n`);
        continue;
      }

      console.log(`【${emp.name}】`);

      // workableDays設定を表示
      if (emp.workableDays && Array.isArray(emp.workableDays)) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const allowedDays = emp.workableDays.map((wd: any) => dayNames[wd.dayOfWeek]);
        console.log(`  勤務可能曜日: ${allowedDays.join('、')}`);
      }
      console.log('');

      for (const { date, day, expected } of testCase.testDates) {
        totalTests++;

        const availability = getEmployeeAvailability(
          emp.id,
          date,
          employeesAvail,
          [],  // leaveRequests
          []   // workPreferences
        );

        const actual = availability !== null;
        const result = actual === expected ? '✅' : '❌';

        if (actual === expected) {
          passedTests++;
        } else {
          failedTests++;
        }

        console.log(`    ${date} (${day}曜): ${result} 期待=${expected ? '可' : '不可'}, 実際=${actual ? '可' : '不可'}`);
      }
      console.log('');
    }

    // 実際にシフトを作成してデータベースに保存
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 テストシフトの作成\n');

    // 既存のシフト詳細を削除
    await conn.execute('DELETE FROM shiftDetails WHERE shiftId = ?', [shiftId]);

    const shiftsToCreate = [];

    for (const testCase of testCases) {
      const emp = employees.find(e => e.name.includes(testCase.name.split(' ')[0]));
      if (!emp) continue;

      for (const { date, expected } of testCase.testDates) {
        const availability = getEmployeeAvailability(
          emp.id,
          date,
          employeesAvail,
          [],
          []
        );

        if (availability && expected) {
          // 勤務可能な場合のみシフトを作成
          const slots = availability as boolean[];
          const startSlot = slots.indexOf(true);
          const endSlot = slots.lastIndexOf(true) + 1;

          if (startSlot >= 0 && endSlot > startSlot) {
            const startTime = `${String(Math.floor(startSlot / 2)).padStart(2, '0')}:${startSlot % 2 === 0 ? '00' : '30'}`;
            const endTime = `${String(Math.floor(endSlot / 2)).padStart(2, '0')}:${endSlot % 2 === 0 ? '00' : '30'}`;

            shiftsToCreate.push({
              shiftId,
              employeeId: emp.id,
              employeeName: emp.name,
              date,
              startTime,
              endTime
            });
          }
        }
      }
    }

    console.log(`  作成するシフト数: ${shiftsToCreate.length}件\n`);

    for (const shift of shiftsToCreate) {
      await conn.execute(
        `INSERT INTO shiftDetails (shiftId, employeeId, date, status, timeSlotId, startTime, endTime, generatedBy)
         VALUES (?, ?, ?, 'working', NULL, ?, ?, 'rule_based')`,
        [shift.shiftId, shift.employeeId, shift.date, shift.startTime, shift.endTime]
      );
      console.log(`  ✅ ${shift.employeeName}: ${shift.date} ${shift.startTime}-${shift.endTime}`);
    }

    console.log('');

    // 検証
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 データベース検証\n');

    for (const testCase of testCases) {
      const emp = employees.find(e => e.name.includes(testCase.name.split(' ')[0]));
      if (!emp) continue;

      const [empShifts] = await conn.execute(
        `SELECT date FROM shiftDetails WHERE shiftId = ? AND employeeId = ? ORDER BY date`,
        [shiftId, emp.id]
      ) as any;

      console.log(`  ${emp.name}:`);

      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const workDays = empShifts.map((s: any) => {
        const d = new Date(s.date);
        return dayNames[d.getDay()];
      });
      const uniqueDays = [...new Set(workDays)];

      console.log(`    配置: ${empShifts.length}日（${uniqueDays.join('、')}曜）`);

      // 違反チェック
      if (emp.workableDays && Array.isArray(emp.workableDays)) {
        const violations = empShifts.filter((s: any) => {
          const d = new Date(s.date);
          const dow = d.getDay();
          return !emp.workableDays.some((wd: any) => wd.dayOfWeek === dow);
        });

        if (violations.length > 0) {
          console.log(`    ❌ 違反: ${violations.length}件が勤務不可曜日`);
        } else {
          console.log(`    ✅ 制約遵守: すべて勤務可能曜日`);
        }
      }
    }

    console.log('');

    // 最終結果
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 テスト結果\n');

    console.log(`  総テスト数: ${totalTests}件`);
    console.log(`  成功: ${passedTests}件 ✅`);
    console.log(`  失敗: ${failedTests}件 ${failedTests > 0 ? '❌' : ''}\n`);

    if (failedTests === 0) {
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                                                               ║');
      console.log('║     🎉 workableDays制約: 完全に正常動作 🎉                  ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('❌ 一部のテストが失敗しました\n');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

simpleTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
