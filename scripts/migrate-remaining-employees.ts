/**
 * 残りの職員（workPatterns等）をworkableDaysに変換
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

interface WorkableDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * workPatternsとweeklyPatternを組み合わせてworkableDaysを生成
 */
function convertRemainingToWorkableDays(additionalConstraints: any): WorkableDay[] {
  if (!additionalConstraints || typeof additionalConstraints !== 'object') {
    // 制約なし → 標準勤務時間で全曜日設定
    return [0, 1, 2, 3, 4, 5, 6].map(day => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00'
    }));
  }

  const workableDays: WorkableDay[] = [];
  const excludedDays = new Set<number>();
  let defaultWorkTime: { startTime: string; endTime: string } | null = null;

  // 1. weeklyPatternから除外日と勤務日を抽出
  if (additionalConstraints.weeklyPattern) {
    const dayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    for (const [day, pattern] of Object.entries(additionalConstraints.weeklyPattern)) {
      const dayOfWeek = dayMapping[day];
      if (pattern === 'off') {
        excludedDays.add(dayOfWeek);
      } else if (typeof pattern === 'object' && (pattern as any).startTime) {
        workableDays.push({
          dayOfWeek,
          startTime: (pattern as any).startTime,
          endTime: (pattern as any).endTime
        });
      }
    }
  }

  // 2. weekendAndHolidayOff / weekendOff
  if (additionalConstraints.weekendAndHolidayOff || additionalConstraints.weekendOff) {
    excludedDays.add(0); // 日曜
    excludedDays.add(6); // 土曜
  }

  // 3. holidayOff
  if (additionalConstraints.holidayOff) {
    // 祝日は別管理なので、ここでは何もしない
  }

  // 4. workPatternsから標準勤務時間を抽出
  if (additionalConstraints.workPatterns && Array.isArray(additionalConstraints.workPatterns)) {
    const mainPattern = additionalConstraints.workPatterns[0];
    if (mainPattern && mainPattern.startTime && mainPattern.endTime) {
      defaultWorkTime = {
        startTime: mainPattern.startTime,
        endTime: mainPattern.endTime
      };
    }
  }

  // デフォルト勤務時間がなければ標準時間を設定
  if (!defaultWorkTime) {
    defaultWorkTime = {
      startTime: '09:00',
      endTime: '17:00'
    };
  }

  // 5. まだ設定されていない曜日に標準勤務時間を適用
  for (let day = 0; day <= 6; day++) {
    if (!excludedDays.has(day) && !workableDays.some(wd => wd.dayOfWeek === day)) {
      workableDays.push({
        dayOfWeek: day,
        startTime: defaultWorkTime.startTime,
        endTime: defaultWorkTime.endTime
      });
    }
  }

  // 6. 曜日順にソート
  return workableDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

async function migrate() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 残りの職員をworkableDaysに変換');
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

    console.log(`📊 対象職員数: ${noWorkableDays.length}人\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of noWorkableDays) {
      // additionalConstraints をパース
      let constraints: any = null;
      if (emp.additionalConstraints) {
        try {
          constraints = typeof emp.additionalConstraints === 'string'
            ? JSON.parse(emp.additionalConstraints)
            : emp.additionalConstraints;
        } catch (e) {
          console.log(`⚠️  [職員${emp.id}] additionalConstraints のパースに失敗: ${emp.name}`);
          // パース失敗でも標準設定を適用
          constraints = null;
        }
      }

      // workableDays を生成
      const newWorkableDays = convertRemainingToWorkableDays(constraints);

      if (newWorkableDays.length === 0) {
        console.log(`⏭️  [職員${emp.id}] スキップ: ${emp.name} (変換後のworkableDaysが空)`);
        skippedCount++;
        continue;
      }

      // 更新
      await conn.execute(
        'UPDATE employees SET workableDays = ? WHERE id = ?',
        [JSON.stringify(newWorkableDays), emp.id]
      );

      console.log(`✅ [職員${emp.id}] 更新: ${emp.name}`);
      console.log(`   変換結果:`);
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      newWorkableDays.forEach(wd => {
        console.log(`     ${dayNames[wd.dayOfWeek]}曜: ${wd.startTime}-${wd.endTime}`);
      });
      console.log('');

      updatedCount++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 マイグレーション完了\n');
    console.log(`  更新: ${updatedCount}人`);
    console.log(`  スキップ: ${skippedCount}人`);
    console.log(`  合計: ${noWorkableDays.length}人\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ マイグレーション成功\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
