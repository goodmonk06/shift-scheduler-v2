/**
 * 職員データの読み込み状況を確認するスクリプト
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

async function test() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 職員データの読み込み状況確認');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 職員データを取得
    const [employees] = await conn.execute(`
      SELECT
        e.id,
        e.employeeId,
        e.name,
        e.positionGroupId,
        pg.name as positionGroupName,
        e.skillLevel,
        e.canWorkNightShift,
        e.workableDays,
        e.additionalConstraints
      FROM employees e
      LEFT JOIN positionGroups pg ON e.positionGroupId = pg.id
      ORDER BY e.id
    `) as any;

    console.log(`📊 職員総数: ${employees.length}人\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 各職員の詳細情報\n');

    for (const emp of employees) {
      console.log(`【職員${emp.id}: ${emp.name}】`);
      console.log(`  職員ID: ${emp.employeeId}`);
      console.log(`  役職: ${emp.positionGroupName || '(未設定)'}`);
      console.log(`  スキルレベル: ${emp.skillLevel || 100}`);
      console.log(`  夜勤可: ${emp.canWorkNightShift ? 'はい' : 'いいえ'}`);

      // workableDays の確認
      console.log(`\n  【勤務可能日時設定（workableDays）】`);
      if (emp.workableDays) {
        try {
          const workableDays = typeof emp.workableDays === 'string'
            ? JSON.parse(emp.workableDays)
            : emp.workableDays;

          if (Array.isArray(workableDays) && workableDays.length > 0) {
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            workableDays.forEach((wd: any) => {
              console.log(`    ${dayNames[wd.dayOfWeek]}曜: ${wd.startTime}-${wd.endTime}`);
            });
          } else {
            console.log(`    (未設定)`);
          }
        } catch (e) {
          console.log(`    ⚠️  パース失敗: ${emp.workableDays}`);
        }
      } else {
        console.log(`    (null)`);
      }

      // additionalConstraints の確認
      console.log(`\n  【補足情報（additionalConstraints）】`);
      if (emp.additionalConstraints) {
        try {
          const constraints = typeof emp.additionalConstraints === 'string'
            ? JSON.parse(emp.additionalConstraints)
            : emp.additionalConstraints;

          if (typeof constraints === 'object' && Object.keys(constraints).length > 0) {
            console.log(`    タイプ: JSONオブジェクト`);
            console.log(`    キー: ${Object.keys(constraints).join(', ')}`);
            console.log(`    詳細:`);
            console.log(JSON.stringify(constraints, null, 6));
          } else if (typeof constraints === 'string' && constraints.trim()) {
            console.log(`    タイプ: 文字列`);
            console.log(`    内容: ${constraints}`);
          } else {
            console.log(`    (空)`);
          }
        } catch (e) {
          console.log(`    タイプ: 文字列（JSON以外）`);
          console.log(`    内容: ${emp.additionalConstraints}`);
        }
      } else {
        console.log(`    (null)`);
      }

      console.log('');
    }

    // 段階的配置アルゴリズムでの使用状況
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 段階的配置アルゴリズムでの使用状況\n');

    console.log('【現在の実装】');
    console.log('  ✅ workableDays');
    console.log('     - server/utils/employeeAvailability.ts で使用');
    console.log('     - 優先順位3: 曜日・時間制限として機能');
    console.log('     - getEmployeeAvailability() 関数内で参照');
    console.log('');
    console.log('  ❌ additionalConstraints');
    console.log('     - 段階的配置では未使用');
    console.log('     - AI生成でのみ使用される（可能性）');
    console.log('     - UIでの編集機能なし（保護されている）');
    console.log('');

    console.log('【additionalConstraintsの想定用途】');
    console.log('  - AI自動生成時のコンテキスト情報');
    console.log('  - より詳細な勤務パターンの指定');
    console.log('  - 特殊ルール（連続夜勤可、週末勤務パターンなど）');
    console.log('  - 月間労働時間目標');
    console.log('');

    console.log('【推奨される対応】');
    console.log('  1. workableDaysとadditionalConstraintsの役割を明確化');
    console.log('  2. additionalConstraints編集UIを追加（必要に応じて）');
    console.log('  3. 段階的配置でadditionalConstraintsを活用（拡張）');
    console.log('');

    // データ統計
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 データ統計\n');

    const workableDaysCount = employees.filter((e: any) => {
      if (!e.workableDays) return false;
      const wd = typeof e.workableDays === 'string' ? JSON.parse(e.workableDays) : e.workableDays;
      return Array.isArray(wd) && wd.length > 0;
    }).length;

    const additionalConstraintsCount = employees.filter((e: any) => {
      if (!e.additionalConstraints) return false;
      try {
        const ac = typeof e.additionalConstraints === 'string'
          ? JSON.parse(e.additionalConstraints)
          : e.additionalConstraints;
        return typeof ac === 'object' && Object.keys(ac).length > 0;
      } catch {
        return typeof e.additionalConstraints === 'string' && e.additionalConstraints.trim();
      }
    }).length;

    console.log(`  workableDays設定済み: ${workableDaysCount}人 / ${employees.length}人`);
    console.log(`  additionalConstraints設定済み: ${additionalConstraintsCount}人 / ${employees.length}人`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 確認完了\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
