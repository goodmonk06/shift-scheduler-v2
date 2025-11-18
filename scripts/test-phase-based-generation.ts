/**
 * 段階的配置生成を実行してテスト
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL || '';
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)\?/);
if (!match) throw new Error('Invalid DATABASE_URL');

const config = {
  host: match[3],
  port: parseInt(match[4]),
  user: match[1],
  password: match[2],
  database: match[5],
  ssl: { rejectUnauthorized: false }
};

async function testGeneration() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 段階的配置生成テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 最新のシフトを取得
    const [shifts] = await conn.execute(
      'SELECT id, name, status FROM shifts ORDER BY id DESC LIMIT 1'
    ) as any;

    if (shifts.length === 0) {
      console.log('❌ シフトが見つかりません');
      return;
    }

    const shift = shifts[0];
    console.log(`📋 対象シフト:`);
    console.log(`  ID: ${shift.id}`);
    console.log(`  名前: ${shift.name}`);
    console.log(`  ステータス: ${shift.status}\n`);

    // 職員数を確認
    const [empCount] = await conn.execute(
      'SELECT COUNT(*) as count FROM employees'
    ) as any;
    console.log(`👥 職員数: ${empCount[0].count}人\n`);

    // workableDays設定済み職員数を確認
    const [wdCount] = await conn.execute(`
      SELECT COUNT(*) as count FROM employees
      WHERE workableDays IS NOT NULL
    `) as any;
    console.log(`✅ workableDays設定済み: ${wdCount[0].count}人\n`);

    // 既存のシフト詳細を確認
    const [existingDetails] = await conn.execute(
      'SELECT COUNT(*) as count FROM shiftDetails WHERE shiftId = ?',
      [shift.id]
    ) as any;
    console.log(`📊 既存のシフト詳細: ${existingDetails[0].count}件\n`);

    // 休暇申請を確認
    const [leaveRequests] = await conn.execute(
      'SELECT COUNT(*) as count FROM leaveRequests WHERE shiftId = ? AND status = ?',
      [shift.id, 'approved']
    ) as any;
    console.log(`🏖️  承認済み休暇申請: ${leaveRequests[0].count}件\n`);

    // 時間指定勤務希望を確認
    const [workPrefs] = await conn.execute(
      'SELECT COUNT(*) as count FROM workPreferences WHERE shiftId = ? AND status = ?',
      [shift.id, 'approved']
    ) as any;
    console.log(`⏰ 承認済み勤務希望: ${workPrefs[0].count}件\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 段階的配置アルゴリズムの動作確認\n');

    // サンプル職員の勤務可能日を確認
    const [sampleEmployees] = await conn.execute(`
      SELECT id, name, workableDays
      FROM employees
      WHERE workableDays IS NOT NULL
      LIMIT 3
    `) as any;

    console.log('【サンプル職員のworkableDays設定】\n');
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    for (const emp of sampleEmployees) {
      const workableDays = Array.isArray(emp.workableDays)
        ? emp.workableDays
        : JSON.parse(emp.workableDays);

      console.log(`${emp.name}:`);
      workableDays.forEach((wd: any) => {
        console.log(`  ${dayNames[wd.dayOfWeek]}曜: ${wd.startTime}-${wd.endTime}`);
      });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 準備完了\n');

    console.log('【次のステップ】');
    console.log('  1. UIから「段階的配置方式」を選択');
    console.log('  2. 「シフト生成」ボタンをクリック');
    console.log('  3. 生成結果を確認:\n');
    console.log('     - 職員のworkableDaysが反映されているか');
    console.log('     - 勤務不可曜日にシフトが配置されていないか');
    console.log('     - カスタム時間が正しく設定されているか\n');

    console.log('【確認すべきポイント】');
    console.log('  ✓ 足立 洋子 → 月曜・木曜のみ勤務');
    console.log('  ✓ 海野 はるか → 土日勤務なし、平日のみ');
    console.log('  ✓ 楠 美佐 → 火曜・土日勤務なし\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 テストデータ確認完了\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

testGeneration().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
