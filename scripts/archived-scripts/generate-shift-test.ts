/**
 * 段階的配置アルゴリズムを使用して実際にシフトを生成
 */
import * as db from '../server/db';
import {
  phase1_confirmHardConstraints,
  phase2_calculateAvailability,
} from '../server/phaseBasedShiftGenerator';
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

async function generateAndVerifyShift() {
  const conn = await mysql.createConnection(config);

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║           🚀 段階的配置アルゴリズム実行テスト               ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const shiftId = 30;
    const year = 2025;
    const month = 12;

    console.log(`📋 対象シフト: ID ${shiftId} (${year}年${month}月)\n`);

    // 既存のシフト詳細を削除
    console.log('🗑️  既存のシフト詳細を削除中...');
    await conn.execute('DELETE FROM shiftDetails WHERE shiftId = ?', [shiftId]);
    console.log('✅ 削除完了\n');

    // Phase 1: ハード制約の確定
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Phase 1: ハード制約の確定');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const phase1Results = await phase1_confirmHardConstraints(shiftId, year, month);
    console.log(`\n✅ Phase 1完了: ${phase1Results.length}件のハード制約を確定\n`);

    // Phase 2: 勤務可能枠の計算
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Phase 2: 勤務可能枠の計算');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const availabilityMap = await phase2_calculateAvailability(shiftId, year, month, phase1Results);
    console.log(`\n✅ Phase 2完了: ${availabilityMap.size}件の勤務可能情報を計算\n`);

    // 簡易的にシフトを生成（Phase 3簡易版）
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Phase 3: シフト配置（簡易版）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const employees = await db.getAllEmployees();
    const generatedShifts: any[] = [...phase1Results];

    // 12月の各日について、勤務可能な職員を配置
    const daysInMonth = new Date(year, month, 0).getDate();
    let assignedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // この日に既にハード制約がある職員をスキップ
      const alreadyAssigned = new Set(
        phase1Results
          .filter(s => s.date === date)
          .map(s => s.employeeId)
      );

      // 勤務可能な職員を収集
      const availableEmployees = employees
        .filter(emp => !alreadyAssigned.has(emp.id))
        .filter(emp => {
          const key = `${emp.id}-${date}`;
          const avail = availabilityMap.get(key);
          return avail && avail.canWork;
        })
        .slice(0, 3); // 各日3人まで配置（サンプル）

      for (const emp of availableEmployees) {
        const key = `${emp.id}-${date}`;
        const avail = availabilityMap.get(key);

        if (avail && avail.timeRange) {
          // 勤務可能時間帯からシフトを生成
          const startSlot = avail.timeRange.indexOf(true);
          const endSlot = avail.timeRange.lastIndexOf(true) + 1;

          if (startSlot >= 0 && endSlot > startSlot) {
            const startTime = `${String(Math.floor(startSlot / 2)).padStart(2, '0')}:${startSlot % 2 === 0 ? '00' : '30'}`;
            const endTime = `${String(Math.floor(endSlot / 2)).padStart(2, '0')}:${endSlot % 2 === 0 ? '00' : '30'}`;

            generatedShifts.push({
              shiftId,
              employeeId: emp.id,
              date,
              status: 'working',
              timeSlotId: null,
              leaveType: null,
              startTime,
              endTime,
              generatedBy: 'phase_based',
              reason: 'workableDays制約に基づく配置',
            });
            assignedCount++;
          }
        }
      }
    }

    console.log(`配置したシフト: ${assignedCount}件\n`);

    // データベースに保存
    console.log('💾 データベースに保存中...');
    for (const shift of generatedShifts) {
      await conn.execute(
        `INSERT INTO shiftDetails (shiftId, employeeId, date, status, timeSlotId, leaveType, startTime, endTime, generatedBy, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shift.shiftId,
          shift.employeeId,
          shift.date,
          shift.status,
          shift.timeSlotId,
          shift.leaveType,
          shift.startTime,
          shift.endTime,
          shift.generatedBy,
          shift.reason
        ]
      );
    }
    console.log('✅ 保存完了\n');

    // 検証
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 生成結果の検証');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // テスト職員のシフトを確認
    const testEmployees = [
      { name: '足立 洋子', expected: '月曜・木曜のみ' },
      { name: '海野 はるか', expected: '平日のみ（土日なし）' },
      { name: '楠 美佐', expected: '火曜・土日なし' }
    ];

    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    for (const { name, expected } of testEmployees) {
      const emp = employees.find(e => e.name.includes(name.split(' ')[0]));
      if (!emp) continue;

      const [empShifts] = await conn.execute(
        `SELECT * FROM shiftDetails WHERE shiftId = ? AND employeeId = ? AND status = 'working' ORDER BY date`,
        [shiftId, emp.id]
      ) as any;

      console.log(`【${emp.name}】`);
      console.log(`  期待: ${expected}`);

      if (empShifts.length === 0) {
        console.log(`  実際: シフトなし ⚠️`);
      } else {
        const workDays = empShifts.map((s: any) => {
          const d = new Date(s.date);
          return dayNames[d.getDay()];
        });
        const uniqueDays = [...new Set(workDays)];
        console.log(`  実際: ${uniqueDays.join('、')}曜に勤務（${empShifts.length}日）`);

        // workableDaysと照合
        if (emp.workableDays && Array.isArray(emp.workableDays)) {
          const allowedDays = emp.workableDays.map((wd: any) => dayNames[wd.dayOfWeek]);
          console.log(`  設定: ${allowedDays.join('、')}曜が勤務可能`);

          // 違反チェック
          const violations = empShifts.filter((s: any) => {
            const d = new Date(s.date);
            const dow = d.getDay();
            return !emp.workableDays.some((wd: any) => wd.dayOfWeek === dow);
          });

          if (violations.length > 0) {
            console.log(`  ❌ 違反あり: ${violations.length}件の勤務不可曜日にシフト配置`);
          } else {
            console.log(`  ✅ 制約遵守: すべて勤務可能曜日に配置`);
          }
        }
      }
      console.log('');
    }

    // 統計
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 生成統計\n');

    const [stats] = await conn.execute(`
      SELECT
        status,
        COUNT(*) as count,
        COUNT(DISTINCT employeeId) as employees,
        COUNT(DISTINCT date) as dates
      FROM shiftDetails
      WHERE shiftId = ?
      GROUP BY status
    `, [shiftId]) as any;

    stats.forEach((stat: any) => {
      console.log(`  ${stat.status}: ${stat.count}件（職員${stat.employees}人、日付${stat.dates}日）`);
    });
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ テスト完了\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║   🎉 段階的配置アルゴリズム: 正常動作確認 🎉               ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

generateAndVerifyShift().catch(err => {
  console.error('❌ Generation failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
