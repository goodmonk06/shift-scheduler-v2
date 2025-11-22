import * as db from '../server/db';

async function listDecemberShifts() {
  try {
    console.log('🔍 2025年12月のシフト一覧\n');

    const allShifts = await db.getAllShifts();
    const decemberShifts = allShifts.filter(s => s.year === 2025 && s.month === 12);

    console.log(`見つかったシフト数: ${decemberShifts.length}\n`);

    if (decemberShifts.length === 0) {
      console.log('2025年12月のシフトは見つかりませんでした。');
      process.exit(0);
    }

    decemberShifts.forEach((shift, index) => {
      console.log(`シフト ${index + 1}:`);
      console.log(`  ID: ${shift.id}`);
      console.log(`  名前: ${shift.name}`);
      console.log(`  ステータス: ${shift.status}`);
      console.log(`  生成方法: ${shift.generatedBy || 'N/A'}`);
      console.log(`  作成日: ${shift.createdAt}`);
      console.log(`  更新日: ${shift.updatedAt}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

listDecemberShifts();
