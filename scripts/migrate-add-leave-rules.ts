/**
 * マイグレーション: workplaceRules.ruleTypeに誕生日休暇・季節休暇を追加
 */

import mysql from 'mysql2/promise';

async function migrateAddLeaveRules() {
  const conn = await mysql.createConnection(
    process.env.DATABASE_URL!.replace(/[?&]ssl-mode=[^&]*/g, '')
  );

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 マイグレーション: 休暇ルール追加');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. ruleType ENUMに新しい値を追加
    console.log('1️⃣ ruleType ENUMに birthday_leave, seasonal_leave を追加...');
    await conn.query(`
      ALTER TABLE workplaceRules
      MODIFY COLUMN ruleType enum(
        'min_rest_days',
        'night_shift_quota',
        'post_night_shift_rest',
        'required_staff_pattern',
        'max_consecutive_days',
        'fulltime_required_hours',
        'birthday_leave',
        'seasonal_leave'
      )
    `);
    console.log('   ✅ ENUM更新完了\n');

    // 2. 誕生日休暇ルール挿入
    console.log('2️⃣ 誕生日休暇ルール挿入 (正社員対象)...');
    const birthdayLeaveValue = {
      daysPerYear: 1,
      validityPeriod: '誕生月のみ',
      eligibleEmploymentTypes: ['fulltime']
    };

    await conn.query(`
      INSERT INTO workplaceRules (ruleType, employmentType, isActive, ruleValue, description)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'birthday_leave',
      'fulltime',
      1,
      JSON.stringify(birthdayLeaveValue),
      '誕生日休暇（正社員のみ）: 誕生月に1日取得可能'
    ]);
    console.log('   ✅ 誕生日休暇ルール挿入完了\n');

    // 3. 季節休暇ルール挿入
    console.log('3️⃣ 季節休暇ルール挿入 (全職員対象)...');
    const seasonalLeaveValue = {
      summer: {
        days: 3,
        period: '6-9月'
      },
      winter: {
        days: 5,
        period: '12-1月'
      }
    };

    await conn.query(`
      INSERT INTO workplaceRules (ruleType, employmentType, isActive, ruleValue, description)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'seasonal_leave',
      'all',
      1,
      JSON.stringify(seasonalLeaveValue),
      '季節休暇（全職員）: 夏季3日・冬季5日'
    ]);
    console.log('   ✅ 季節休暇ルール挿入完了\n');

    // 4. 確認
    console.log('4️⃣ 挿入結果確認...');
    const [rules] = await conn.query(`
      SELECT * FROM workplaceRules
      WHERE ruleType IN ('birthday_leave', 'seasonal_leave')
    `) as any;

    rules.forEach((r: any) => {
      console.log(`   ✅ ${r.ruleType} (${r.employmentType})`);
      console.log(`      ${r.description}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ マイグレーション完了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

migrateAddLeaveRules().catch(console.error);
