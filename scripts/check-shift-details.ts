import * as db from '../server/db';

async function checkShiftDetails() {
  try {
    const shiftId = parseInt(process.argv[2]) || 47;

    console.log(`🔍 シフトID ${shiftId} の詳細を確認中...\n`);

    // Get shift info
    const shifts = await db.getAllShifts();
    const shift = shifts.find(s => s.id === shiftId);

    if (!shift) {
      console.log(`❌ シフトID ${shiftId} が見つかりません`);
      process.exit(1);
    }

    console.log('✅ シフト情報:');
    console.log(`  ID: ${shift.id}`);
    console.log(`  名前: ${shift.name}`);
    console.log(`  年月: ${shift.year}年${shift.month}月`);
    console.log(`  ステータス: ${shift.status}`);
    console.log('');

    // Get shift details count
    const allDetails = await db.getShiftById(shiftId);

    if (!allDetails || !allDetails.shiftDetails) {
      console.log('❌ シフト詳細が見つかりません');
      process.exit(1);
    }

    console.log(`✅ シフト詳細: ${allDetails.shiftDetails.length}件`);

    if (allDetails.shiftDetails.length === 0) {
      console.log('⚠️  警告: シフト詳細が空です！');
    } else {
      console.log('\nサンプル（最初の5件）:');
      allDetails.shiftDetails.slice(0, 5).forEach((detail, i) => {
        console.log(`  ${i + 1}. 従業員ID: ${detail.employeeId}, 日付: ${detail.date}, ステータス: ${detail.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkShiftDetails();
