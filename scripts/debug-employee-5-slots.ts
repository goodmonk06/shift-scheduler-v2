/**
 * 職員ID 5 の配置可能枠デバッグ
 */

import { calculateAllAvailableSlots } from '../server/availableSlotsCalculator';
import { getDb } from '../server/db';
import { employees, workTimeSlots } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function debugEmployee5() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 職員ID 5 の配置可能枠デバッグ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 職員情報取得
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, 5));

  console.log('━━━ 職員情報 ━━━');
  console.log(`ID: ${employee.id}`);
  console.log(`名前: ${employee.name}`);
  console.log(`夜勤可能: ${employee.canWorkNightShift}`);
  console.log(`スキルレベル: ${employee.skillLevel}`);
  console.log(`\n制約情報:`);
  console.log(JSON.stringify(employee.additionalConstraints, null, 2));
  console.log('');

  // 全時間枠取得
  const slots = await db.select().from(workTimeSlots);

  console.log('━━━ 全勤務時間枠 ━━━');
  slots.forEach(s => {
    console.log(`ID:${s.id} ${s.name} (${s.startTime}-${s.endTime}) 夜勤:${s.isNightShift}`);
  });
  console.log('');

  // 配置可能枠を計算
  const availableSlots = await calculateAllAvailableSlots('2025-11-01', '2025-11-07');

  console.log('━━━ 職員ID 5 の配置可能枠（日付別）━━━');
  for (const date in availableSlots[5]) {
    const slotIds = availableSlots[5][date];
    const slotNames = slotIds
      .map(id => {
        const slot = slots.find(s => s.id === id);
        return `${id}:${slot?.name}`;
      })
      .join(', ');

    console.log(`${date}: [${slotNames}]`);
  }

  console.log('\n━━━ 2025-11-07 詳細分析 ━━━');
  const nov7Slots = availableSlots[5]['2025-11-07'];
  console.log(`配置可能なID: [${nov7Slots.join(', ')}]`);
  console.log(`\nID 6 は含まれていますか？ ${nov7Slots.includes(6) ? 'はい' : 'いいえ'}`);

  if (!nov7Slots.includes(6)) {
    console.log('\n⚠️ ID 6 が配置不可な理由を調査中...');
    const slot6 = slots.find(s => s.id === 6);
    console.log(`ID 6: ${slot6?.name} (${slot6?.startTime}-${slot6?.endTime}) 夜勤:${slot6?.isNightShift}`);

    if (slot6?.isNightShift && !employee.canWorkNightShift) {
      console.log('→ 原因: 夜勤不可の職員に夜勤枠を配置しようとした');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

debugEmployee5().catch(console.error);
