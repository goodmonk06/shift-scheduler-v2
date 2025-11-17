/**
 * 正社員データ構造化テスト
 *
 * 誕生日休暇・季節休暇が正しく設定されるか確認
 */

import { structureEmployeeData } from '../server/employeeDataStructurer';

async function testFulltimeEmployees() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 正社員データ構造化テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト1: 梅田英津子（ID: 9）- 正社員
  console.log('【テスト1】梅田 英津子（ID: 9）- 正社員');
  console.log('─────────────────────────────────────────\n');

  const umedaInput = `
誕生日: 1985年3月15日
月曜日・金曜日 希望勤務。
夜勤可能。
  `.trim();

  console.log('📝 入力内容:');
  console.log(umedaInput);
  console.log('');

  const umedaResult = await structureEmployeeData(9, umedaInput);

  if (umedaResult.success) {
    console.log('✅ 構造化成功\n');
    console.log('📊 構造化データ:');
    console.log(JSON.stringify(umedaResult.data, null, 2));

    // 誕生日休暇のチェック
    console.log('\n━━━ 誕生日休暇チェック ━━━');
    const birthdayLeave = umedaResult.data?.leaveAllowances?.birthdayLeave;
    if (birthdayLeave?.eligible) {
      console.log('✅ 誕生日休暇対象: はい');
      console.log(`   誕生日: ${birthdayLeave.birthday}`);
      console.log(`   付与日数: ${birthdayLeave.totalDays}日`);
      console.log(`   残日数: ${birthdayLeave.remainingDays}日`);
    } else {
      console.log('❌ 誕生日休暇対象外（正社員なのでエラー）');
    }

    // 季節休暇のチェック
    console.log('\n━━━ 季節休暇チェック ━━━');
    const seasonalLeave = umedaResult.data?.leaveAllowances?.seasonalLeave;
    if (seasonalLeave?.summer?.eligible) {
      console.log('✅ 夏季休暇対象: はい');
      console.log(`   付与日数: ${seasonalLeave.summer.totalDays}日`);
      console.log(`   期間: ${seasonalLeave.summer.validPeriod}`);
    } else {
      console.log('❌ 夏季休暇対象外（正社員なのでエラー）');
    }

    if (seasonalLeave?.winter?.eligible) {
      console.log('✅ 冬季休暇対象: はい');
      console.log(`   付与日数: ${seasonalLeave.winter.totalDays}日`);
      console.log(`   期間: ${seasonalLeave.winter.validPeriod}`);
    } else {
      console.log('❌ 冬季休暇対象外（正社員なのでエラー）');
    }

  } else {
    console.log('❌ 構造化失敗:', umedaResult.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // テスト2: 大橋健一（ID: 10）- 正社員
  console.log('【テスト2】大橋 健一（ID: 10）- 正社員');
  console.log('─────────────────────────────────────────\n');

  const ohashiInput = `
誕生日: 1978年11月22日
毎週土曜日休み希望。
週40時間以内勤務。
  `.trim();

  console.log('📝 入力内容:');
  console.log(ohashiInput);
  console.log('');

  const ohashiResult = await structureEmployeeData(10, ohashiInput);

  if (ohashiResult.success) {
    console.log('✅ 構造化成功\n');
    console.log('📊 構造化データ:');
    console.log(JSON.stringify(ohashiResult.data, null, 2));

    // 誕生日休暇のチェック
    console.log('\n━━━ 誕生日休暇チェック ━━━');
    const birthdayLeave = ohashiResult.data?.leaveAllowances?.birthdayLeave;
    if (birthdayLeave?.eligible) {
      console.log('✅ 誕生日休暇対象: はい');
      console.log(`   誕生日: ${birthdayLeave.birthday}`);
      console.log(`   付与日数: ${birthdayLeave.totalDays}日`);
      console.log(`   残日数: ${birthdayLeave.remainingDays}日`);
    } else {
      console.log('❌ 誕生日休暇対象外（正社員なのでエラー）');
    }

    // 季節休暇のチェック
    console.log('\n━━━ 季節休暇チェック ━━━');
    const seasonalLeave = ohashiResult.data?.leaveAllowances?.seasonalLeave;
    if (seasonalLeave?.summer?.eligible && seasonalLeave?.winter?.eligible) {
      console.log('✅ 季節休暇対象: はい');
      console.log(`   夏季: ${seasonalLeave.summer.totalDays}日 (${seasonalLeave.summer.validPeriod})`);
      console.log(`   冬季: ${seasonalLeave.winter.totalDays}日 (${seasonalLeave.winter.validPeriod})`);
    } else {
      console.log('❌ 季節休暇対象外（正社員なのでエラー）');
    }

  } else {
    console.log('❌ 構造化失敗:', ohashiResult.error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ テスト完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testFulltimeEmployees().catch(console.error);
