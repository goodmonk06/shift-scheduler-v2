import * as db from '../server/db';

async function resetProductionShift() {
  console.log('================================================================================');
  console.log('本番環境 12月シフトリセット');
  console.log('================================================================================\n');

  // 12月シフトを取得
  const shift = await db.getShiftByYearMonth(2025, 12);
  if (!shift) {
    console.log('❌ 2025年12月のシフトが見つかりません');
    process.exit(1);
  }

  console.log(`✅ シフトID: ${shift.id} を確認しました\n`);

  // 現在のシフト詳細を取得
  const details = await db.getShiftDetailsByShiftId(shift.id);
  console.log(`📊 現在のシフト: ${details.length}件\n`);

  // generatedBy別集計
  const byGenerated = details.reduce((acc, d) => {
    const method = d.generatedBy || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('生成方法別:');
  for (const [method, count] of Object.entries(byGenerated)) {
    console.log(`  ${method}: ${count}件`);
  }
  console.log();

  // rule_basedのシフトを削除
  const ruleBasedShifts = details.filter(d => d.generatedBy === 'rule_based');
  console.log(`🗑️  rule_basedシフトを削除: ${ruleBasedShifts.length}件\n`);

  let deletedCount = 0;
  for (const detail of ruleBasedShifts) {
    await db.deleteShiftDetail(detail.id);
    deletedCount++;
    if (deletedCount % 50 === 0) {
      console.log(`  削除中... ${deletedCount}/${ruleBasedShifts.length}件`);
    }
  }

  console.log(`\n✅ 削除完了: ${deletedCount}件`);
  console.log(`📝 残りのシフト: ${details.length - deletedCount}件（希望休申請）\n`);

  console.log('================================================================================');
  console.log('✅ リセット完了');
  console.log('================================================================================\n');

  process.exit(0);
}

resetProductionShift();
