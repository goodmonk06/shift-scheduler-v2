import * as db from '../server/db';

async function updateStatus() {
  await db.updateShift(30, {
    status: 'draft',
    generatedBy: 'rule_based'
  });
  console.log('✅ シフトステータスを更新しました');
  process.exit(0);
}

updateStatus();
