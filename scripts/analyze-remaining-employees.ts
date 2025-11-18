/**
 * workableDays未設定の職員を分析
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

async function analyze() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 workableDays未設定職員の分析');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // workableDays未設定の職員を取得
    const [employees] = await conn.execute(`
      SELECT id, employeeId, name, workableDays, additionalConstraints
      FROM employees
      ORDER BY id
    `) as any;

    const noWorkableDays = employees.filter((emp: any) => {
      if (!emp.workableDays) return true;
      const wd = Array.isArray(emp.workableDays) ? emp.workableDays :
                 (typeof emp.workableDays === 'string' ? JSON.parse(emp.workableDays) : emp.workableDays);
      return !Array.isArray(wd) || wd.length === 0;
    });

    console.log(`📊 workableDays未設定職員: ${noWorkableDays.length}人\n`);

    if (noWorkableDays.length === 0) {
      console.log('✅ 全職員にworkableDaysが設定されています');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 未設定職員の詳細\n');

    for (const emp of noWorkableDays) {
      console.log(`【職員${emp.id}: ${emp.name}】`);
      console.log(`  職員ID: ${emp.employeeId}`);

      // additionalConstraintsを確認
      if (emp.additionalConstraints) {
        try {
          const constraints = typeof emp.additionalConstraints === 'string'
            ? JSON.parse(emp.additionalConstraints)
            : emp.additionalConstraints;

          if (constraints.workPatterns) {
            console.log(`  📅 workPatterns: ${JSON.stringify(constraints.workPatterns)}`);
          }
          if (constraints.monthlyWorkDays !== undefined) {
            console.log(`  📅 月間勤務日数: ${constraints.monthlyWorkDays}日`);
          }
          if (constraints.weeklyWorkDays !== undefined) {
            console.log(`  📅 週間勤務日数: ${constraints.weeklyWorkDays}日`);
          }
          if (constraints.monthlyWorkHours !== undefined) {
            console.log(`  ⏰ 月間労働時間: ${constraints.monthlyWorkHours}時間`);
          }
          if (constraints.notes) {
            console.log(`  📝 備考: ${constraints.notes}`);
          }

          // その他の制約
          const otherKeys = Object.keys(constraints).filter(k =>
            !['workPatterns', 'monthlyWorkDays', 'weeklyWorkDays', 'monthlyWorkHours', 'notes'].includes(k)
          );
          if (otherKeys.length > 0) {
            console.log(`  🔧 その他の制約: ${otherKeys.join(', ')}`);
          }
        } catch (e) {
          console.log(`  ⚠️  パース失敗`);
        }
      } else {
        console.log(`  📝 additionalConstraints: (なし)`);
      }
      console.log('');
    }

    // 統計
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 分析結果\n');

    const withWorkPatterns = noWorkableDays.filter((emp: any) => {
      if (!emp.additionalConstraints) return false;
      try {
        const c = typeof emp.additionalConstraints === 'string'
          ? JSON.parse(emp.additionalConstraints)
          : emp.additionalConstraints;
        return c.workPatterns || c.monthlyWorkDays || c.weeklyWorkDays;
      } catch {
        return false;
      }
    }).length;

    const noConstraints = noWorkableDays.filter((emp: any) => !emp.additionalConstraints).length;

    console.log(`  workPatterns等あり: ${withWorkPatterns}人`);
    console.log(`  制約なし: ${noConstraints}人\n`);

    console.log('【推奨される対応】');
    console.log('  1. workPatterns等の職員 → 全曜日勤務可能として設定');
    console.log('     （日数制限は別ロジックで管理）');
    console.log('  2. 制約なしの職員 → 全曜日勤務可能として設定\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 分析完了\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

analyze().catch(err => {
  console.error('❌ Analysis failed:', err.message);
  process.exit(1);
});
