import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Printer, User, Settings, Crown, RefreshCw, X, Save, Clock, Lock, Unlock, ZoomIn, ZoomOut, MousePointer2, AlertTriangle, Sparkles, CheckCircle2, XCircle, Loader2, ChevronLeft } from 'lucide-react';
import { useToast } from "../hooks/useToast";

import { trpcClient } from "../lib/trpc";
import { generateShiftPDF } from "../utils/ShiftPdfLogic";
import { Button } from "./ui/button";

// --- 設定定数 ---
const FACILITY_NAME = "からふる庭園 蘇原";

// ルール定数
const REQUIRED_HOLIDAYS_FULLTIME = 9; // 正社員の公休数
const MAX_CONSECUTIVE_WORK_DAYS = 4;  // 最大連勤数

// 配置基準マトリクス（曜日別・30分刻み、48分割）
// インデックス: 0=日曜, 1=月曜, ..., 6=土曜
// 各スロット: 0=0:00, 1=0:30, 2=1:00, 3=1:30, ..., 47=23:30
const REQUIRED_STAFF_BY_DAY = [
  // 日曜日 (0)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 4,4, 4,4, 4,4, 2,2, 3,3, 3,3, 3,3, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 月曜日 (1)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 8,8, 6,6, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 火曜日 (2)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 8,8, 2,2, 7,7, 6,6, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 水曜日 (3)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 8,8, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 木曜日 (4)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 6,6, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 金曜日 (5)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 7,7, 7,7, 7,7, 2,2, 6,6, 5,5, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1],
  // 土曜日 (6)
  [1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 1,1, 2,2, 3,3, 6,6, 5,5, 6,6, 2,2, 6,6, 4,4, 4,4, 3,3, 2,2, 2,2, 2,2, 1,1, 1,1, 1,1, 1,1]
];

// シフトの種類定義
const SHIFT_TYPES = {
  DAY: { id: 'D', label: '日', text: '日', color: 'text-gray-900', bgColor: 'bg-white' },
  NIGHT: { id: 'N', label: '夜', text: '夜', color: 'text-white', bgColor: 'bg-blue-900' },
  EARLY: { id: 'E', label: '早', text: '早', color: 'text-gray-900', bgColor: 'bg-sky-200' },
  LATE: { id: 'L', label: '遅', text: '遅', color: 'text-gray-900', bgColor: 'bg-green-200' },
  OFF: { id: 'X', label: '休', text: '休', color: 'text-red-600', bgColor: 'bg-red-100' },
  HOPE: { id: 'H', label: '希', text: '有', color: 'text-orange-800', bgColor: 'bg-orange-200' },
  WINTER: { id: 'W', label: '冬', text: '冬', color: 'text-blue-800', bgColor: 'bg-blue-200' },
};

const SHIFT_PRESETS = [
  { text: '日A', type: 'DAY' },
  { text: '日B', type: 'DAY' },
  { text: '休', type: 'OFF' },
  { text: '夜', type: 'NIGHT' },
  { text: '早', type: 'EARLY' },
  { text: '遅', type: 'LATE' },
  { text: '有', type: 'HOPE' },
];

const TIME_PRESETS = [
  '8～14', '8～15', '8～16', '9～15', '9～16', '9～17'
];

const WORK_PATTERNS = ['7～16', '8～17', '9～18', '11～20'];

// --- ヘルパー関数 ---
const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const getIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * 休憩時間を計算する関数
 * @param workHours 勤務時間
 * @param breakTimeMinutes 休憩時間（分単位）、undefinedの場合はデフォルトルール適用
 * @returns 休憩時間（時間単位）
 */
const calculateBreakTime = (workHours: number, breakTimeMinutes: number | undefined): number => {
  // DBから取得した休憩時間（分単位）がある場合
  if (breakTimeMinutes !== undefined && breakTimeMinutes > 0) {
    return breakTimeMinutes / 60; // 分→時間に変換
  }
  // デフォルトルール: 6時間超なら1時間
  return workHours > 6 ? 1 : 0;
};

const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
  if (!text) return null;
  if (text === '夜' || type === 'NIGHT') return { start: 16, end: 24 };
  if (text === '明') return { start: 0, end: 9 };
  if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '研修') return null;

  const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
  if (match) {
    let start = parseInt(match[1]);
    if (text.includes(match[1] + '半')) start += 0.5;
    let end = parseInt(match[2]);
    if (text.includes(match[2] + '半')) end += 0.5;
    return { start, end };
  }

  if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
  if (text === '日A') return { start: 8, end: 17 };
  if (text === '日B') return { start: 9, end: 18 };
  if (text === '早' || type === 'EARLY') return { start: 7, end: 16 };
  if (text === '遅' || type === 'LATE') return { start: 11, end: 20 };

  return { start: 9, end: 18 };
};

const formatLabel = (text: string): string => {
  if (!text) return '';
  if (text.includes('\n')) return text;

  const timeRangePattern = /([0-9]+(?:半|:[0-9]{2})?)\s*[-~～]\s*([0-9]+(?:半|:[0-9]{2})?)/;
  const match = text.match(timeRangePattern);

  if (match) {
    return `${match[1]}\n~${match[2]}`;
  }

  return text;
};

const getDisplayText = (text: string, type: string) => {
  if (!text) return '';

  if (text === '日A') return '日A';
  if (text === '日B') return '日B';
  if (text === '冬')  return '冬';
  if (text === '明')  return '明';
  if (text === '有' || text === '有給') return '有';
  if (text === '休' || text === '休職') return text;

  if (text === '遅' || (text.includes('11') && text.includes('20')) || type === 'LATE') {
    return '遅';
  }

  if (text.includes('8') && text.includes('17')) return '日A';
  if (text.includes('9') && text.includes('18')) return '日B';

  if ((text.includes('7') && text.includes('16')) && type === 'DAY') return '早';

  return formatLabel(text);
};

const calculateWorkStats = (shifts: any, staffId: string, dates: Date[], targetMonth: number, staffList: any[]): { days: number; hours: number; nightCount: number; holidays: number; paidHolidays: number } => {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let holidays = 0;
  let paidHolidays = 0;

  // 対象月のみを集計
  const targetDates = dates.filter(d => d.getMonth() + 1 === targetMonth);

  // 職員の休憩時間設定を取得（分単位）
  const staff = staffList.find(s => s.id === staffId);
  const breakTimeMinutes = staff?.breakTime;

  targetDates.forEach(date => {
    const key = `${staffId}_${getIsoDate(date)}`;
    const cell = shifts[key];
    if (!cell) return;

    const text = cell.customText;
    const type = cell.type;

    if (text === '有' || text === '有給') {
      paidHolidays++;
      return;
    }
    if (text === '休' || text === '休職' || type === 'OFF') {
      holidays++;
      return;
    }
    if (text === '') {
      return;
    }

    // 有給・休み・空白以外はすべて勤務日数にカウント（明けも含む）
    days++;

    if (text === '夜' || type === 'NIGHT') {
      nightCount++;
      hours += 15;  // 休憩2時間を引いた15時間
      return;
    }

    // 明けは勤務日数にカウント済みだが、時間計算は夜勤に含まれているのでスキップ
    if (text === '明') {
      return;
    }

    if (text === '日' || text === '日A' || text === '日B' || text === '早' || text === '遅' || text === '冬' || type === 'DAY' || type === 'EARLY' || type === 'LATE') {
      // 定型シフトは8時間固定（休憩時間は別途控除）
      const grossHours = 8;
      const breakTime = calculateBreakTime(grossHours, breakTimeMinutes);
      hours += grossHours - breakTime;
    } else {
      const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
      if (match) {
        let start = parseInt(match[1]);
        if (text.includes(match[1] + '半')) start += 0.5;
        let end = parseInt(match[2]);
        if (text.includes(match[2] + '半')) end += 0.5;

        let grossHours = end - start;
        const breakTime = calculateBreakTime(grossHours, breakTimeMinutes);
        const netHours = grossHours - breakTime;
        hours += netHours > 0 ? netHours : 0;
      } else {
        // マッチしない場合は8時間とする
        const grossHours = 8;
        const breakTime = calculateBreakTime(grossHours, breakTimeMinutes);
        hours += grossHours - breakTime;
      }
    }
  });

  return { days, hours, nightCount, holidays, paidHolidays };
};

const calculateSufficiency = (dates: Date[], shifts: any, staffList: any[], fullTimeStaffIds: string[], adminStaffIds: string[], clerkStaffId: string | null): any => {
  const results: any = {};

  dates.forEach((date, dateIdx) => {
    const dateIso = getIsoDate(date);
    const halfHourCounts = new Array(48).fill(0);
    const halfHourFullTimeCounts = new Array(48).fill(0);

    if (dateIdx > 0) {
      const prevDate = dates[dateIdx - 1];
      const prevKeySuffix = getIsoDate(prevDate);
      staffList.forEach(staff => {
        const prevCell = shifts[`${staff.id}_${prevKeySuffix}`];
        if (prevCell && (prevCell.type === 'NIGHT' || prevCell.customText === '夜')) {
          const currentCell = shifts[`${staff.id}_${dateIso}`];
          if (currentCell && currentCell.customText === '明') {
            return;
          }
          for (let slot = 0; slot < 18; slot++) {
            if (staff.id !== clerkStaffId) {
              halfHourCounts[slot]++;
            }
            if (fullTimeStaffIds.includes(staff.id)) halfHourFullTimeCounts[slot]++;
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

      const startSlot = Math.floor(start * 2);
      const endSlot = Math.floor(end * 2);

      for (let slot = startSlot; slot < endSlot; slot++) {
        if (slot >= 0 && slot < 48) {
          if (staff.id !== clerkStaffId) {
            const isAdminInOfficeHours = adminStaffIds.includes(staff.id) && slot >= 18 && slot < 32;
            if (!isAdminInOfficeHours) {
              halfHourCounts[slot]++;
            }
          }
          if (fullTimeStaffIds.includes(staff.id)) halfHourFullTimeCounts[slot]++;
          if (staff.id === clerkStaffId && slot >= 18 && slot < 36) halfHourFullTimeCounts[slot]++;
        }
      }
    });

    const shortageDetails: string[] = [];
    let maxShortage = 0;

    const dayOfWeek = date.getDay();
    const requiredForDay = REQUIRED_STAFF_BY_DAY[dayOfWeek];

    for (let slot = 0; slot < 48; slot++) {
      const hour = Math.floor(slot / 2);
      const minute = (slot % 2) === 0 ? '00' : '30';
      const timeLabel = `${hour}:${minute}`;

      let required = requiredForDay[slot] || 1;
      let current = halfHourCounts[slot];
      let diff = current - required;

      if (slot >= 18 && slot < 32) {
        if (halfHourFullTimeCounts[slot] < 1) {
          shortageDetails.push(`${timeLabel}:正社員不足`);
          maxShortage = Math.max(maxShortage, 2);
        }
      }

      if (diff < 0) {
        shortageDetails.push(`${timeLabel}(${diff})`);
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

// --- コンポーネント本体 ---
interface ShiftGenerationProps {
  year: number;
  month: number;
  initialShiftId?: number | null;
  onBack?: () => void;
}

export function ShiftGeneration({ year, month, initialShiftId, onBack }: ShiftGenerationProps) {
  const toast = useToast();

  // 日付範囲を計算
  // 12月のみ翌月5日まで（夜勤対応）、その他の月は月末まで
  const { startDate, endDate, dates } = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    // 12月の場合は翌1月5日まで、それ以外は月末まで
    const end = month === 12
      ? new Date(year + 1, 0, 5)  // 12月 → 翌年1月5日
      : new Date(year, month, 0);  // その他 → 月末日
    return { startDate: start, endDate: end, dates: generateDateRange(start, end) };
  }, [year, month]);

  const eventRowHeight = 60;

  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [shifts, setShifts] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  const [loadedShiftId, setLoadedShiftId] = useState<number | null>(null);
  const [loadedShiftName, setLoadedShiftName] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [printPreview, setPrintPreview] = useState(false);
  const [editLockEnabled, setEditLockEnabled] = useState(true);
  const [zoom, setZoom] = useState(1.0);

  // 実際の稼働シフトモード
  const [actualOperationMode, setActualOperationMode] = useState(false);
  const [originalShifts, setOriginalShifts] = useState<any>({});

  // カスタム行事予定
  const [customEvents, setCustomEvents] = useState<Record<string, string>>({});
  const [editingEventDate, setEditingEventDate] = useState<string | null>(null);
  const [editingEventValue, setEditingEventValue] = useState<string>('');

  // 検食欄（日付ごと）
  const [inspectionMeals, setInspectionMeals] = useState<Record<string, string>>({});
  const [editingMealDate, setEditingMealDate] = useState<string | null>(null);
  const [editingMealValue, setEditingMealValue] = useState<string>('');

  // フッターコメント欄
  const [footerComment, setFooterComment] = useState<string>('');

  // AI Check state
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  const [contextMenu, setContextMenu] = useState<any>(null);

  const [popoverState, setPopoverState] = useState<any>({
    isOpen: false,
    staffId: null,
    date: null,
    dateStr: null,
    staffName: '',
    targetRect: null,
    currentValue: null
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<'overwrite' | 'new'>('new');
  const [lateShiftWarnings, setLateShiftWarnings] = useState<string[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // 正社員ID、管理者ID、事務員IDを計算（DBから取得したデータに基づく）
  const { fullTimeStaffIds, adminStaffIds, clerkStaffId } = useMemo(() => {
    const fullTime = staffList.filter(s => s.role === 'fulltime').map(s => s.id);
    const admin = staffList.filter(s => s.isServiceManager).map(s => s.id);
    const clerk = staffList.find(s => s.isOfficeStaff)?.id || null;
    return { fullTimeStaffIds: fullTime, adminStaffIds: admin, clerkStaffId: clerk };
  }, [staffList]);

  // 職員データの読み込み
  useEffect(() => {
    const loadStaffData = async () => {
      try {
        setIsLoadingStaff(true);
        const employees = await trpcClient.employees.list.query();

        const sorted = [...employees].sort((a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );

        const staffData = sorted.map(emp => ({
          id: emp.id.toString(),
          name: emp.name,
          role: emp.positionGroup?.employmentType === 'fulltime' ? 'fulltime' : 'parttime',
          qualification: emp.positionGroup?.name || '',
          employeeDbId: emp.id,
          positionGroupId: emp.positionGroupId,
          isServiceManager: emp.isServiceManager,
          isOfficeStaff: emp.isOfficeStaff,
          breakTime: emp.breakTime || 60, // DBから取得（分単位）、デフォルト60分
          schedule: {},
          constraints: {
            defaultShift: '9～18',
          },
        }));

        setStaffList(staffData);
        console.log(`[ShiftGeneration] Loaded ${staffData.length} employees`);
        console.log('[ShiftGeneration] Employee IDs in staffList:', staffData.map(s => s.employeeDbId).sort((a, b) => a - b));
      } catch (error) {
        console.error('Failed to load staff data:', error);
        toast.error('職員データの読み込みに失敗しました');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    loadStaffData();
  }, []);

  // 希望休・勤務希望の読み込みと反映
  useEffect(() => {
    if (staffList.length === 0 || isLoadingStaff) return;
    if (initialShiftId) return;

    const loadPreferences = async () => {
      try {
        const startDateStr = getIsoDate(startDate);
        const endDateStr = getIsoDate(endDate);

        const leaveRequests = await trpcClient.leaveRequests.getByDateRange.query({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        const workPrefs = await trpcClient.workPreferences.getByDateRange.query({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        const newShifts: any = {};

        for (const req of leaveRequests) {
          const staff = staffList.find(s => s.employeeDbId === req.employeeId);
          if (!staff) continue;

          const reqStart = new Date(req.startDate);
          const reqEnd = new Date(req.endDate);
          for (let d = new Date(reqStart); d <= reqEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = getIsoDate(d);
            if (d >= startDate && d <= endDate) {
              const key = `${staff.id}_${dateStr}`;
              newShifts[key] = {
                type: 'OFF',
                customText: req.leaveType || '休',
                isLocked: true,
                editedInActualMode: false,
              };
            }
          }
        }

        for (const pref of workPrefs) {
          const staff = staffList.find(s => s.employeeDbId === pref.employeeId);
          if (!staff) continue;

          const prefStart = new Date(pref.startDate);
          const prefEnd = new Date(pref.endDate);
          for (let d = new Date(prefStart); d <= prefEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = getIsoDate(d);
            if (d >= startDate && d <= endDate) {
              const key = `${staff.id}_${dateStr}`;

              const reason = pref.reason || '';
              let shiftType = 'WORK';
              let customText = '';

              if (reason === '夜勤' || reason === '夜') {
                shiftType = 'NIGHT';
                customText = '夜';
              } else if (reason === '明け' || reason === '明') {
                shiftType = 'EARLY';
                customText = '明';
              } else {
                const startHour = parseInt(pref.startTime.split(':')[0]);
                const endHour = parseInt(pref.endTime.split(':')[0]);
                customText = `${startHour}～${endHour}`;
              }

              newShifts[key] = {
                type: shiftType,
                customText: customText,
                isLocked: true,
                editedInActualMode: false,
              };
            }
          }
        }

        if (Object.keys(newShifts).length > 0) {
          // 既存のシフトデータとマージ（前月コピーなど既存データを保持）
          setShifts(prev => ({ ...prev, ...newShifts }));
          setOriginalShifts(prev => ({ ...prev, ...newShifts }));
          toast.info(`${leaveRequests.length}件の希望休、${workPrefs.length}件の勤務希望を反映しました`);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, [staffList, isLoadingStaff, startDate, endDate, initialShiftId]);

  // 前月シフトから当月1～5日をコピー（夜勤連続性のため）
  useEffect(() => {
    if (staffList.length === 0 || isLoadingStaff) return;
    if (initialShiftId) return; // 新規作成時のみ

    const loadPreviousMonthCarryover = async () => {
      try {
        // 前月を計算
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;

        console.log(`[ShiftGeneration] Checking for previous month shift: ${prevYear}年${prevMonth}月`);

        // 前月のシフトを取得（更新日時で最新のものを使用）
        const allShifts = await trpcClient.shifts.list.query();
        const prevMonthShifts = allShifts
          .filter(s => s.year === prevYear && s.month === prevMonth)
          .sort((a, b) => {
            // updatedAtで降順ソート（最新が先頭）
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
          });

        if (prevMonthShifts.length === 0) {
          console.log('[ShiftGeneration] No previous month shift found');
          return;
        }

        const prevShift = prevMonthShifts[0];
        console.log(`[ShiftGeneration] Found previous shift: ${prevShift.name} (ID: ${prevShift.id}, 更新: ${new Date(prevShift.updatedAt).toLocaleString('ja-JP')})`);

        // 前月シフトの詳細を取得
        const prevShiftData = await trpcClient.shifts.getById.query({ id: prevShift.id });
        if (!prevShiftData || !prevShiftData.shiftDetails) {
          console.log('[ShiftGeneration] No shift details in previous shift');
          return;
        }

        // 当月1～5日の日付文字列を生成
        const carryoverDates = Array.from({ length: 5 }, (_, i) => {
          const d = new Date(year, month - 1, i + 1);
          return getIsoDate(d);
        });

        console.log('[ShiftGeneration] Carryover dates:', carryoverDates);

        const carryoverShifts: any = {};
        let copiedCount = 0;
        let skippedCount = 0;
        const skippedEmployees = new Set<number>();

        console.log(`[ShiftGeneration] staffList count: ${staffList.length}`);
        console.log(`[ShiftGeneration] Previous shift details count: ${prevShiftData.shiftDetails.length}`);

        // 前月シフトから当月1～5日分のemployeeIdを抽出
        const prevShiftEmployeeIds = [...new Set(
          prevShiftData.shiftDetails
            .filter(d => carryoverDates.includes(d.date))
            .map(d => d.employeeId)
        )].sort((a, b) => a - b);

        console.log('[ShiftGeneration] Employee IDs in previous shift (days 1-5):', prevShiftEmployeeIds);
        console.log('[ShiftGeneration] Current staffList employee IDs:', staffList.map(s => s.employeeDbId).sort((a, b) => a - b));

        // どのemployeeIdがstaffListにないか確認
        const missingIds = prevShiftEmployeeIds.filter(id => !staffList.some(s => s.employeeDbId === id));
        if (missingIds.length > 0) {
          console.error('[ShiftGeneration] ⚠️  Missing employee IDs in staffList:', missingIds);
        }

        // 前月シフトから当月1～5日のデータを抽出
        for (const detail of prevShiftData.shiftDetails) {
          if (!carryoverDates.includes(detail.date)) continue;

          const staff = staffList.find(s => s.employeeDbId === detail.employeeId);
          if (!staff) {
            skippedCount++;
            skippedEmployees.add(detail.employeeId);
            console.warn(`[ShiftGeneration] Employee not found in staffList: employeeId=${detail.employeeId}, date=${detail.date}`);
            continue;
          }

          const key = `${staff.id}_${detail.date}`;
          const customText = detail.displayText || '';

          // 休暇・休日の場合
          if (detail.status === 'leave') {
            carryoverShifts[key] = {
              type: 'OFF',
              customText: customText || '休',
              isLocked: true, // ロックして編集不可
              editedInActualMode: false,
            };
          }
          // 勤務の場合
          else if (detail.status === 'working') {
            carryoverShifts[key] = {
              type: 'WORK',
              customText: customText,
              isLocked: true, // ロックして編集不可
              editedInActualMode: false,
            };
          }

          copiedCount++;
        }

        if (skippedCount > 0) {
          console.error(`[ShiftGeneration] ⚠️  ${skippedCount}件のデータをスキップ（職員マッチング失敗）`);
          console.error(`[ShiftGeneration] スキップされた職員ID:`, Array.from(skippedEmployees));
          toast.error(`警告: ${skippedCount}件のデータがコピーできませんでした（職員マッチング失敗）`);
        }

        if (copiedCount > 0) {
          console.log(`[ShiftGeneration] Copied ${copiedCount} cells from previous month (1～5日)`);
          // 前月データを優先（既存データの上に上書き）
          setShifts(prev => ({ ...prev, ...carryoverShifts }));
          setOriginalShifts(prev => ({ ...prev, ...carryoverShifts }));

          const message = skippedCount > 0
            ? `前月シフトから${copiedCount}件コピー（${skippedCount}件スキップ、職員データ確認が必要）`
            : `前月シフトから${copiedCount}件のデータをコピーしました（1～5日、ロック済み）`;
          toast.info(message, { duration: 6000 });
        }
      } catch (error) {
        console.error('[ShiftGeneration] Failed to load previous month carryover:', error);
        // エラーでも処理を続行（前月データがないだけかもしれない）
      }
    };

    loadPreviousMonthCarryover();
  }, [staffList, isLoadingStaff, year, month, initialShiftId]);

  // 初期シフトデータの読み込み
  useEffect(() => {
    if (!initialShiftId || initialShiftId === loadedShiftId) return;
    if (staffList.length === 0 || isLoadingStaff) return;

    const loadInitialShiftData = async () => {
      try {
        setIsLoadingInitialData(true);
        console.log('[ShiftGeneration] Loading shift data for ID:', initialShiftId);

        const shiftData = await trpcClient.shifts.getById.query({ id: initialShiftId });
        console.log('[ShiftGeneration] Shift data loaded:', shiftData);

        if (!shiftData || !shiftData.shiftDetails || shiftData.shiftDetails.length === 0) {
          console.error('[ShiftGeneration] No shift details found');
          toast.error("シフトデータが見つかりませんでした");
          setLoadedShiftId(initialShiftId);
          return;
        }

        setLoadedShiftName(shiftData.name || "");

        const newShifts: any = {};
        let matchedCount = 0;

        for (const detail of shiftData.shiftDetails) {
          const staff = staffList.find(s => s.employeeDbId === detail.employeeId);
          if (!staff) continue;

          matchedCount++;
          const key = `${staff.id}_${detail.date}`;

          let customText = '';
          if (detail.displayText) {
            customText = detail.displayText;
          } else if (detail.status === 'off') {
            customText = detail.leaveType || '';
          } else if (detail.timeSlot) {
            customText = detail.timeSlot.displayLabel || detail.timeSlot.name || '';
          } else if (detail.startTime && detail.endTime) {
            const start = detail.startTime.substring(0, 5);
            const end = detail.endTime.substring(0, 5);
            const startHour = parseInt(start.split(':')[0]);
            const startMin = start.split(':')[1];
            const endHour = parseInt(end.split(':')[0]);
            const startStr = startMin === '30' ? `${startHour}半` : `${startHour}`;
            customText = `${startStr}～${endHour}`;
          }

          const isLocked = detail.generatedBy === 'leave_request' || detail.generatedBy === 'work_preference';

          newShifts[key] = {
            type: detail.status === 'off' ? 'OFF' : 'WORK',
            customText: customText,
            backgroundColor: undefined,
            isLocked: isLocked,
            editedInActualMode: detail.editedInActualMode || false,
          };
        }

        console.log('[ShiftGeneration] Matched:', matchedCount);
        setShifts(newShifts);
        setOriginalShifts(JSON.parse(JSON.stringify(newShifts)));
        setLoadedShiftId(initialShiftId);
        toast.success(`シフトデータを読み込みました (${shiftData.name})`);
      } catch (error: any) {
        console.error("[ShiftGeneration] Failed to load initial shift data:", error);
        toast.error("シフトデータの読み込みに失敗しました", { description: error.message });
        setLoadedShiftId(initialShiftId);
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    loadInitialShiftData();
  }, [initialShiftId, staffList, isLoadingStaff, loadedShiftId]);

  // スクロール監視
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolledLeft(container.scrollLeft > 20);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 勤務統計計算
  const staffStats = useMemo(() => {
    const stats: any = {};
    staffList.forEach(staff => {
      stats[staff.id] = calculateWorkStats(shifts, staff.id, dates, month, staffList);
    });
    return stats;
  }, [shifts, staffList, dates, month]);

  // 配置充足度計算
  const sufficiencyData = useMemo(() => {
    return calculateSufficiency(dates, shifts, staffList, fullTimeStaffIds, adminStaffIds, clerkStaffId);
  }, [dates, shifts, staffList, fullTimeStaffIds, adminStaffIds, clerkStaffId]);

  // ロックされていないセルを一括クリア
  const handleClearUnlockedCells = () => {
    setShifts((prevShifts: any) => {
      const newShifts = { ...prevShifts };
      let clearedCount = 0;

      for (const key in newShifts) {
        const cell = newShifts[key];
        if (!cell.isLocked) {
          newShifts[key] = {
            type: 'OFF',
            customText: '',
            backgroundColor: undefined,
            isLocked: false,
            editedInActualMode: false,
          };
          clearedCount++;
        }
      }

      toast.success(`${clearedCount}件のセルをクリアしました`);
      return newShifts;
    });
    setIsClearModalOpen(false);
  };

  // 保存処理
  const handleSaveToDB = async () => {
    if (!saveName) {
      toast.error("保存名を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const entries = [];
      for (const staff of staffList) {
        for (const date of dates) {
          const key = `${staff.id}_${getIsoDate(date)}`;
          const cell = shifts[key];
          if (cell && !(cell.type === 'OFF' && !cell.customText)) {
            entries.push({
              employeeName: staff.name,
              date: getIsoDate(date),
              type: cell.type === 'OFF' ? 'holiday' : 'work',
              text: cell.customText,
              isLocked: cell.isLocked || false,
              editedInActualMode: cell.editedInActualMode || false,
            });
          }
        }
      }

      if (entries.length === 0) {
        toast.error("保存するシフトデータがありません");
        setIsSaving(false);
        return;
      }

      let result;
      if (saveMode === 'overwrite' && loadedShiftId) {
        result = await trpcClient.shifts.saveStandalone.mutate({
          year: year,
          month: month,
          name: saveName,
          entries: entries,
          overwriteShiftId: loadedShiftId
        });
        toast.success(`シフトを上書き保存しました (${entries.length}件)`);
      } else {
        result = await trpcClient.shifts.saveStandalone.mutate({
          year: year,
          month: month,
          name: saveName,
          entries: entries
        });
        toast.success(`シフトを保存しました (${entries.length}件)`);

        if (result && result.shiftId) {
          setLoadedShiftId(result.shiftId);
          setLoadedShiftName(saveName);
        }
      }

      setIsSaveModalOpen(false);
    } catch (error: any) {
      console.error('[ShiftGeneration] Save failed:', error);
      toast.error("保存に失敗しました", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverwriteSave = () => {
    if (loadedShiftId && loadedShiftName) {
      setSaveMode('overwrite');
      setSaveName(loadedShiftName);
      setIsSaveModalOpen(true);
    } else {
      const defaultName = `${month}月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_${Math.floor(Math.random() * 1000)}`;
      setSaveMode('overwrite');
      setSaveName(defaultName);
      setIsSaveModalOpen(true);
    }
  };

  const handleNewSave = () => {
    const defaultName = `${month}月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_${Math.floor(Math.random() * 1000)}`;
    setSaveMode('new');
    setSaveName(defaultName);
    setIsSaveModalOpen(true);
  };

  // PDF出力
  const handlePrint = async () => {
    try {
      toast.info("PDF生成を開始します...");
      await generateShiftPDF(
        `${year}年${month}月シフト表`,
        FACILITY_NAME,
        dates,
        staffList,
        shifts,
        staffStats
      );
      toast.success("PDFを生成しました");
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error("PDF生成に失敗しました", { description: error.message });
    }
  };

  // セルクリック
  const handleCellClick = (e: React.MouseEvent, staff: any, date: Date) => {
    const key = `${staff.id}_${getIsoDate(date)}`;
    const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

    if (editLockEnabled && cellData.isLocked) {
      toast.info("このセルはロックされています");
      return;
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverState({
      isOpen: true,
      staffId: staff.id,
      date,
      dateStr: getIsoDate(date),
      staffName: staff.name,
      targetRect: rect,
      currentValue: cellData
    });
  };

  // 右クリックメニュー
  const handleContextMenu = (e: React.MouseEvent, staff: any, date: Date) => {
    e.preventDefault();
    const key = `${staff.id}_${getIsoDate(date)}`;
    const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

    if (editLockEnabled && cellData.isLocked) {
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      staffId: staff.id,
      date,
    });
  };

  // クイックシフト適用（コンテキストメニュー用）
  const applyQuickShift = (type: string, text: string) => {
    if (!contextMenu) return;

    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;
    const isNightShift = text === '夜';

    const prevCell = shifts[key];
    const originalCell = originalShifts[key];
    const isRevertedToOriginal = originalCell && originalCell.customText === text;

    setShifts((prev: any) => {
      const updated = {
        ...prev,
        [key]: {
          type,
          customText: text,
          isLocked: false,
          editedInActualMode: isRevertedToOriginal ? false : (actualOperationMode && !isNightShift)
        }
      };

      const nextDay = new Date(contextMenu.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${contextMenu.staffId}_${getIsoDate(nextDay)}`;
      const nextDayCell = prev[nextDayKey];

      if (isNightShift) {
        if (!nextDayCell || nextDayCell.type === 'OFF' || !nextDayCell.customText || nextDayCell.customText === '休') {
          updated[nextDayKey] = {
            type: 'DAY',
            customText: '明',
            isLocked: false,
            editedInActualMode: actualOperationMode
          };
        }
      } else if (prevCell && (prevCell.customText === '夜' || prevCell.type === 'NIGHT')) {
        if (nextDayCell && nextDayCell.customText === '明') {
          updated[nextDayKey] = { type: 'OFF', customText: '', isLocked: false, editedInActualMode: false };
        }
      }

      return updated;
    });

    setContextMenu(null);
  };

  // 管理権限でロック
  const applyAdminLock = () => {
    if (!contextMenu) return;
    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;

    setShifts((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLocked: true
      }
    }));

    toast.success("管理権限でロックしました");
    setContextMenu(null);
  };

  // ポップオーバー閉じる
  const closePopover = () => {
    setPopoverState((prev: any) => ({ ...prev, isOpen: false }));
  };

  // シフト変更保存
  const saveShiftChange = (newVal: { type: string; customText: string }) => {
    const key = `${popoverState.staffId}_${getIsoDate(popoverState.date)}`;
    const isNightShift = newVal.customText === '夜';

    const prevCell = shifts[key];
    const originalCell = originalShifts[key];
    const isRevertedToOriginal = originalCell && originalCell.customText === newVal.customText;
    const shouldMarkEdited = actualOperationMode && !isNightShift;

    setShifts((prev: any) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          ...newVal,
          editedInActualMode: isRevertedToOriginal ? false : (shouldMarkEdited ? true : prev[key]?.editedInActualMode)
        }
      };

      const nextDay = new Date(popoverState.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${popoverState.staffId}_${getIsoDate(nextDay)}`;
      const nextDayCell = prev[nextDayKey];

      if (isNightShift) {
        if (!nextDayCell || nextDayCell.type === 'OFF' || !nextDayCell.customText || nextDayCell.customText === '休') {
          updated[nextDayKey] = {
            type: 'DAY',
            customText: '明',
            isLocked: false,
            editedInActualMode: actualOperationMode
          };
        }
      } else if (prevCell && (prevCell.customText === '夜' || prevCell.type === 'NIGHT')) {
        if (nextDayCell && nextDayCell.customText === '明') {
          updated[nextDayKey] = { type: 'OFF', customText: '', isLocked: false, editedInActualMode: false };
        }
      }

      return updated;
    });

    closePopover();
  };

  // クリックアウトサイド処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverState.isOpen && !(event.target as Element).closest('.shift-popover') && !(event.target as Element).closest('td')) {
        closePopover();
      }
      if (contextMenu && !(event.target as Element).closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverState.isOpen, contextMenu]);

  // 曜日スタイル
  const getDayStyle = (day: number) => {
    if (day === 0) return { color: '#b91c1c', backgroundColor: '#fef2f2' };
    if (day === 6) return { color: '#1d4ed8', backgroundColor: '#eff6ff' };
    return { color: '#334155', backgroundColor: '#f1f5f9' };
  };

  // ローディング表示
  if (isLoadingStaff) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-muted-foreground">職員データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-100 font-sans text-sm ${printPreview ? 'print-preview-mode' : ''} flex flex-col h-full`}>

      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl text-center border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">AI シフト生成中</h2>
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
              <Settings className="animate-spin text-indigo-600 relative z-10" size={56} />
            </div>
            <p className="text-slate-600 mb-6 font-medium text-lg">{loadingStage}</p>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {isLoadingInitialData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl text-center border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">シフトデータ読み込み中</h2>
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <Loader2 className="animate-spin text-blue-600 relative z-10" size={56} />
            </div>
            <p className="text-slate-600 mb-6 font-medium text-lg">保存されたシフトを読み込んでいます...</p>
          </div>
        </div>
      )}

      {/* 右クリックメニュー */}
      {contextMenu && (
        <div
          className="context-menu fixed z-50 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-48 animate-in fade-in zoom-in-95 duration-75"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="text-xs font-bold text-slate-400 px-3 py-1 border-b border-slate-100 mb-1">
            クイック選択
          </div>
          {[
            { label: '日 (通常)', type: 'DAY', text: '日' },
            { label: '休 (公休)', type: 'OFF', text: '休' },
            { label: '夜 (夜勤)', type: 'NIGHT', text: '夜' },
            { label: '明 (明け)', type: 'EARLY', text: '明' },
            { label: '日A (8-17)', type: 'DAY', text: '日A' },
            { label: '日B (9-18)', type: 'DAY', text: '日B' },
            { label: '有 (有給)', type: 'HOPE', text: '有' },
            { label: '早 (早番)', type: 'EARLY', text: '早' },
          ].map((item) => (
            <button
              key={item.text}
              onClick={() => applyQuickShift(item.type, item.text)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${item.text === '休' ? 'bg-red-400' :
                item.text === '夜' ? 'bg-yellow-400' :
                  item.text === '日A' ? 'bg-pink-300' :
                    item.text === '日B' ? 'bg-sky-300' :
                      'bg-slate-300'
                }`}></span>
              {item.label}
            </button>
          ))}
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={applyAdminLock}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-yellow-50 text-yellow-700 hover:text-yellow-800 transition-colors flex items-center gap-2 font-semibold"
          >
            <Lock className="w-3 h-3" />
            管理権限でロック
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            onClick={() => applyQuickShift('OFF', '')}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-bold"
          >
            クリア
          </button>
        </div>
      )}

      {/* ポップオーバー */}
      {popoverState.isOpen && popoverState.targetRect && popoverState.date && (() => {
        const POPOVER_HEIGHT = 450;
        const POPOVER_WIDTH = 320;

        // fixed positioning uses viewport coordinates (no scroll offset needed)
        const popoverLeft = popoverState.targetRect.right + 12;
        const showOnLeft = (popoverState.targetRect.right + POPOVER_WIDTH + 12) > window.innerWidth;
        const adjustedLeft = showOnLeft
          ? popoverState.targetRect.left - POPOVER_WIDTH - 12
          : popoverLeft;

        const cellCenterY = popoverState.targetRect.top + popoverState.targetRect.height / 2;
        const popoverTop = cellCenterY - POPOVER_HEIGHT / 2;
        const adjustedTop = Math.max(10, Math.min(popoverTop, window.innerHeight - POPOVER_HEIGHT - 10));
        const arrowOffset = Math.max(20, Math.min(cellCenterY - adjustedTop, POPOVER_HEIGHT - 20));

        return (
          <div
            className="shift-popover fixed z-50 bg-white border-2 border-indigo-300 shadow-2xl rounded-xl p-5 w-80 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-indigo-100"
            style={{
              top: adjustedTop,
              left: adjustedLeft,
            }}
          >
            <div className={`absolute w-4 h-4 bg-white border-indigo-300 transform rotate-45 ${
              showOnLeft
                ? '-right-2 border-r-2 border-t-2'
                : '-left-2 border-l-2 border-b-2'
            }`} style={{ top: `${arrowOffset}px` }}></div>
          <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Clock size={18} className="text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-base leading-tight">
                  {popoverState.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-sm text-slate-600 font-medium">{popoverState.staffName}</span>
              </div>
            </div>
            <button onClick={closePopover} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">基本シフト</label>
              <div className="grid grid-cols-4 gap-2">
                {SHIFT_PRESETS.map(p => (
                  <button
                    key={p.text}
                    onClick={() => saveShiftChange({ type: p.type, customText: p.text })}
                    className={`text-sm py-2.5 rounded-lg font-bold transition-all border-2 ${popoverState.currentValue.customText === p.text
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                      : p.text === '休'
                        ? 'bg-white border-slate-300 text-red-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">時間指定</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_PRESETS.map(t => (
                  <button
                    key={t}
                    onClick={() => saveShiftChange({ type: 'DAY', customText: t })}
                    className={`text-xs py-2 px-2 rounded-lg font-bold transition-all border-2 whitespace-nowrap ${popoverState.currentValue.customText === t
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">カスタム入力</label>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    id="custom-shift-input"
                    type="text"
                    className="w-full border-2 border-slate-300 rounded-lg pl-3 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    placeholder="入力..."
                    defaultValue={popoverState.currentValue.customText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveShiftChange({ type: 'DAY', customText: (e.target as HTMLInputElement).value });
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.getElementById('custom-shift-input') as HTMLInputElement;
                    if (input && input.value) {
                      saveShiftChange({ type: 'DAY', customText: input.value });
                    }
                  }}
                  className="px-4 py-2.5 border-2 border-emerald-500 bg-emerald-50 rounded-lg text-sm font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600 transition-all"
                >
                  カスタム保存
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => saveShiftChange({ type: 'OFF', customText: '' })}
                  className="px-6 py-2 border-2 border-red-300 bg-red-50 rounded-lg text-sm font-bold text-red-600 hover:bg-red-100 hover:border-red-400 transition-all"
                >
                  クリア
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ヘッダー */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-30 print:hidden shadow-lg flex-none h-20">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft size={14} />
              戻る
            </button>
          )}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/10">
            <Calendar size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              シフト管理 <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono border border-slate-700">PRO</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <span>{year}年{month}月度</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>{FACILITY_NAME}</span>
            </p>
            {loadedShiftName && (
              <p className="text-sm font-medium mt-1.5 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-bold text-xs">
                  編集中
                </span>
                <span className="text-green-400 font-bold text-base">{loadedShiftName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 実際の稼働シフトモード切替ボタン */}
          <button
            onClick={() => setActualOperationMode(!actualOperationMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${actualOperationMode
              ? 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-lg shadow-yellow-400/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-yellow-500 hover:text-slate-900 hover:border-yellow-600'
            }`}
          >
            <input
              type="checkbox"
              checked={actualOperationMode}
              onChange={() => {}}
              className="w-4 h-4 accent-yellow-600"
            />
            実際の稼働シフト
          </button>

          <div className="h-8 w-px bg-slate-800 mx-1"></div>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border bg-slate-800 text-slate-300 border-slate-700 hover:bg-red-900 hover:text-white hover:border-red-700"
          >
            <X size={14} />
            クリア
          </button>

          <button
            onClick={() => setEditLockEnabled(!editLockEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${editLockEnabled
              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              : 'bg-rose-900/30 text-rose-400 border-rose-900/50 hover:bg-rose-900/50 animate-pulse'
              }`}
          >
            {editLockEnabled ? <Lock size={14} /> : <Unlock size={14} />}
            {editLockEnabled ? '保護中' : '編集可'}
          </button>

          <button
            onClick={handleOverwriteSave}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-slate-900 rounded-xl hover:bg-yellow-400 transition-all shadow-lg hover:shadow-xl text-base font-bold border-2 border-yellow-600"
          >
            <Save size={18} />
            {loadedShiftId ? '上書き保存' : '保存'}
          </button>

          <button
            onClick={handleNewSave}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl text-base font-bold border-2 border-green-700"
          >
            <Save size={18} />
            新しく保存
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl text-base font-bold border-2 border-red-700"
          >
            <Printer size={20} />
            PDF出力
          </button>
        </div>
      </header>

      <main
        ref={scrollContainerRef}
        className="flex-1 bg-slate-100 relative overflow-auto"
      >
        <div style={!printPreview ? { zoom: zoom, width: 'fit-content' } : { width: '100%', height: '100%', margin: 0, padding: 0 }} className={`bg-white shadow-2xl shadow-slate-300/50 print:shadow-none mx-auto rounded-xl border border-slate-300 print:border-none ${printPreview ? 'p-0 mt-0 mb-0 mx-0' : 'p-10 mt-8 mb-8'} print:p-0 print:m-0`}>

          <div className="mb-6 border-b-2 border-slate-800 pb-4 print:mb-2 print:hidden">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-widest mb-2">
                  {year}年{month}月　{FACILITY_NAME}　勤務表
                </h1>
                <p className="text-xs text-slate-500 font-medium ml-1">SHIFT SCHEDULE TABLE</p>
              </div>
              <div className="text-xs text-right">
                <table className="border-collapse border border-slate-400 inline-table mr-4 shadow-sm bg-white">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 px-4 py-1.5 bg-slate-100 font-bold text-slate-600">作成日</td>
                      <td className="border border-slate-400 px-4 py-1.5 font-mono text-slate-700">{new Date().toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="grid-wrapper" className={`shift-print-root print:overflow-visible print:h-auto ${printPreview ? 'overflow-visible m-0 p-0 w-full h-auto flex justify-center' : 'h-auto'}`}>
            <table className="min-w-max text-center border-collapse border border-slate-900 text-lg print:text-[8px] font-serif leading-tight relative table-auto mx-auto print:mx-0 print:table-fixed">
              <thead>
                <tr className="bg-slate-50 print:bg-transparent" style={{ height: `${eventRowHeight}px` }}>
                  <th className="border border-slate-600 font-bold bg-white text-slate-700 w-30 min-w-[280px]" colSpan={2}>
                    行事予定
                  </th>

                  {dates.map(date => {
                    const dateStr = getIsoDate(date);
                    const isEditing = editingEventDate === dateStr;
                    const eventText = customEvents[dateStr] || '';

                    return (
                      <td
                        key={date.toString()}
                        className="border border-slate-600 text-[9px] text-slate-700 font-medium p-0.5 bg-slate-50 print:bg-transparent !w-[50px] !min-w-[50px] !max-w-[50px] cursor-pointer hover:bg-blue-50 print:cursor-default"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        onClick={() => {
                          if (!isEditing) {
                            setEditingEventDate(dateStr);
                            setEditingEventValue(eventText);
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingEventValue}
                            onChange={(e) => setEditingEventValue(e.target.value)}
                            onBlur={() => {
                              setCustomEvents(prev => ({ ...prev, [dateStr]: editingEventValue }));
                              setEditingEventDate(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setCustomEvents(prev => ({ ...prev, [dateStr]: editingEventValue }));
                                setEditingEventDate(null);
                              } else if (e.key === 'Escape') {
                                setEditingEventDate(null);
                              }
                            }}
                            autoFocus
                            className="w-full h-full text-[9px] text-center border-none outline-none bg-blue-100 p-0"
                            style={{ writingMode: 'horizontal-tb' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center leading-tight">
                            {eventText || <span className="text-slate-300">+</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <th className="border border-slate-600 bg-slate-100 print:hidden" colSpan={5}></th>
                </tr>

                <tr className="bg-slate-100 print:bg-transparent h-12 sticky top-0 z-20 shadow-md">
                  <th className="border border-slate-600 p-1 w-30 min-w-[150px] bg-white print:bg-white font-bold text-slate-800 sticky left-0 top-0 z-30 shadow-lg border-r border-b-2 border-r-slate-600 border-b-slate-700">氏名</th>
                  <th className="border border-slate-600 p-1 w-24 min-w-[130px] bg-white print:bg-white font-bold text-slate-800 sticky left-[150px] top-0 z-30 shadow-lg border-r-2 border-b-2 border-r-slate-700 border-b-slate-700">資格</th>

                  {dates.map(date => {
                    const day = date.getDay();
                    const style = getDayStyle(day);
                    return (
                      <th key={date.toString()} className="border border-slate-600 !w-[50px] !min-w-[50px] !max-w-[50px] sticky top-0 z-20" style={{ ...style, borderBottomWidth: '2px' }}>
                        <div className="flex flex-col justify-center h-full">
                          <span className="text-sm font-bold font-mono">{date.getDate()}</span>
                          <span className="text-[10px] font-bold opacity-70">
                            {['日', '月', '火', '水', '木', '金', '土'][day]}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="border border-slate-600 !w-[60px] !min-w-[60px] !max-w-[60px] bg-indigo-50 text-indigo-900 font-bold border-l-2 border-l-slate-800 print:hidden px-1 sticky top-0 z-20 text-xs">日数</th>
                  <th className="border border-slate-600 !w-[60px] !min-w-[60px] !max-w-[60px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-1 sticky top-0 z-20 text-xs">時間</th>
                  <th className="border border-slate-600 !w-[60px] !min-w-[60px] !max-w-[60px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-1 sticky top-0 z-20 text-xs">夜勤</th>
                  <th className="border border-slate-600 !w-[60px] !min-w-[60px] !max-w-[60px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-1 sticky top-0 z-20 text-xs">休日</th>
                  <th className="border border-slate-600 !w-[60px] !min-w-[60px] !max-w-[60px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-1 sticky top-0 z-20 text-xs">有給</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => {
                  const stats = staffStats[staff.id] || { days: 0, hours: 0, nightCount: 0, holidays: 0, paidHolidays: 0 };
                  return (
                    <tr key={staff.id} className="hover:bg-yellow-50 print:hover:bg-transparent h-12 transition-colors">
                      <td className="border border-slate-600 px-2 text-left whitespace-nowrap font-bold text-slate-800 bg-white sticky left-0 z-10 shadow-lg border-r border-r-slate-600 w-30 min-w-[150px]">
                        {staff.name}
                      </td>
                      <td className="border border-slate-600 px-2 text-left text-xs whitespace-nowrap text-slate-700 bg-white border-r-2 border-r-slate-700 w-24 min-w-[130px]">
                        {staff.qualification}
                      </td>
                      {dates.map(date => {
                        const key = `${staff.id}_${getIsoDate(date)}`;
                        const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

                        const isLocked = cellData.isLocked;
                        const isLockedAndActive = isLocked && editLockEnabled;

                        const lockPatternClass = isLockedAndActive
                          ? 'bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_5px,#f1f5f9_5px,#f1f5f9_10px)]'
                          : '';

                        const styles: any = {};

                        if (cellData.customText === '休' || cellData.customText === '休職') {
                          styles.color = '#dc2626';
                          styles.backgroundColor = isLockedAndActive ? '#fef7fb' : '#ffffff';
                        }
                        else if (cellData.customText === '有' || cellData.customText === '有給') {
                          styles.color = '#9a3412';
                          styles.backgroundColor = '#fed7aa';
                        }
                        else if (cellData.customText === '夜') {
                          styles.color = '#ffffff';
                          styles.backgroundColor = isLockedAndActive ? '#1e3a8a' : '#1e3a8a';
                          styles.fontWeight = 'bold';
                        }
                        else if (cellData.customText === '明') {
                          styles.color = '#000000';
                          styles.backgroundColor = isLockedAndActive ? '#ffffff' : '#ffffff';
                        }
                        else if (cellData.customText === '早') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#6ee7b7' : '#86efac';
                        }
                        else if (cellData.customText === '遅' || cellData.customText.startsWith('11') || cellData.customText.startsWith('18')) {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#fb923c' : '#fdba74';
                        }
                        else if (cellData.customText === '冬') {
                          styles.color = '#1e40af';
                          styles.backgroundColor = isLockedAndActive ? '#bfdbfe' : '#dbeafe';
                        }
                        else if (cellData.customText === '日A' || cellData.customText === '8～17' || cellData.customText === '8-17') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#bae6fd' : '#e0f2fe';
                        }
                        else if (cellData.customText === '日B' || cellData.customText === '9～18' || cellData.customText === '9-18') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#f472b6' : '#f9a8d4';
                        }

                        if (cellData.editedInActualMode && cellData.customText !== '夜') {
                          styles.backgroundColor = '#fef08a';
                          styles.color = '#1f2937';
                          styles.boxShadow = 'inset 0 0 0 2px #ca8a04';
                        }

                        const isNightPrint = cellData.customText === '夜';
                        const currentDateStr = getIsoDate(date);
                        const isPopoverCell = popoverState.isOpen &&
                          String(staff.id) === String(popoverState.staffId) &&
                          popoverState.dateStr &&
                          currentDateStr === popoverState.dateStr;

                        if (isPopoverCell) {
                          if (!styles.backgroundColor) {
                            styles.backgroundColor = '#dbeafe';
                          }
                          styles.boxShadow = 'inset 0 0 0 3px #3b82f6';
                        }

                        return (
                          <td
                            key={key}
                            onClick={(e) => handleCellClick(e, staff, date)}
                            onContextMenu={(e) => handleContextMenu(e, staff, date)}
                            className={`
                            border border-slate-600 p-0 overflow-hidden relative z-[1]
                            !w-[50px] !min-w-[50px] !max-w-[50px]
                            ${isLockedAndActive ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:shadow-lg'}
                            ${isLockedAndActive && !styles.backgroundColor ? lockPatternClass : ''}
                            print:cursor-default print:ring-0
                          `}
                            style={styles}
                            title={isLockedAndActive ? "固定シフト (編集不可)" : "右クリックでクイック選択"}
                          >
                            <div className="w-full h-full">
                              {isLockedAndActive && (
                                <div className="absolute top-0.5 right-0.5 text-slate-500 print:hidden opacity-70">
                                  <Lock size={8} strokeWidth={3} />
                                </div>
                              )}

                              <div className={`w-full h-full flex items-center justify-center font-semibold ${isNightPrint ? 'print:font-extrabold text-base' : ''}`}>
                                <span className={`transform inline-block whitespace-nowrap ${cellData.customText.length > 4 ? 'scale-75' : cellData.customText.length > 2 ? 'scale-90' : 'scale-100'}`}>
                                  {getDisplayText(cellData.customText, cellData.type)}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 border-l-2 border-l-slate-800 print:hidden !w-[60px] !min-w-[60px] !max-w-[60px] text-center px-1 text-sm">{stats.days}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[60px] !min-w-[60px] !max-w-[60px] text-center px-1 text-sm">{stats.hours}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[60px] !min-w-[60px] !max-w-[60px] text-center px-1 text-sm">{stats.nightCount}</td>
                      <td className={`border border-slate-600 font-mono bg-slate-50 print:hidden !w-[60px] !min-w-[60px] !max-w-[60px] text-center px-1 text-sm ${fullTimeStaffIds.includes(staff.id) && stats.holidays < 9 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{stats.holidays}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[60px] !min-w-[60px] !max-w-[60px] text-center px-1 text-sm">{stats.paidHolidays}</td>
                    </tr>
                  );
                })}

                {/* コメント欄 */}
                <tr className="border-t-2 border-slate-400">
                  <td colSpan={2} className="border border-slate-600 bg-slate-100 font-bold text-slate-700 px-2 py-2 sticky left-0 z-10 text-sm print:text-[8px]">
                    備考
                  </td>
                  <td colSpan={dates.length} className="border border-slate-600 bg-white p-1">
                    <textarea
                      className="w-full min-h-[3rem] p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border-none bg-transparent print:text-[8px]"
                      placeholder="自由にコメントを入力..."
                      value={footerComment}
                      onChange={(e) => {
                        setFooterComment(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      style={{ overflow: 'hidden' }}
                    />
                  </td>
                  <td colSpan={5} className="border border-slate-600 bg-slate-50 print:hidden"></td>
                </tr>

                {/* 検食欄（職員リストの最後） */}
                <tr className="border-t-2 border-slate-400">
                  <td colSpan={2} className="border border-slate-600 bg-slate-100 font-bold text-slate-700 px-2 py-2 sticky left-0 z-10 text-sm print:text-[8px]">
                    検食
                  </td>
                  {dates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isEditing = editingMealDate === dateStr;
                    const mealText = inspectionMeals[dateStr] || '';

                    return (
                      <td
                        key={dateStr}
                        className="border border-slate-600 text-[9px] text-slate-700 font-medium p-0.5 bg-white cursor-pointer hover:bg-blue-50 print:cursor-default"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        onClick={() => {
                          if (!isEditing) {
                            setEditingMealDate(dateStr);
                            setEditingMealValue(mealText);
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingMealValue}
                            onChange={(e) => setEditingMealValue(e.target.value)}
                            onBlur={() => {
                              setInspectionMeals(prev => ({ ...prev, [dateStr]: editingMealValue }));
                              setEditingMealDate(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setInspectionMeals(prev => ({ ...prev, [dateStr]: editingMealValue }));
                                setEditingMealDate(null);
                              } else if (e.key === 'Escape') {
                                setEditingMealDate(null);
                              }
                            }}
                            autoFocus
                            className="w-full h-full text-[9px] text-center border-none outline-none bg-blue-100 p-0"
                            style={{ writingMode: 'horizontal-tb' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center leading-tight">
                            {mealText || <span className="text-slate-300">+</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td colSpan={5} className="border border-slate-600 bg-slate-50 print:hidden"></td>
                </tr>
              </tbody>

              {/* 不足判定フッター */}
              <tfoot className="print:hidden">
                <tr className="h-12 border-t-4 border-slate-800">
                  <td className="border border-slate-600 bg-slate-800 text-white font-bold px-2 sticky left-0 z-30 shadow-md" colSpan={2}>
                    配置判定
                  </td>
                  {dates.map(date => {
                    const dateIso = getIsoDate(date);
                    const result = sufficiencyData[dateIso];
                    let bgClass = "bg-emerald-50";
                    let textClass = "text-emerald-700";

                    if (result && result.maxShortage >= 2) {
                      bgClass = "bg-yellow-200";
                      textClass = "text-yellow-900 font-bold";
                    } else if (result && result.maxShortage >= 1) {
                      bgClass = "bg-yellow-50";
                      textClass = "text-yellow-800";
                    }

                    return (
                      <td key={date.toString()} className={`border border-slate-600 text-[9px] align-top p-1 !w-[50px] !min-w-[50px] !max-w-[50px] ${bgClass}`}>
                        {result && result.details.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {result.details.map((d: string, i: number) => (
                              <span key={i} className="text-red-600 font-bold leading-tight block">{d}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 flex justify-center pt-1">OK</span>
                        )}
                      </td>
                    );
                  })}
                  <td colSpan={5} className="border border-slate-600 bg-slate-100"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>

      {/* 凡例 */}
      <div className="fixed bottom-4 left-4 z-40 print:hidden">
        <div className="border border-slate-600 p-3 inline-flex gap-2 bg-white shadow-lg rounded-lg flex-wrap text-[9px] font-serif">
          <span className="font-bold border-r border-slate-300 pr-2 mr-1 text-slate-600">凡例</span>
          <span className="text-red-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">休</span>
          <span className="text-slate-900 bg-blue-200 px-1.5 py-0.5 rounded border border-blue-300 font-bold">夜</span>
          <span className="text-slate-900 bg-green-200 px-1.5 py-0.5 rounded border border-green-200 font-bold">早</span>
          <span className="text-slate-900 bg-orange-200 px-1.5 py-0.5 rounded border border-orange-200 font-bold">遅</span>
          <span className="text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 font-bold">有</span>
          <span className="text-slate-900 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-100 font-bold">日A</span>
          <span className="text-slate-900 bg-pink-100 px-1.5 py-0.5 rounded border border-pink-100 font-bold">日B</span>
        </div>
      </div>

      {/* クリア確認モーダル */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              ロック解除セルのクリア確認
            </h2>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 mb-2">
                <strong>⚠️ 注意:</strong> この操作を実行すると、ロックがかかっていないすべてのセルが空白になります。
              </p>
              <p className="text-sm text-red-800">
                ロック（🔒）されているセルは保護され、変更されません。
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 font-semibold transition-all text-base"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearUnlockedCells}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all text-base shadow-lg hover:shadow-xl"
              >
                クリアする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存モーダル */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {saveMode === 'overwrite' && loadedShiftId ? '上書き保存' : 'シフトを保存'}
            </h2>

            {saveMode === 'overwrite' && loadedShiftId && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  「{loadedShiftName}」を上書き保存します。<br />
                  元のデータは復元できません。
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700">バージョン名</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                disabled={saveMode === 'overwrite' && loadedShiftId !== null}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg ${
                  saveMode === 'overwrite' && loadedShiftId
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200'
                    : 'border-gray-300'
                }`}
                placeholder={`例: ${month}月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_001`}
                autoFocus={!loadedShiftId}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 font-semibold transition-all text-base"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveToDB}
                disabled={isSaving}
                className={`px-6 py-3 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-base shadow-lg hover:shadow-xl ${
                  saveMode === 'overwrite' ? 'bg-blue-600' : 'bg-green-600'
                }`}
              >
                {isSaving ? '保存中...' : saveMode === 'overwrite' && loadedShiftId ? '上書き保存' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
