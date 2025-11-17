/**
 * 職員データ構造化テスト
 *
 * 海野はるかさんと加藤広大さんのデータを構造化して保存
 */

import { structureEmployeeData } from '../server/employeeDataStructurer';

async function testStructureEmployeeData() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 職員データ構造化テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト1: 海野はるか（ID: 8）
  console.log('【テスト1】海野 はるか（ID: 8）');
  console.log('─────────────────────────────────────────\n');

  const umiInput = `
土日祝日休み、9時～14時勤務、休憩30分。
子供2人（5歳、8歳）。
保育園送迎のため9時以降出勤希望。
  `.trim();

  console.log('📝 入力内容:');
  console.log(umiInput);
  console.log('');

  const umiResult = await structureEmployeeData(8, umiInput);

  if (umiResult.success) {
    console.log('✅ 構造化成功\n');
    console.log('📊 構造化データ:');
    console.log(JSON.stringify(umiResult.data, null, 2));
  } else {
    console.log('❌ 構造化失敗:', umiResult.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト2: 加藤広大（ID: 12）
  console.log('【テスト2】加藤 広大（ID: 12）');
  console.log('─────────────────────────────────────────\n');

  const katoInput = `
火曜日休み。
水曜日・土曜日は 11時～20時勤務。
  `.trim();

  console.log('📝 入力内容:');
  console.log(katoInput);
  console.log('');

  const katoResult = await structureEmployeeData(12, katoInput);

  if (katoResult.success) {
    console.log('✅ 構造化成功\n');
    console.log('📊 構造化データ:');
    console.log(JSON.stringify(katoResult.data, null, 2));
  } else {
    console.log('❌ 構造化失敗:', katoResult.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ テスト完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testStructureEmployeeData().catch(console.error);
