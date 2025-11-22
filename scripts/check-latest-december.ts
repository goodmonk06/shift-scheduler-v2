import * as db from '../server/db';

async function checkLatestDecember() {
  try {
    const shifts = await db.getAllShifts();
    const decemberShifts = shifts.filter(s => s.year === 2025 && s.month === 12).sort((a,b) => b.id - a.id);

    console.log('最新の12月シフト（降順）:\n');
    for (const shift of decemberShifts.slice(0, 5)) {
      const details = await db.getShiftById(shift.id);
      const detailCount = details?.shiftDetails?.length || 0;
      console.log(`  ID: ${shift.id}, 名前: ${shift.name}`);
      console.log(`  詳細: ${detailCount}件`);
      console.log(`  作成: ${new Date(shift.createdAt).toLocaleString('ja-JP')}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkLatestDecember();
