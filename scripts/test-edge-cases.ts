/**
 * エッジケーステスト
 *
 * 異常系・境界値のテスト
 */

import { structureEmployeeData } from '../server/employeeDataStructurer';

async function testEdgeCases() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 エッジケーステスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト1: 空の入力
  console.log('【テスト1】空の入力');
  console.log('─────────────────────────────────────────\n');

  const emptyInput = '';
  console.log(`📝 入力内容: "${emptyInput}"\n`);

  const result1 = await structureEmployeeData(17, emptyInput); // 髙野幹成（管理者）

  if (result1.success) {
    console.log('✅ 構造化成功');
    console.log(`   制約数: ${result1.data?.workConstraints?.length ?? 0}件`);
    console.log(`   個人情報: ${result1.data?.personalInfo ? 'あり' : 'なし'}`);
  } else {
    console.log('❌ 構造化失敗:', result1.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト2: 制約なし（一般的な文章）
  console.log('【テスト2】制約なし職員');
  console.log('─────────────────────────────────────────\n');

  const noConstraints = '特に制約はありません。';
  console.log(`📝 入力内容: "${noConstraints}"\n`);

  const result2 = await structureEmployeeData(18, noConstraints); // 宝本龍騎

  if (result2.success) {
    console.log('✅ 構造化成功');
    console.log(`   制約数: ${result2.data?.workConstraints?.length ?? 0}件`);
    if (result2.data?.workConstraints && result2.data.workConstraints.length > 0) {
      console.log('   ⚠️ 制約なしなのに制約が抽出された（誤検出）');
    }
  } else {
    console.log('❌ 構造化失敗:', result2.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト3: 複雑な制約（5個以上）
  console.log('【テスト3】複雑な制約（多数）');
  console.log('─────────────────────────────────────────\n');

  const complexInput = `
誕生日: 1990年5月10日
月曜日と金曜日は必ず休み。
火曜日は9:00-14:00のみ勤務可能。
水曜日は夜勤のみ可能。
土日祝日は15:00-20:00のみ勤務。
連続勤務は最大3日まで。
週の勤務時間は35時間以内。
子供3人（2歳、5歳、7歳）。
保育園送迎あり。
  `.trim();

  console.log('📝 入力内容:');
  console.log(complexInput);
  console.log('');

  const result3 = await structureEmployeeData(19, complexInput); // 長山真梨奈

  if (result3.success) {
    console.log('✅ 構造化成功');
    console.log(`   制約数: ${result3.data?.workConstraints?.length ?? 0}件`);
    console.log('   制約一覧:');
    result3.data?.workConstraints?.forEach((c, idx) => {
      console.log(`     ${idx + 1}. ${c.type}: ${c.description}`);
    });
  } else {
    console.log('❌ 構造化失敗:', result3.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト4: 矛盾する入力
  console.log('【テスト4】矛盾する入力');
  console.log('─────────────────────────────────────────\n');

  const contradictInput = `
毎日休みたいです。
でも週5日勤務希望です。
夜勤はできないけど、夜勤が好きです。
  `.trim();

  console.log('📝 入力内容:');
  console.log(contradictInput);
  console.log('');

  const result4 = await structureEmployeeData(20, contradictInput); // 野仲彩香

  if (result4.success) {
    console.log('✅ 構造化成功（AIが矛盾を解消）');
    console.log(`   制約数: ${result4.data?.workConstraints?.length ?? 0}件`);
    if (result4.data?.workConstraints && result4.data.workConstraints.length > 0) {
      console.log('   抽出された制約:');
      result4.data.workConstraints.forEach(c => {
        console.log(`     - ${c.description}`);
      });
    }
  } else {
    console.log('✅ 構造化失敗（期待通り）:', result4.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト5: 不正な日付形式
  console.log('【テスト5】不正な日付形式');
  console.log('─────────────────────────────────────────\n');

  const invalidDateInput = `
誕生日: 昭和55年3月15日
  `.trim();

  console.log('📝 入力内容:');
  console.log(invalidDateInput);
  console.log('');

  const result5 = await structureEmployeeData(21, invalidDateInput); // 平井英子

  if (result5.success) {
    console.log('✅ 構造化成功');
    const birthday = result5.data?.personalInfo?.birthday;
    if (birthday) {
      console.log(`   誕生日: ${birthday}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        console.log('   ⚠️ 日付形式が不正');
      } else {
        console.log('   ✅ AIが西暦に変換');
      }
    } else {
      console.log('   誕生日: 未設定（変換失敗）');
    }
  } else {
    console.log('❌ 構造化失敗:', result5.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ エッジケーステスト完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 テスト結果サマリー:');
  console.log(`   テスト1 (空入力): ${result1.success ? '成功' : '失敗'}`);
  console.log(`   テスト2 (制約なし): ${result2.success ? '成功' : '失敗'}`);
  console.log(`   テスト3 (複雑な制約): ${result3.success ? '成功' : '失敗'}`);
  console.log(`   テスト4 (矛盾する入力): ${result4.success ? '成功' : '失敗'}`);
  console.log(`   テスト5 (不正な日付): ${result5.success ? '成功' : '失敗'}`);
  console.log('');
}

testEdgeCases().catch(console.error);
