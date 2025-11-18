/**
 * additionalConstraintsからworkableDaysへの変換マイグレーション
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
 * additionalConstraintsからworkableDaysを生成
 */
function convertToWorkableDays(additionalConstraints: any): WorkableDay[] {
  if (!additionalConstraints || typeof additionalConstraints !== 'object') {
    return [];
  }

  const workableDays: WorkableDay[] = [];
  const excludedDays = new Set<number>();
  let defaultWorkTime: { startTime: string; endTime: string } | null = null;

  // 1. workConstraints の処理（AI生成された制約）
  if (additionalConstraints.workConstraints && Array.isArray(additionalConstraints.workConstraints)) {
    for (const constraint of additionalConstraints.workConstraints) {
      if (!constraint.isActive) continue; // 非アクティブはスキップ

      if (constraint.type === 'specific_day_off' || constraint.type === 'day_off_pattern') {
        // 休みの曜日を除外
        if (Array.isArray(constraint.dayOfWeek)) {
          constraint.dayOfWeek.forEach((day: number) => excludedDays.add(day));
        }
      } else if (constraint.type === 'specific_day_hours') {
        // 特定曜日の勤務時間
        if (Array.isArray(constraint.dayOfWeek) && constraint.startTime && constraint.endTime) {
          constraint.dayOfWeek.forEach((day: number) => {
            const existingIndex = workableDays.findIndex(wd => wd.dayOfWeek === day);
            if (existingIndex >= 0) {
              workableDays[existingIndex] = {
                dayOfWeek: day,
                startTime: constraint.startTime,
                endTime: constraint.endTime
              };
            } else {
              workableDays.push({
                dayOfWeek: day,
                startTime: constraint.startTime,
                endTime: constraint.endTime
              });
            }
          });
        }
      } else if (constraint.type === 'work_hours') {
        // デフォルトの勤務時間（すべての曜日に適用）
        if (constraint.startTime && constraint.endTime) {
          defaultWorkTime = {
            startTime: constraint.startTime,
            endTime: constraint.endTime
          };
        }
      }
    }

    // デフォルトの勤務時間を、まだ設定されていない曜日に適用
    if (defaultWorkTime) {
      for (let day = 0; day <= 6; day++) {
        if (!excludedDays.has(day) && !workableDays.some(wd => wd.dayOfWeek === day)) {
          workableDays.push({
            dayOfWeek: day,
            startTime: defaultWorkTime.startTime,
            endTime: defaultWorkTime.endTime
          });
        }
      }
    }
  }

  // 2. weeklyPattern の処理（休みの曜日を記録）
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
        // 時間指定がある場合
        const existingIndex = workableDays.findIndex(wd => wd.dayOfWeek === dayOfWeek);
        if (existingIndex >= 0) {
          workableDays[existingIndex] = {
            dayOfWeek,
            startTime: (pattern as any).startTime,
            endTime: (pattern as any).endTime
          };
        } else {
          workableDays.push({
            dayOfWeek,
            startTime: (pattern as any).startTime,
            endTime: (pattern as any).endTime
          });
        }
      }
    }
  }

  // 3. weekendAndHolidayOff / weekendOff の処理
  if (additionalConstraints.weekendAndHolidayOff || additionalConstraints.weekendOff) {
    excludedDays.add(0); // 日曜
    excludedDays.add(6); // 土曜
  }

  // 4. fixedSchedule の処理（最優先）
  if (additionalConstraints.fixedSchedule) {
    const dayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    for (const [day, schedule] of Object.entries(additionalConstraints.fixedSchedule)) {
      const dayOfWeek = dayMapping[day];
      if (schedule && typeof schedule === 'object') {
        const sched = schedule as any;
        // 既に追加されている場合は上書き
        const existingIndex = workableDays.findIndex(wd => wd.dayOfWeek === dayOfWeek);
        if (existingIndex >= 0) {
          workableDays[existingIndex] = {
            dayOfWeek,
            startTime: sched.startTime,
            endTime: sched.endTime
          };
        } else {
          workableDays.push({
            dayOfWeek,
            startTime: sched.startTime,
            endTime: sched.endTime
          });
        }
        // fixedScheduleがある曜日は除外リストから削除
        excludedDays.delete(dayOfWeek);
      }
    }
  }

  // 5. 除外された曜日をworkableDaysから削除
  const filtered = workableDays.filter(wd => !excludedDays.has(wd.dayOfWeek));

  // 6. 曜日順にソート
  return filtered.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

async function migrate() {
  const conn = await mysql.createConnection(config);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 additionalConstraints → workableDays 変換マイグレーション');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 全職員を取得
    const [employees] = await conn.execute(`
      SELECT id, employeeId, name, additionalConstraints, workableDays
      FROM employees
      ORDER BY id
    `) as any;

    console.log(`📊 対象職員数: ${employees.length}人\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      // additionalConstraints をパース
      let constraints: any = null;
      if (emp.additionalConstraints) {
        try {
          constraints = typeof emp.additionalConstraints === 'string'
            ? JSON.parse(emp.additionalConstraints)
            : emp.additionalConstraints;
        } catch (e) {
          console.log(`⚠️  [職員${emp.id}] additionalConstraints のパースに失敗: ${emp.name}`);
          skippedCount++;
          continue;
        }
      }

      // workableDays を生成
      const newWorkableDays = convertToWorkableDays(constraints);

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
    console.log(`  合計: ${employees.length}人\n`);

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
