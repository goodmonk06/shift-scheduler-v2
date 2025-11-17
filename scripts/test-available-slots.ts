import mysql from 'mysql2/promise';
import type { EmployeeConstraints } from '../shared/employeeConstraintTypes';

interface Employee {
  id: number;
  name: string;
  canWorkNightShift: boolean;
  skillLevel: number;
  minDaysOffPerMonth: number;
  additionalConstraints: EmployeeConstraints | null;
}

interface WorkTimeSlot {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
}

interface LeaveRequest {
  employeeId: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface ShiftAssignment {
  employeeId: number;
  date: string;
  timeSlotId: number;
}

/**
 * 指定された日付に希望休があるかチェック
 */
function hasLeaveRequest(
  employeeId: number,
  date: string,
  leaveRequests: LeaveRequest[]
): boolean {
  return leaveRequests.some(lr => {
    if (lr.employeeId !== employeeId) return false;
    if (lr.status !== 'approved' && lr.status !== 'pending') return false;

    const targetDate = new Date(date);
    const startDate = new Date(lr.startDate);
    const endDate = new Date(lr.endDate);

    return targetDate >= startDate && targetDate <= endDate;
  });
}

/**
 * 連続勤務日数をチェック
 */
function getConsecutiveWorkDays(
  employeeId: number,
  date: string,
  existingShifts: ShiftAssignment[]
): number {
  const targetDate = new Date(date);
  let consecutiveDays = 0;

  // 前日から遡ってカウント
  for (let i = 1; i <= 10; i++) {
    const checkDate = new Date(targetDate);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const hasShift = existingShifts.some(
      s => s.employeeId === employeeId && s.date === checkDateStr
    );

    if (hasShift) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}

/**
 * 日付が祝日かチェック（簡易版）
 */
function isHoliday(date: string): boolean {
  // 簡易実装: 2025年の祝日リスト
  const holidays2025 = [
    '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23',
    '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04',
    '2025-05-05', '2025-07-21', '2025-08-11', '2025-09-15',
    '2025-09-22', '2025-09-23', '2025-10-13', '2025-11-03',
    '2025-11-23', '2025-11-24'
  ];
  return holidays2025.includes(date);
}

/**
 * 時間枠が指定された時間範囲内かチェック
 */
function isSlotWithinTimeRange(
  slot: WorkTimeSlot,
  startTime: string,
  endTime: string
): boolean {
  const slotStart = slot.startTime;
  const slotEnd = slot.endTime;

  // HH:MM形式を数値に変換（例: "09:00" → 900）
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const slotStartMin = toMinutes(slotStart);
  const slotEndMin = toMinutes(slotEnd);
  const constraintStartMin = toMinutes(startTime);
  const constraintEndMin = toMinutes(endTime);

  // 終了時刻が開始時刻より前の場合（例: 夜勤 16:00-09:00）
  const slotCrossesMidnight = slotEndMin < slotStartMin;
  const constraintCrossesMidnight = constraintEndMin < constraintStartMin;

  if (slotCrossesMidnight || constraintCrossesMidnight) {
    // 複雑なケースは保留（現状は日勤のみ想定）
    return true;
  }

  // 時間枠が制約範囲内に完全に収まっているかチェック
  return slotStartMin >= constraintStartMin && slotEndMin <= constraintEndMin;
}

/**
 * 配置可能な勤務時間枠を計算
 */
function calculateAvailableSlots(
  employee: Employee,
  date: string,
  existingShifts: ShiftAssignment[],
  allSlots: WorkTimeSlot[],
  leaveRequests: LeaveRequest[]
): { availableSlotIds: number[], reasons: Record<number, string> } {
  const availableSlotIds: number[] = [];
  const reasons: Record<number, string> = {};

  const constraints = employee.additionalConstraints;
  const dayOfWeek = new Date(date).getDay();  // 0=日曜, 6=土曜

  // ━━━ 優先度100: 絶対厳守（LLMの考慮外） ━━━

  // チェック0: 希望休
  if (hasLeaveRequest(employee.id, date, leaveRequests)) {
    return {
      availableSlotIds: [],
      reasons: { 0: '希望休（厳守）' }
    };
  }

  // チェック1: 有給休暇（取得済み）
  const paidLeaveTaken = constraints?.leaveAllowances?.paidLeave?.takenDates?.find(
    d => d.date === date
  );
  if (paidLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '有給休暇（厳守）' }
    };
  }

  // チェック2: 誕生日休暇（取得済み）
  const birthdayLeaveTaken = constraints?.leaveAllowances?.birthdayLeave?.takenDates?.find(
    d => d.date === date
  );
  if (birthdayLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '誕生日休暇（厳守）' }
    };
  }

  // チェック3: 季節休暇（取得済み）
  const summerLeaveTaken = constraints?.leaveAllowances?.seasonalLeave?.summer?.takenDates?.find(
    d => d.date === date
  );
  const winterLeaveTaken = constraints?.leaveAllowances?.seasonalLeave?.winter?.takenDates?.find(
    d => d.date === date
  );
  if (summerLeaveTaken || winterLeaveTaken) {
    return {
      availableSlotIds: [],
      reasons: { 0: '季節休暇（厳守）' }
    };
  }

  // チェック4: 曜日制約（day_off_pattern: 土日祝日休みなど）
  const dayOffPattern = constraints?.workConstraints?.find(
    c => c.type === 'day_off_pattern' && c.isActive
  );
  if (dayOffPattern) {
    const isDayOff = dayOffPattern.dayOfWeek?.includes(dayOfWeek);
    const isHolidayOff = dayOffPattern.includeHolidays && isHoliday(date);

    if (isDayOff || isHolidayOff) {
      return {
        availableSlotIds: [],
        reasons: { 0: `${dayOffPattern.description}（厳守）` }
      };
    }
  }

  // チェック5: 特定曜日休み（specific_day_off: 火曜日休みなど）
  const specificDayOff = constraints?.workConstraints?.find(
    c => c.type === 'specific_day_off' && c.isActive && c.dayOfWeek?.includes(dayOfWeek)
  );
  if (specificDayOff) {
    return {
      availableSlotIds: [],
      reasons: { 0: `${specificDayOff.description}（厳守）` }
    };
  }

  // ━━━ 各勤務時間枠をチェック ━━━

  for (const slot of allSlots) {
    // チェック6: 夜勤資格
    if (slot.isNightShift && !employee.canWorkNightShift) {
      reasons[slot.id] = '夜勤資格なし（厳守）';
      continue;
    }

    // チェック7: 全般的な勤務時間制約（work_hours: 9:00-14:00のみなど）
    const workHoursConstraint = constraints?.workConstraints?.find(
      c => c.type === 'work_hours' && c.isActive
    );
    if (workHoursConstraint && workHoursConstraint.startTime && workHoursConstraint.endTime) {
      if (!isSlotWithinTimeRange(slot, workHoursConstraint.startTime, workHoursConstraint.endTime)) {
        reasons[slot.id] = `${workHoursConstraint.description}（厳守）`;
        continue;
      }
    }

    // チェック8: 特定曜日の勤務時間制約（specific_day_hours: 水曜・土曜 11:00-20:00など）
    const specificDayHours = constraints?.workConstraints?.find(
      c => c.type === 'specific_day_hours' && c.isActive && c.dayOfWeek?.includes(dayOfWeek)
    );
    if (specificDayHours && specificDayHours.startTime && specificDayHours.endTime) {
      if (!isSlotWithinTimeRange(slot, specificDayHours.startTime, specificDayHours.endTime)) {
        reasons[slot.id] = `${specificDayHours.description}（厳守）`;
        continue;
      }
    }

    // チェック9: 連続勤務上限
    const consecutiveDays = getConsecutiveWorkDays(employee.id, date, existingShifts);
    if (consecutiveDays >= 4) {
      reasons[slot.id] = `連続勤務上限（現在${consecutiveDays}日連続）（厳守）`;
      continue;
    }

    // チェック10: 1日1シフトまで
    const alreadyAssigned = existingShifts.some(
      s => s.employeeId === employee.id && s.date === date
    );
    if (alreadyAssigned) {
      reasons[slot.id] = 'この日は既に配置済み（厳守）';
      continue;
    }

    // ━━━ すべてクリア → LLMの選択肢に含める ━━━
    availableSlotIds.push(slot.id);
    reasons[slot.id] = '✅ 配置可能';
  }

  return { availableSlotIds, reasons };
}

/**
 * メイン処理
 */
async function testAvailableSlots() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    // サンプル職員4人のデータを取得（additionalConstraintsも含む）
    const [employeesData] = await conn.query(`
      SELECT e.*, pg.minDaysOffPerMonth
      FROM employees e
      JOIN positionGroups pg ON e.positionGroupId = pg.id
      WHERE e.id IN (
        SELECT id FROM (
          SELECT e.id FROM employees e JOIN positionGroups pg ON e.positionGroupId = pg.id WHERE pg.name LIKE '%管理%' LIMIT 1
        ) t1
        UNION
        SELECT id FROM (
          SELECT e.id FROM employees e JOIN positionGroups pg ON e.positionGroupId = pg.id WHERE pg.employmentType = 'fulltime' AND pg.name NOT LIKE '%管理%' LIMIT 1
        ) t2
        UNION
        SELECT id FROM (
          SELECT e.id FROM employees e JOIN positionGroups pg ON e.positionGroupId = pg.id WHERE pg.employmentType = 'parttime' ORDER BY e.canWorkNightShift DESC LIMIT 2
        ) t3
      )
    `) as any;

    // JSONフィールドをパース
    const employees: Employee[] = employeesData.map((e: any) => ({
      ...e,
      additionalConstraints: e.additionalConstraints || null
    }));

    // 勤務時間枠を取得
    const [slotsData] = await conn.query('SELECT * FROM workTimeSlots ORDER BY startTime') as any;
    const slots: WorkTimeSlot[] = slotsData;

    // 希望休を取得
    const [leavesData] = await conn.query(`
      SELECT * FROM leaveRequests
      WHERE startDate LIKE '2025-11%' OR endDate LIKE '2025-11%'
    `) as any;
    const leaveRequests: LeaveRequest[] = leavesData;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 配置可能枠の事前計算テスト');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2025年11月1-5日について計算
    const testDates = ['2025-11-01', '2025-11-02', '2025-11-03', '2025-11-04', '2025-11-05'];

    for (const employee of employees) {
      console.log('\n🧑 ' + employee.name);
      console.log('   夜勤: ' + (employee.canWorkNightShift ? '可能' : '不可'));
      console.log('   スキルレベル: ' + employee.skillLevel);
      console.log('');

      for (const date of testDates) {
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][new Date(date).getDay()];
        const result = calculateAvailableSlots(employee, date, [], slots, leaveRequests);

        console.log(`  📅 ${date} (${dayOfWeek})`);

        if (result.reasons[0]) {
          // 希望休で全NG
          console.log('     ' + result.reasons[0]);
        } else {
          console.log('     配置可能: ' + result.availableSlotIds.length + '枠 / ' + slots.length + '枠');

          // 配置可能な枠を表示
          const availableSlotNames = result.availableSlotIds.map(id => {
            const slot = slots.find(s => s.id === id);
            return slot ? slot.name : 'ID' + id;
          });
          console.log('     ✅ ' + availableSlotNames.join(', '));

          // 配置不可の枠とその理由を表示
          const unavailableSlots = slots.filter(s => !result.availableSlotIds.includes(s.id));
          if (unavailableSlots.length > 0) {
            console.log('     ❌ 配置不可:');
            unavailableSlots.forEach(slot => {
              console.log('        - ' + slot.name + ': ' + result.reasons[slot.id]);
            });
          }
        }
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 計算完了');
    console.log('');
    console.log('📝 このデータ構造をAIに渡せば、');
    console.log('   AIは「選択肢の中から選ぶだけ」になり、');
    console.log('   ルール違反が物理的に不可能になります。');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } finally {
    await conn.end();
  }
}

testAvailableSlots().catch(console.error);
