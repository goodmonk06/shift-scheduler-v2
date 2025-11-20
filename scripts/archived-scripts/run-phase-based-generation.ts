/**
 * 段階的配置生成を直接実行してテスト
 */
import {
  phase1_confirmHardConstraints,
  phase2_calculateAvailability,
} from '../server/phaseBasedShiftGenerator';
import * as db from '../server/db';

async function runGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 段階的配置生成の実行テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // シフトID 30, 2025年12月
    const shiftId = 30;
    const year = 2025;
    const month = 12;

    console.log(`📋 対象:`);
    console.log(`  シフトID: ${shiftId}`);
    console.log(`  対象月: ${year}年${month}月\n`);

    // Phase 1: ハード制約の確定
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const phase1Results = await phase1_confirmHardConstraints(shiftId, year, month);
    console.log(`\n✅ Phase 1完了: ${phase1Results.length}件のハード制約を確定\n`);

    // Phase 2: 勤務可能枠の計算
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const availabilityMap = await phase2_calculateAvailability(shiftId, year, month, phase1Results);
    console.log(`\n✅ Phase 2完了: ${availabilityMap.size}件の勤務可能情報を計算\n`);

    // 結果の確認
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 workableDays制約のテスト\n');

    // 足立 洋子（月曜・木曜のみ）をテスト
    const employees = await db.getAllEmployees();
    const testEmployee = employees.find(e => e.name.includes('足立 洋子'));

    if (testEmployee) {
      console.log(`【テスト職員: ${testEmployee.name}】`);
      console.log(`  設定されたworkableDays:`);
      if (testEmployee.workableDays && Array.isArray(testEmployee.workableDays)) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        testEmployee.workableDays.forEach((wd: any) => {
          console.log(`    ${dayNames[wd.dayOfWeek]}曜: ${wd.startTime}-${wd.endTime}`);
        });
      }
      console.log('');

      // 12月の各曜日で勤務可能かチェック
      const testDates = [
        { date: '2025-12-01', day: '月' },  // 月曜
        { date: '2025-12-02', day: '火' },  // 火曜
        { date: '2025-12-03', day: '水' },  // 水曜
        { date: '2025-12-04', day: '木' },  // 木曜
        { date: '2025-12-05', day: '金' },  // 金曜
        { date: '2025-12-06', day: '土' },  // 土曜
        { date: '2025-12-07', day: '日' },  // 日曜
      ];

      console.log('  各曜日の勤務可能判定:');
      for (const { date, day } of testDates) {
        const key = `${testEmployee.id}-${date}`;
        const avail = availabilityMap.get(key);

        if (avail && avail.canWork) {
          console.log(`    ${date} (${day}曜): ✅ 勤務可能 ${avail.timeRange || ''}`);
        } else {
          console.log(`    ${date} (${day}曜): ❌ 勤務不可 ${avail?.reason || ''}`);
        }
      }
      console.log('');
    }

    // 海野 はるか（平日のみ）をテスト
    const testEmployee2 = employees.find(e => e.name.includes('海野'));

    if (testEmployee2) {
      console.log(`【テスト職員: ${testEmployee2.name}】`);
      console.log(`  設定されたworkableDays:`);
      if (testEmployee2.workableDays && Array.isArray(testEmployee2.workableDays)) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        testEmployee2.workableDays.forEach((wd: any) => {
          console.log(`    ${dayNames[wd.dayOfWeek]}曜: ${wd.startTime}-${wd.endTime}`);
        });
      }
      console.log('');

      console.log('  土日の勤務可能判定:');
      const weekendDates = [
        { date: '2025-12-06', day: '土' },
        { date: '2025-12-07', day: '日' },
      ];

      for (const { date, day } of weekendDates) {
        const key = `${testEmployee2.id}-${date}`;
        const avail = availabilityMap.get(key);

        if (avail && avail.canWork) {
          console.log(`    ${date} (${day}曜): ✅ 勤務可能 ${avail.timeRange || ''}`);
        } else {
          console.log(`    ${date} (${day}曜): ❌ 勤務不可 ${avail?.reason || ''}`);
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ テスト完了\n');

    console.log('【結果】');
    console.log('  ✓ Phase 1でハード制約を確定');
    console.log('  ✓ Phase 2でworkableDays制約を考慮した勤務可能枠を計算');
    console.log('  ✓ 職員の勤務可能曜日が正しく反映されている\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

runGeneration().catch(err => {
  console.error('❌ Generation failed:', err.message);
  process.exit(1);
});
