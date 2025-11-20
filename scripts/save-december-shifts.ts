import * as db from '../server/db';
import { generateShiftWithPhases } from '../server/phaseBasedShiftGenerator';

async function saveDecemberShifts() {
  try {
    console.log('================================================================================');
    console.log('12月シフト保存');
    console.log('================================================================================\n');

    // 2025年12月のシフトを取得
    console.log('📅 2025年12月のシフトを確認中...\n');
    const existingShift = await db.getShiftByYearMonth(2025, 12);

    if (!existingShift) {
      console.log('⚠️  2025年12月のシフトが見つかりません。');
      console.log('先に以下のスクリプトを実行してください:');
      console.log('  pnpm tsx scripts/register-december-leaves.ts\n');
      process.exit(1);
    }

    const shiftId = existingShift.id;
    console.log(`✅ シフト (ID: ${shiftId}) を使用します\n`);

    // 既存の生成済みシフトを削除
    console.log('🗑️  既存の生成済みシフトを削除中...\n');
    await db.deleteShiftDetailsByShiftId(shiftId);
    console.log('✅ 削除完了\n');

    // 段階的生成を実行
    console.log('🚀 段階的シフト生成を開始します...\n');
    const result = await generateShiftWithPhases(shiftId, 2025, 12);

    console.log('\n================================================================================');
    console.log('生成結果サマリー');
    console.log('================================================================================');
    console.log(`Phase 1 (ハード制約): ${result.confirmedShifts.length}件`);
    console.log(`Phase 3 (ルールベース): ${result.ruleBasedShifts.length}件`);
    console.log(`合計: ${result.allShifts.length}件`);
    console.log('================================================================================\n');

    // 生成されたシフトをデータベースに保存
    console.log('💾 データベースに保存中...\n');

    let savedCount = 0;
    for (const shift of result.allShifts) {
      await db.createShiftDetail({
        shiftId: shiftId,
        employeeId: shift.employeeId,
        date: shift.date,
        status: shift.status as 'working' | 'off' | 'pending',
        timeSlotId: shift.timeSlotId || undefined,
        startTime: shift.startTime || undefined,
        endTime: shift.endTime || undefined,
        generatedBy: shift.generatedBy as 'ai' | 'rule_based' | 'manual',
      });
      savedCount++;

      if (savedCount % 50 === 0) {
        console.log(`  保存中... ${savedCount}/${result.allShifts.length}件`);
      }
    }

    console.log(`\n✅ ${savedCount}件のシフトを保存しました\n`);

    // シフトステータスを更新
    console.log('📝 シフトステータスを更新中...\n');
    await db.updateShift(shiftId, {
      status: 'draft',
      generatedBy: 'rule_based',
    });

    console.log('================================================================================');
    console.log('✅ 完了！');
    console.log('================================================================================');
    console.log(`シフトID: ${shiftId}`);
    console.log(`保存件数: ${savedCount}件`);
    console.log('\nブラウザで確認してください:');
    console.log('http://localhost:3000/shifts');
    console.log('================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    console.error('\nスタックトレース:', error);
    process.exit(1);
  }
}

saveDecemberShifts();
