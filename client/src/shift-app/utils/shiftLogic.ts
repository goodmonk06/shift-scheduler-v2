import {
  FULL_TIME_STAFF_IDS,
  CLERK_STAFF_ID,
  REQUIRED_STAFF_MATRIX,
  REQUIRED_HOLIDAYS_FULLTIME,
  MAX_CONSECUTIVE_WORK_DAYS,
  END_DATE
} from './constants';
import { getIsoDate } from './dateHelpers';

export interface ShiftCell {
  type: string;
  customText: string;
  isLocked: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  qualification: string;
  note?: string;
  schedule?: Record<string, string>;
  constraints?: any;
}

export interface WorkStats {
  days: number;
  hours: number;
  nightCount: number;
  paidHolidays: number;
}

export interface SufficiencyResult {
  maxShortage: number;
  details: string[];
}

// シフトテキストを正規化
export const normalizeShiftText = (text: string): string => {
  if (text === '8～17' || text === '8:00～17:00') return '日A';
  if (text === '9～18' || text === '9:00～18:00') return '日B';
  if (text === '早') return '早';
  return text;
};

// 勤務統計を計算
export const calculateWorkStats = (
  shifts: Record<string, ShiftCell | null>,
  staffId: string,
  dates: Date[]
): WorkStats => {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let paidHolidays = 0;

  dates.forEach(date => {
    const key = `${staffId}_${getIsoDate(date)}`;
    const cell = shifts[key];
    if (!cell) return;

    const text = cell.customText;
    const type = cell.type;

    if (text === '有' || text === '有給') {
      paidHolidays++;
      return;
    }
    if (text === '休' || text === '休職' || text === '' || type === 'OFF') {
      return;
    }

    if (text !== '明') {
      days++;
    }

    if (text === '夜' || type === 'NIGHT') {
      nightCount++;
      hours += 16;
      return;
    }

    if (text === '日' || text === '日A' || text === '日B' || text === '早' || text === '遅' || type === 'DAY' || type === 'EARLY' || type === 'LATE') {
      hours += 8;
    } else {
      const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
      if (match) {
        let start = parseInt(match[1]);
        if (text.includes(match[1] + '半')) start += 0.5;
        let end = parseInt(match[2]);
        if (text.includes(match[2] + '半')) end += 0.5;

        let diff = end - start;
        if (diff > 6) diff -= 1;
        hours += diff > 0 ? diff : 0;
      } else {
        hours += 8;
      }
    }
  });

  return { days, hours, nightCount, paidHolidays };
};

// シフト時間を解析
export const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
  if (text === '夜' || type === 'NIGHT') return { start: 16, end: 33 };
  if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '明') return null;

  if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
  if (text === '日A') return { start: 8, end: 17 };
  if (text === '日B') return { start: 9, end: 18 };
  if (text === '早' || type === 'EARLY') return { start: 6, end: 15 };
  if (text === '遅' || type === 'LATE') return { start: 10, end: 19 };

  const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
  if (match) {
    let start = parseInt(match[1]);
    if (text.includes(match[1] + '半')) start += 0.5;
    let end = parseInt(match[2]);
    if (text.includes(match[2] + '半')) end += 0.5;
    return { start, end };
  }
  return { start: 9, end: 18 };
};

// 配置充足性を計算
export const calculateSufficiency = (
  dates: Date[],
  shifts: Record<string, ShiftCell | null>,
  staffList: Staff[]
): Record<string, SufficiencyResult> => {
  const results: Record<string, SufficiencyResult> = {};

  dates.forEach((date, dateIdx) => {
    const dateIso = getIsoDate(date);

    const hourlyCounts = new Array(24).fill(0);
    const hourlyFullTimeCounts = new Array(24).fill(0);

    if (dateIdx > 0) {
      const prevDate = dates[dateIdx - 1];
      const prevKeySuffix = getIsoDate(prevDate);
      staffList.forEach(staff => {
        const cell = shifts[`${staff.id}_${prevKeySuffix}`];
        if (cell && (cell.type === 'NIGHT' || cell.customText === '夜')) {
          for (let h = 0; h < 9; h++) {
            hourlyCounts[h]++;
            if (FULL_TIME_STAFF_IDS.includes(staff.id)) hourlyFullTimeCounts[h]++;
          }
        }
      });
    }

    staffList.forEach(staff => {
      const cell = shifts[`${staff.id}_${dateIso}`];
      if (!cell) return;
      const time = parseShiftTime(cell.customText, cell.type);
      if (!time) return;

      let start = time.start;
      let end = time.end;

      if (end > 24) end = 24;

      for (let h = Math.floor(start); h < Math.ceil(end); h++) {
        if (h >= 0 && h < 24) {
          hourlyCounts[h]++;
          if (FULL_TIME_STAFF_IDS.includes(staff.id)) hourlyFullTimeCounts[h]++;
          if (staff.id === CLERK_STAFF_ID && h >= 9 && h < 18) hourlyFullTimeCounts[h]++;
        }
      }
    });

    const shortageDetails: string[] = [];
    let maxShortage = 0;

    for (let h = 0; h < 24; h++) {
      let required = REQUIRED_STAFF_MATRIX[h] || 1;
      let current = hourlyCounts[h];
      let diff = current - required;

      if (h >= 9 && h < 16) {
        if (hourlyFullTimeCounts[h] < 1) {
          shortageDetails.push(`${h}時:正社員不足`);
          maxShortage = Math.max(maxShortage, 2);
        }
      }

      if (diff < 0) {
        shortageDetails.push(`${h}時(${diff})`);
        if (diff <= -2) maxShortage = Math.max(maxShortage, 2);
        else maxShortage = Math.max(maxShortage, 1);
      }
    }

    results[dateIso] = {
      maxShortage,
      details: shortageDetails
    };
  });

  return results;
};

// 夜勤候補者を取得
export const getNightShiftCandidates = (staffList: Staff[]): string[] => {
  return staffList.filter(staff => {
    if (staff.constraints?.fixedTimeOnly) return false;
    if (!staff.schedule) return false;
    if (staff.constraints?.forbiddenTypes?.includes('NIGHT')) return false;

    return Object.values(staff.schedule || {}).some(val => val === '夜' || val === '夜勤') || FULL_TIME_STAFF_IDS.includes(staff.id);
  }).map(s => s.id);
};

// シフト自動生成
export const generateShifts = (
  dates: Date[],
  staffList: Staff[]
): Record<string, ShiftCell | null> => {
  const newShifts: Record<string, ShiftCell | null> = {};
  const nightCandidates = getNightShiftCandidates(staffList);

  try {
    // 1. 固定スケジュール
    staffList.forEach(staff => {
      dates.forEach(date => {
        const key = `${staff.id}_${getIsoDate(date)}`;
        const dateStr = getIsoDate(date);
        const dayOfWeek = date.getDay();
        const isHolidayFlag = date.getDay() === 0 || date.getDay() === 6;
        const cons = staff.constraints || {};

        let val: ShiftCell | null = null;

        if (staff.schedule && staff.schedule[dateStr]) {
          const req = staff.schedule[dateStr];
          val = { type: 'DAY', customText: normalizeShiftText(req), isLocked: true };
          if (req === '休') val = { type: 'OFF', customText: '休', isLocked: true };
          else if (req === '有給' || req === '有') val = { type: 'HOPE', customText: '有', isLocked: true };
          else if (req === '冬' || req === '冬休み') val = { type: 'WINTER', customText: '冬', isLocked: true };
          else if (req === '夜' || req === '夜勤') val = { type: 'NIGHT', customText: '夜', isLocked: true };
          else if (req === '明' || req === '明け') val = { type: 'EARLY', customText: '明', isLocked: true };
          else if (req === '早' || req === '早番') val = { type: 'EARLY', customText: '早', isLocked: true };
          else if (req === '遅' || req === '遅番') val = { type: 'LATE', customText: '遅', isLocked: true };
        }
        else if (staff.note && (staff.note.includes('休職') || staff.note.includes('スポット勤務'))) {
          val = { type: 'OFF', customText: staff.note.includes('休職') ? '休職' : '', isLocked: true };
        }
        else {
          // 条件付き自動入力
          if ((cons.offDayOfWeek && cons.offDayOfWeek.includes(dayOfWeek)) || (cons.offHolidays && isHolidayFlag)) {
            val = { type: 'OFF', customText: '休', isLocked: true };
          } else if (cons.fixedDayOfWeek && cons.fixedDayOfWeek[dayOfWeek]) {
            val = { type: 'DAY', customText: normalizeShiftText(cons.fixedDayOfWeek[dayOfWeek]), isLocked: true };
          }
        }

        newShifts[key] = val;
      });
    });

    // 2. 夜勤自動割り当て
    for (let i = 0; i < dates.length - 1; i++) {
      const date = dates[i];
      const keySuffix = getIsoDate(date);

      const hasNight = staffList.some(s => {
        const cell = newShifts[`${s.id}_${keySuffix}`];
        return cell && (cell.type === 'NIGHT' || cell.customText === '夜');
      });

      if (!hasNight) {
        const candidates = [...nightCandidates].sort(() => 0.5 - Math.random());

        for (const staffId of candidates) {
          const staff = staffList.find(s => s.id === staffId);
          if (!staff) continue;
          if (staff.note === 'スポット勤務') continue;
          if (staff.constraints?.fixedTimeOnly) continue;
          if (staff.constraints?.forbiddenTypes?.includes('NIGHT')) continue;

          if (date.getDay() === 5 && staff.constraints?.specialRule === 'OHASHI_NIGHT_COMBO') continue;

          const d0 = date;
          const d1 = new Date(date); d1.setDate(d1.getDate() + 1);
          const d2 = new Date(date); d2.setDate(d2.getDate() + 2);

          const k0 = `${staffId}_${getIsoDate(d0)}`;
          const k1 = `${staffId}_${getIsoDate(d1)}`;
          const k2 = `${staffId}_${getIsoDate(d2)}`;

          const s0 = newShifts[k0];
          const s1 = d1 <= END_DATE ? newShifts[k1] : null;
          const s2 = d2 <= END_DATE ? newShifts[k2] : null;

          const isS0Available = !s0 || (!s0.isLocked && s0.type !== 'OFF');
          const isS1Available = !s1 || (!s1.isLocked && s1.type !== 'OFF' && s1.type !== 'HOPE' && s1.type !== 'WINTER');

          if (isS0Available && isS1Available) {
            newShifts[k0] = { type: 'NIGHT', customText: '夜', isLocked: false };
            if (s1 !== undefined) newShifts[k1] = { type: 'EARLY', customText: '明', isLocked: false };
            if (s2 !== undefined && (!s2 || !s2.isLocked)) {
              newShifts[k2] = { type: 'OFF', customText: '休', isLocked: false };
            }
            break;
          }
        }
      }
    }

    // 2.5 早番自動割り当て
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const keySuffix = getIsoDate(date);

      const hasEarly = staffList.some(s => {
        const cell = newShifts[`${s.id}_${keySuffix}`];
        return cell && (cell.customText === '早' || cell.customText === '6～15');
      });

      if (!hasEarly) {
        const availableStaff = staffList.filter(s => {
          if (s.note === 'スポット勤務' || s.note === '休職') return false;
          if (s.constraints?.fixedTimeOnly) return false;
          if (s.constraints?.forbiddenTypes?.includes('EARLY')) return false;

          const cell = newShifts[`${s.id}_${keySuffix}`];
          if (cell === null) return true;
          if (!cell.isLocked && cell.type !== 'OFF' && cell.type !== 'NIGHT' && cell.type !== 'HOPE' && cell.type !== 'WINTER' && cell.customText !== '明') return true;
          return false;
        });

        if (availableStaff.length > 0) {
          const selectedStaff = availableStaff[Math.floor(Math.random() * availableStaff.length)];
          const key = `${selectedStaff.id}_${keySuffix}`;
          newShifts[key] = { type: 'EARLY', customText: '早', isLocked: false };
        }
      }
    }

    // 4.5. 遅番バックアップロジック
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const keySuffix = getIsoDate(date);

      // 桂川or加藤が「～20」に入っているか？
      const isLateCovered = ['12', '13'].some(id => {
        const cell = newShifts[`${id}_${keySuffix}`];
        return cell && (cell.customText.includes('20') || cell.type === 'LATE');
      });

      if (!isLateCovered) {
        const backupId = (i % 2 === 0) ? '2' : '4';
        const targetId = backupId;

        const key = `${targetId}_${keySuffix}`;
        const cell = newShifts[key];
        if (!cell || (!cell.isLocked && cell.type !== 'OFF')) {
          newShifts[key] = { type: 'LATE', customText: '11～20', isLocked: false };
        } else {
          const altId = (backupId === '2') ? '4' : '2';
          const altKey = `${altId}_${keySuffix}`;
          const altCell = newShifts[altKey];
          if (!altCell || (!altCell.isLocked && altCell.type !== 'OFF')) {
            newShifts[altKey] = { type: 'LATE', customText: '11～20', isLocked: false };
          }
        }
      }
    }

    // 5. 正社員の休日確保
    staffList.forEach(staff => {
      if (!FULL_TIME_STAFF_IDS.includes(staff.id)) return;

      let currentHolidays = 0;
      dates.forEach(date => {
        const s = newShifts[`${staff.id}_${getIsoDate(date)}`];
        if (s && (s.type === 'OFF' || s.customText === '休')) currentHolidays++;
      });

      let needed = REQUIRED_HOLIDAYS_FULLTIME - currentHolidays;

      if (needed > 0) {
        const candidates = dates.filter(date => newShifts[`${staff.id}_${getIsoDate(date)}`] === null);
        const shuffled = candidates.sort(() => 0.5 - Math.random());
        for (let i = 0; i < needed && i < shuffled.length; i++) {
          const key = `${staff.id}_${getIsoDate(shuffled[i])}`;
          newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
        }
      }
    });

    // 6. 残りの空欄を埋める
    staffList.forEach(staff => {
      let specialShiftCount = 0;

      dates.forEach((date) => {
        const key = `${staff.id}_${getIsoDate(date)}`;

        if (newShifts[key] === null) {
          let consecutiveWorkDays = 0;
          for (let i = 1; i <= MAX_CONSECUTIVE_WORK_DAYS; i++) {
            const prevDate = new Date(date);
            prevDate.setDate(date.getDate() - i);
            const prevKey = `${staff.id}_${getIsoDate(prevDate)}`;
            const prevShift = newShifts[prevKey];
            if (prevShift && prevShift.type !== 'OFF' && prevShift.customText !== '休') {
              consecutiveWorkDays++;
            } else {
              break;
            }
          }

          if (consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS) {
            newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
          } else {
            const cons = staff.constraints || {};
            let text = normalizeShiftText(cons.defaultShift || '9～18');

            if (cons.randomShifts && cons.randomShifts.length > 0) {
              text = cons.randomShifts[Math.floor(Math.random() * cons.randomShifts.length)];
            }
            else if (FULL_TIME_STAFF_IDS.includes(staff.id) && !cons.fixedTimeOnly) {
              if (text === '日B' || text === '9～18') {
                if (Math.random() > 0.5) text = '日A';
              }
            }
            else if (cons.monthlyShiftCounts) {
              for (const [shiftName, count] of Object.entries(cons.monthlyShiftCounts)) {
                if (specialShiftCount < count && Math.random() > 0.8) {
                  text = shiftName;
                  specialShiftCount++;
                  break;
                }
              }
            }

            if (cons.workDaysPerWeek && Math.random() > 0.6) {
              newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
            } else if (cons.workDaysPerMonth && Math.random() > 0.8) {
              newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
            } else {
              newShifts[key] = { type: 'DAY', customText: text, isLocked: false };
            }
          }
        }
      });
    });

    return newShifts;
  } catch (e) {
    console.error("Generation Error:", e);
    return {};
  }
};
