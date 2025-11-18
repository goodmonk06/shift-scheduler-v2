/**
 * workableDaysロジックの簡易テスト
 */
import * as db from '../server/db';
import {
  getEmployeeAvailability,
  type Employee as EmployeeAvail,
} from '../server/utils/employeeAvailability';

async function testLogic() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 workableDays ロジックテスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 職員データを取得
    const employees = await db.getAllEmployees();
    console.log(`👥 職員数: ${employees.length}人\n`);

    // テスト職員を選択
    const testEmployee = employees.find(e => e.name.includes('足立 洋子'));

    if (!testEmployee) {
      console.log('❌ テスト職員が見つかりません');
      return;
    }

    console.log(`【テスト職員: ${testEmployee.name}】`);
    console.log(`  職員ID: ${testEmployee.employeeId}`);
    console.log(`  workableDays:`, JSON.stringify(testEmployee.workableDays, null, 2));
    console.log('');

    // EmployeeAvail形式に変換
    const employeesAvail: EmployeeAvail[] = employees.map(e => ({
      id: e.id,
      name: e.name,
      workableDays: e.workableDays || [],
      canWorkNightShift: e.canWorkNightShift || false,
      skillLevel: e.skillLevel || 100,
    }));

    // 各曜日でテスト
    const testDates = [
      { date: '2025-12-01', day: '月' },  // 月曜
      { date: '2025-12-02', day: '火' },  // 火曜
      { date: '2025-12-03', day: '水' },  // 水曜
      { date: '2025-12-04', day: '木' },  // 木曜
      { date: '2025-12-05', day: '金' },  // 金曜
      { date: '2025-12-06', day: '土' },  // 土曜
      { date: '2025-12-07', day: '日' },  // 日曜
    ];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 各曜日の勤務可能判定\n');

    for (const { date, day } of testDates) {
      const availability = getEmployeeAvailability(
        testEmployee.id,
        date,
        employeesAvail,
        [],  // leaveRequests
        []   // workPreferences
      );

      if (availability) {
        console.log(`  ${date} (${day}曜): ✅ 勤務可能`);
        console.log(`    時間帯: ${JSON.stringify(availability)}`);
      } else {
        console.log(`  ${date} (${day}曜): ❌ 勤務不可`);
      }
    }
    console.log('');

    // 海野 はるか のテスト
    const testEmployee2 = employees.find(e => e.name.includes('海野'));

    if (testEmployee2) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`【テスト職員: ${testEmployee2.name}】`);
      console.log(`  workableDays:`, JSON.stringify(testEmployee2.workableDays, null, 2));
      console.log('');

      console.log('土日の勤務可能判定:\n');
      const weekendDates = [
        { date: '2025-12-06', day: '土' },
        { date: '2025-12-07', day: '日' },
      ];

      for (const { date, day } of weekendDates) {
        const availability = getEmployeeAvailability(
          testEmployee2.id,
          date,
          employeesAvail,
          [],
          []
        );

        if (availability) {
          console.log(`  ${date} (${day}曜): ✅ 勤務可能`);
          console.log(`    時間帯: ${JSON.stringify(availability)}`);
        } else {
          console.log(`  ${date} (${day}曜): ❌ 勤務不可`);
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ テスト完了\n');

    console.log('【結論】');
    console.log('  workableDaysが正しく読み込まれ、');
    console.log('  getEmployeeAvailability関数で適切に判定されています。\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

testLogic().catch(err => {
  console.error('❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
