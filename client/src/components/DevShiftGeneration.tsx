import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Printer, User, Settings, Crown, RefreshCw, X, Save, Clock, Lock, Unlock, ZoomIn, ZoomOut, MousePointer2, AlertTriangle, Sparkles, CheckCircle2, XCircle, Loader2, Undo } from 'lucide-react';
import { useToast } from "../hooks/useToast";

import { trpcClient } from "../lib/trpc";
import { generateShiftPDF } from "../utils/ShiftPdfLogic";

// --- 設定定数 ---
const FACILITY_NAME = "からふる庭園 蘇原";

// ルール定数
const REQUIRED_HOLIDAYS_FULLTIME = 9; // 正社員の公休数
const MAX_CONSECUTIVE_WORK_DAYS = 4;  // 最大連勤数

// 正社員IDリスト
const FULL_TIME_STAFF_IDS = ['2', '3', '4', '5', '6', '7'];
// 事務員ID
const CLERK_STAFF_ID = '27';
// 管理者ID（9:00-16:00は人数カウント除外）
const ADMIN_STAFF_IDS = ['2', '3']; // 山口 夕香里、馬渕 尊至

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

// --- 職員データ ---
// constraints:
// fixedTimeOnly: true -> 早番・遅番・夜勤の自動割り当て対象外（時間はdefaultShift固定）
// forbiddenTypes: ['NIGHT', 'EARLY'] -> 特定のシフト種別を禁止
// monthlyShiftCounts: { 'シフト名': 回数 } -> 特定のシフトを月に何回入れるか（残りはdefaultShift）
const STAFF_RAW_DATA = [
  {
    id: '1', name: '髙野 幹成', role: 'admin', qualification: '社長',
    note: 'スポット勤務',
    schedule: {},
    constraints: { fixedTimeOnly: true, breakTime: 1 }
  },
  { id: '2', name: '山口 夕香里', role: 'admin', qualification: '施設長', schedule: {}, constraints: { defaultShift: '9～18', breakTime: 1 } },
  {
    id: '3', name: '馬渕 尊至', role: 'admin', qualification: '管理者兼サ責',
    schedule: {},
    // 夜勤禁止
    constraints: { randomShifts: ['早', '8～17', '9～18'], forbiddenTypes: ['NIGHT'], breakTime: 1 }
  },
  { id: '4', name: '松嵜 愛梨', role: 'admin', qualification: 'サ責', schedule: { '2026-01-01': '明', '2026-01-02': '休' }, constraints: { defaultShift: '9～18', breakTime: 1 } },
  {
    id: '5', name: '杉山 美佳子', role: 'staff', qualification: '介護主任',
    // 1/1夜, 1/2明, 1/3休 固定
    schedule: { '2026-01-01': '夜', '2026-01-02': '明', '2026-01-03': '休' },
    constraints: { defaultShift: '9～18', specialRule: 'SUGIYAMA_FRIDAY', breakTime: 1 }
  },
  { id: '6', name: '梅田 英津子', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-03': '夜', '2026-01-04': '明', '2026-01-05': '休' }, constraints: { defaultShift: '9～18', forbiddenTypes: ['LATE', '11～20'], breakTime: 1 } },
  { id: '7', name: '大橋 健一', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-02': '夜', '2026-01-03': '明', '2026-01-04': '休' }, constraints: { defaultShift: '9～18', nightShiftTarget: 9, specialRule: 'OHASHI_NIGHT_COMBO', breakTime: 1 } },
  {
    id: '8', name: '上条 やえ子', role: 'staff', qualification: '介護福祉士',
    schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休' },
    // 時間固定 (自動早番NG)、9-15を月2回
    constraints: { workDaysPerMonth: 18, defaultShift: '8～16', monthlyShiftCounts: { '9～15': 2 }, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } }
  },
  {
    id: '9', name: '若森 直子', role: 'staff', qualification: '介護福祉士',
    schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休' },
    // 時間固定、8-10を月1回
    constraints: { workDaysPerMonth: 13, defaultShift: '8～14', monthlyShiftCounts: { '8～10': 1 }, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } }
  },
  { id: '10', name: '足立 洋子', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '8～13', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '9～16' }, constraints: { fixedDayOfWeek: { 1: '9～16', 4: '8～16' }, offDayOfWeek: [0, 2, 3, 5, 6], fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '11', name: '野仲 彩香', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休' }, constraints: { defaultShift: '8半～13半', fixedTimeOnly: true, breakTime: 0 } },
  { id: '12', name: '桂川 美幸', role: 'staff', qualification: '実務者研修', schedule: { '2026-01-01': '18～20', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '18～20', '2026-01-05': '18～20' }, constraints: { fixedDayOfWeek: { 1: '18～20', 3: '18～20', 5: '18～20', 0: '18～20' }, offDayOfWeek: [2, 4, 6], fixedTimeOnly: true, breakTime: 0 } },
  { id: '13', name: '加藤 広大', role: 'staff', qualification: '実務者研修', schedule: { '2026-01-03': '16～20', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { fixedDayOfWeek: { 3: '11～20', 6: '11～20' }, offDayOfWeek: [2], defaultShift: '9～18', fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '14', name: '湯本 智子', role: 'staff', qualification: '実務者研修', schedule: {}, constraints: { defaultShift: '9～18', workDaysPerWeek: 4, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '15', name: '楠 美佐', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '9～12', '2026-01-04': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6, 2], defaultShift: '9～16', fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '16', name: '平井 英子', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { fixedDayOfWeek: { 3: '10～16', 5: '10～16' }, offDayOfWeek: [0, 1, 2, 4, 6], fixedTimeOnly: true, breakTime: { threshold: 6, duration: 0.5 } } },
  { id: '17', name: '海野 はるか', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-03': '休', '2026-01-04': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], defaultShift: '9～14', fixedTimeOnly: true, breakTime: { threshold: 5, duration: 0.5 } } },
  {
    id: '18', name: '山田 明美', role: 'staff', qualification: '介護福祉士',
    schedule: { '2026-01-02': '休' },
    // ★完全固定: 9～15のみ, 早番自動割り当てNG
    constraints: { defaultShift: '9～15', workDaysPerMonth: 15, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } }
  },
  { id: '19', name: '足立 豊子', role: 'staff', qualification: '実務者研修', schedule: { '2026-01-01': '休', '2026-01-02': '有給', '2026-01-03': '休', '2026-01-04': '休' }, constraints: { defaultShift: '9～17', workDaysPerMonth: 18, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '20', name: '関田 あゆみ', role: 'staff', qualification: '実務者研修', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '9～12', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], fixedDayOfWeek: { 1: '9～15', 2: '9～15', 4: '9～15', 3: '9～16', 5: '9～16' }, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  { id: '21', name: '長山 真梨奈', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-02': '9～12半', '2026-01-03': '9～12半', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], defaultShift: '9～13半', fixedTimeOnly: true, breakTime: 0 } },
  { id: '22', name: '近藤 由美子', role: 'staff', qualification: '介護福祉士', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { workDaysPerWeek: 1, defaultShift: '9～13', fixedTimeOnly: true, breakTime: 0 } },
  {
    id: '23', name: '大堀SHIRLEY TAN', role: 'staff', qualification: '初任者研修',
    schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '9～18' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], workDaysPerWeek: 4, defaultShift: '9～18', fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } }
  },
  { id: '24', name: '宝本 龍騎', role: 'staff', qualification: '初任者研修', schedule: { '2026-01-01': '10～15', '2026-01-02': '10～15', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '10～15' }, constraints: { defaultShift: '10～14', workDaysPerWeek: 3, fixedTimeOnly: true, breakTime: 0 } },
  { id: '25', name: '岩崎 亜友美', role: 'staff', qualification: '有料職員', schedule: { '2026-01-01': '8～17', '2026-01-02': '休', '2026-01-03': '8～17', '2026-01-04': '休', '2026-01-05': '8～17' }, constraints: { offDayOfWeek: [0, 3, 6], defaultShift: '8～17', workDaysPerWeek: 4, fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
  {
    id: '26', name: '伊藤 美穂', role: 'staff', qualification: '初任者研修',
    // 現在勤務できない状態（全日程空白でロック）
    note: 'スポット勤務',
    schedule: {},
    constraints: { offDayOfWeek: [0, 1, 3, 5], fixedDayOfWeek: { 2: '11半～17', 4: '11半～17', 6: '11半～17' }, fixedTimeOnly: true, breakTime: 0 }
  },
  { id: '27', name: '淺野 穂菜美', role: 'staff', qualification: '事務員', schedule: { '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '8～16半', '2026-01-04': '8～16半', '2026-01-05': '8～16半' }, constraints: { offHolidays: true, offDayOfWeek: [0, 4, 6], defaultShift: '8～16半', fixedTimeOnly: true, breakTime: { threshold: 6, duration: 1 } } },
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
  FREE: { id: 'F', label: 'free', text: 'free', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const SHIFT_PRESETS = [
  { text: '日A', type: 'DAY' },
  { text: '日B', type: 'DAY' },
  { text: '休', type: 'OFF' },
  { text: '夜', type: 'NIGHT' },
  { text: '早', type: 'EARLY' },
  { text: '遅', type: 'LATE' },
  { text: '有', type: 'HOPE' },
  { text: 'free', type: 'FREE' },
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

const getNightShiftCandidates = (staffList: any[]): string[] => {
  const base = staffList.filter(staff => {
    if (staff.constraints?.fixedTimeOnly) return false;
    if (!staff.schedule) return false;
    if (staff.constraints?.forbiddenTypes?.includes('NIGHT')) return false;
    return Object.values(staff.schedule || {}).some((val: any) =>
      val === '夜' || val === '夜勤'
    ) || FULL_TIME_STAFF_IDS.includes(staff.id);
  });

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  const ohashi    = base.filter(s => s.id === '7'); // 大橋（最優先）
  const primary   = base.filter(s => FULL_TIME_STAFF_IDS.includes(s.id) && s.id !== '2' && s.id !== '1' && s.id !== '7');
  const yamaguchi = base.filter(s => s.id === '2'); // 山口
  const takano    = base.filter(s => s.id === '1'); // 高野

  return [
    ...shuffle(ohashi),      // 大橋を最優先
    ...shuffle(primary),
    ...shuffle(yamaguchi),
    ...shuffle(takano),
  ].map(s => s.id);
};

const getEventName = (date: Date): string => {
  // 開発専用シフトではイベント表示なし
  return '';
};

const calculateWorkStats = (shifts: any, staffId: string, dates: Date[]): { days: number; hours: number; nightCount: number; holidays: number; paidHolidays: number } => {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let holidays = 0;
  let paidHolidays = 0;

  // 1月のすべての日付を集計
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

    if (text === '日' || text === '日A' || text === '日B' || text === '早' || text === '遅' || text === '冬' || text === 'free' || type === 'DAY' || type === 'EARLY' || type === 'LATE' || type === 'FREE') {
      // 定型シフトは9時間勤務・休憩1時間（実労働8時間）
      const grossHours = 9;
      const breakTime = calculateBreakTime(grossHours, staffId);
      hours += grossHours - breakTime;
    } else {
      const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
      if (match) {
        let start = parseInt(match[1]);
        if (text.includes(match[1] + '半')) start += 0.5;
        let end = parseInt(match[2]);
        if (text.includes(match[2] + '半')) end += 0.5;

        let grossHours = end - start;
        const breakTime = calculateBreakTime(grossHours, staffId);
        const netHours = grossHours - breakTime;
        hours += netHours > 0 ? netHours : 0;
      } else {
        // マッチしない場合は8時間とする
        const grossHours = 8;
        const breakTime = calculateBreakTime(grossHours, staffId);
        hours += grossHours - breakTime;
      }
    }
  });

  return { days, hours, nightCount, holidays, paidHolidays };
};

const getSurname = (fullname: string): string => {
  const parts = fullname.split(/[\s　]+/);
  return parts[0];
};

/**
 * 休憩時間を計算する関数
 * @param workHours 勤務時間
 * @param staffId 職員ID
 * @returns 休憩時間
 */
const calculateBreakTime = (workHours: number, staffId: string): number => {
  // 職員データから休憩時間ルールを取得
  const staff = STAFF_RAW_DATA.find(s => s.id === staffId);
  const breakTimeRule = staff?.constraints?.breakTime;

  if (breakTimeRule !== undefined) {
    // 個別ルールがある場合
    if (typeof breakTimeRule === 'number') {
      // 固定時間（例：breakTime: 1 → 常に1時間）
      return breakTimeRule;
    } else if (typeof breakTimeRule === 'object' && breakTimeRule !== null) {
      // 条件付きルール（例：breakTime: { threshold: 6, duration: 1 }）
      const rule = breakTimeRule as { threshold?: number; duration?: number };
      const threshold = rule.threshold ?? 6;
      const duration = rule.duration ?? 1;

      // 平井様（ID: 16）のみ特殊処理: 6時間以上で休憩30分
      if (staffId === '16') {
        return workHours >= threshold ? duration : 0;
      }

      return workHours > threshold ? duration : 0;
    } else if (typeof breakTimeRule === 'function') {
      // カスタム関数（例：breakTime: (hours) => hours > 8 ? 1.5 : hours > 6 ? 1 : 0）
      return breakTimeRule(workHours);
    }
  }

  // デフォルトルール: 6時間超なら1時間
  return workHours > 6 ? 1 : 0;
};


const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
  // null/undefinedは休みとして扱う
  if (!text) return null;

  // 夜勤は16時～24時（翌日0時～9時は前日夜勤チェックでカウント）
  if (text === '夜' || type === 'NIGHT') return { start: 16, end: 24 };
  // 「明」は0時～9時勤務
  if (text === '明') return { start: 0, end: 9 };
  // 休み扱い（配置判定に含めない）
  if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '研修' || text === 'free' || type === 'FREE') return null;

  // 時間パターンマッチを優先（例: 9～15、8半～13半など）
  const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
  if (match) {
    let start = parseInt(match[1]);
    if (text.includes(match[1] + '半')) start += 0.5;
    let end = parseInt(match[2]);
    if (text.includes(match[2] + '半')) end += 0.5;
    return { start, end };
  }

  // タイプ別のデフォルト（時間パターンがない場合のみ）
  if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
  if (text === '日A') return { start: 8, end: 17 };
  if (text === '日B') return { start: 9, end: 18 };
  if (text === '早' || type === 'EARLY') return { start: 7, end: 16 };
  if (text === '遅' || type === 'LATE') return { start: 11, end: 20 };

  return { start: 9, end: 18 };
};

/**
 * 長い時間範囲テキストを2段組みに変換する関数
 * 例: "8半-17半" -> "8半\n~17半"
 */
const formatLabel = (text: string): string => {
  if (!text) return '';

  // 既に改行がある場合はそのまま
  if (text.includes('\n')) return text;

  // 「数字+半」や「数字:数字」がハイフン/チルダで繋がっているパターンを検出
  // 例: "8半-17半" -> "8半\n~17半"
  // 例: "8~17" -> "8\n~17"
  // 例: "11:00-20:00" -> "11:00\n~20:00"
  const timeRangePattern = /([0-9]+(?:半|:[0-9]{2})?)\s*[-~～]\s*([0-9]+(?:半|:[0-9]{2})?)/;
  const match = text.match(timeRangePattern);

  if (match) {
    return `${match[1]}\n~${match[2]}`;
  }

  return text;
};

const getDisplayText = (text: string, type: string) => {
  if (!text) return '';

  // 優先される記号系（改行処理を適用）
  if (text === '日A') return '日A';
  if (text === '日B') return '日B';
  if (text === '冬')  return '冬';
  if (text === '明')  return '明';
  if (text === '有' || text === '有給') return '有';
  if (text === '休' || text === '休職') return text;

  // 遅番
  if (text === '遅' || (text.includes('11') && text.includes('20')) || type === 'LATE') {
    return '遅';
  }

  // 日勤A/B
  if (text.includes('8') && text.includes('17')) return '日A';
  if (text.includes('9') && text.includes('18')) return '日B';

  // 早番（時間だけ入ってるケース）
  if ((text.includes('7') && text.includes('16')) && type === 'DAY') return '早';

  // その他のテキスト: 長い時間範囲を改行対応
  return formatLabel(text);
};

const calculateSufficiency = (dates: Date[], shifts: any, staffList: any[]): any => {
  const results: any = {};

  dates.forEach((date, dateIdx) => {
    const dateIso = getIsoDate(date);

    // 30分刻み、48分割（0=0:00, 1=0:30, 2=1:00, ..., 47=23:30）
    const halfHourCounts = new Array(48).fill(0);
    const halfHourFullTimeCounts = new Array(48).fill(0);

    // 前日夜勤の翌日0～9時カウント
    if (dateIdx > 0) {
      const prevDate = dates[dateIdx - 1];
      const prevKeySuffix = getIsoDate(prevDate);
      staffList.forEach(staff => {
        const prevCell = shifts[`${staff.id}_${prevKeySuffix}`];
        // 前日が夜勤の場合
        if (prevCell && (prevCell.type === 'NIGHT' || prevCell.customText === '夜')) {
          // 当日に「明」がある場合は二重カウントを避けるためスキップ
          const currentCell = shifts[`${staff.id}_${dateIso}`];
          if (currentCell && currentCell.customText === '明') {
            return; // 「明」で0-9時がカウントされるのでスキップ
          }
          // 「明」がない場合のみ、翌日0～9時をカウント
          for (let slot = 0; slot < 18; slot++) {
            if (staff.id !== CLERK_STAFF_ID) {
              halfHourCounts[slot]++;
            }
            if (FULL_TIME_STAFF_IDS.includes(staff.id)) halfHourFullTimeCounts[slot]++;
          }
        }
      });
    }

    // 当日のシフトカウント
    staffList.forEach(staff => {
      const cell = shifts[`${staff.id}_${dateIso}`];
      if (!cell) return;
      const time = parseShiftTime(cell.customText, cell.type);
      if (!time) return;

      let start = time.start;
      let end = time.end;

      if (end > 24) end = 24;

      // 30分単位でカウント（例: 9.5時間 = 9:30 = slot 19）
      const startSlot = Math.floor(start * 2);
      const endSlot = Math.floor(end * 2);

      for (let slot = startSlot; slot < endSlot; slot++) {
        if (slot >= 0 && slot < 48) {
          // 事務員（淺野さん）は人数カウントから除外
          if (staff.id !== CLERK_STAFF_ID) {
            // 管理者（馬渕・山口）は9:00-16:00（slot 18-31）では人数カウント除外
            const isAdminInOfficeHours = ADMIN_STAFF_IDS.includes(staff.id) && slot >= 18 && slot < 32;
            if (!isAdminInOfficeHours) {
              halfHourCounts[slot]++;
            }
          }
          if (FULL_TIME_STAFF_IDS.includes(staff.id)) halfHourFullTimeCounts[slot]++;
          // 事務員は9:00～18:00を正社員カウント（slot 18～35）
          if (staff.id === CLERK_STAFF_ID && slot >= 18 && slot < 36) halfHourFullTimeCounts[slot]++;
        }
      }
    });

    // 不足情報を構造化して収集
    const fullTimeShortages: number[] = []; // 正社員不足のslot番号
    const criticalShortages: number[] = []; // -2人以上不足
    const minorShortages: number[] = []; // -1人不足
    let maxShortage = 0;

    // 48スロットをチェック（曜日別の必要人数を使用）
    const dayOfWeek = date.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    const requiredForDay = REQUIRED_STAFF_BY_DAY[dayOfWeek];

    for (let slot = 0; slot < 48; slot++) {
      let required = requiredForDay[slot] || 1;
      let current = halfHourCounts[slot];
      let diff = current - required;

      // 正社員チェック（9:00～16:00 = slot 18～32）
      if (slot >= 18 && slot < 33) {
        if (halfHourFullTimeCounts[slot] < 1) {
          fullTimeShortages.push(slot);
          maxShortage = Math.max(maxShortage, 2);
        }
      }

      if (diff < 0) {
        if (diff <= -2) {
          criticalShortages.push(slot);
          maxShortage = Math.max(maxShortage, 2);
        } else {
          minorShortages.push(slot);
          maxShortage = Math.max(maxShortage, 1);
        }
      }
    }

    // 連続する時間帯をグループ化する関数
    const groupSlots = (slots: number[]): string[] => {
      if (slots.length === 0) return [];
      const groups: string[] = [];
      let rangeStart = slots[0];
      let rangeEnd = slots[0];

      for (let i = 1; i < slots.length; i++) {
        if (slots[i] === rangeEnd + 1) {
          // 連続している
          rangeEnd = slots[i];
        } else {
          // 連続が途切れた
          groups.push(formatSlotRange(rangeStart, rangeEnd));
          rangeStart = slots[i];
          rangeEnd = slots[i];
        }
      }
      // 最後のグループを追加
      groups.push(formatSlotRange(rangeStart, rangeEnd));
      return groups;
    };

    // スロット範囲を時刻文字列に変換
    const formatSlotRange = (start: number, end: number): string => {
      const formatTime = (slot: number) => {
        const hour = Math.floor(slot / 2);
        const minute = (slot % 2) === 0 ? '00' : '30';
        return `${hour}:${minute}`;
      };

      if (start === end) {
        return formatTime(start);
      } else {
        // 終了時刻は次のスロットの開始時刻（30分後）
        return `${formatTime(start)}~${formatTime(end + 1)}`;
      }
    };

    results[dateIso] = {
      maxShortage,
      fullTimeShortages: groupSlots(fullTimeShortages),
      criticalShortages: groupSlots(criticalShortages),
      minorShortages: groupSlots(minorShortages)
    };
  });

  return results;
};

// --- コンポーネント本体 ---
interface DevShiftGenerationProps {
  year: number;
  month: number;
  initialShiftId?: number | null;
}

export function DevShiftGeneration({ year, month, initialShiftId }: DevShiftGenerationProps) {
  const toast = useToast();

  // 年月から日付範囲を動的に生成
  const START_DATE = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const END_DATE = useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, lastDay);
  }, [year, month]);

  const [dates] = useState(generateDateRange(START_DATE, END_DATE));
  const [staffList] = useState(STAFF_RAW_DATA);
  const [shifts, setShifts] = useState<any>({});
  const [previousShifts, setPreviousShifts] = useState<any>(null); // AI生成前の状態を保存（アンドゥ用）
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  const [loadedShiftId, setLoadedShiftId] = useState<number | null>(null);
  const [loadedShiftName, setLoadedShiftName] = useState<string>("");
  const [isInheritMode, setIsInheritMode] = useState(false); // 12月データからの引き継ぎモード
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [printPreview, setPrintPreview] = useState(false);
  const [editLockEnabled, setEditLockEnabled] = useState(true);
  const [zoom, setZoom] = useState(1.0);

  // 実際の稼働シフトモード（編集したセルを黄色で表示）
  const [actualOperationMode, setActualOperationMode] = useState(false);

  // 初期値保存用（元に戻したかどうかの判定に使用）
  const [originalShifts, setOriginalShifts] = useState<any>({});

  // カスタム行事予定（日付をキーとして保存）
  const [customEvents, setCustomEvents] = useState<Record<string, string>>({});
  const [editingEventDate, setEditingEventDate] = useState<string | null>(null);
  const [editingEventValue, setEditingEventValue] = useState<string>('');

  // 検食欄（日付ごと）
  const [inspectionMeals, setInspectionMeals] = useState<Record<string, string>>({});
  const [editingMealDate, setEditingMealDate] = useState<string | null>(null);
  const [editingMealValue, setEditingMealValue] = useState<string>('');

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

  // ロックされていないセルを一括クリア
  const handleClearUnlockedCells = () => {
    setShifts((prevShifts: any) => {
      const newShifts = { ...prevShifts };
      let clearedCount = 0;

      for (const key in newShifts) {
        const cell = newShifts[key];
        // ロックされていないセルのみクリア
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
          // 空欄（customTextが空でtype === 'OFF'）の場合はスキップ
          if (cell && !(cell.type === 'OFF' && !cell.customText)) {
            entries.push({
              employeeName: staff.name,
              date: getIsoDate(date), // Full date string YYYY-MM-DD instead of just day number
              type: cell.type === 'OFF' ? 'holiday' : 'work',
              text: cell.customText,
              isLocked: cell.isLocked || false, // ロック状態を送信
              editedInActualMode: cell.editedInActualMode || false, // 実際の稼働シフト編集フラグ
            });
          }
        }
      }

      // シフトデータがない場合は警告
      if (entries.length === 0) {
        toast.error("保存するシフトデータがありません", {
          description: "AI自動生成ボタンを押してシフトを作成するか、手動でシフトを入力してください"
        });
        setIsSaving(false);
        return;
      }

      console.log(`[JanuaryShiftGeneration] Saving ${entries.length} shift entries...`);

      let result;
      // 引き継ぎモードの場合は常に新規保存として扱う
      if (saveMode === 'overwrite' && loadedShiftId && !isInheritMode) {
        // 上書き保存: 既存のシフト詳細を削除してから新規保存（同じID）
        console.log(`[JanuaryShiftGeneration] Overwriting shift ID: ${loadedShiftId}`);

        // まず既存のシフト詳細を削除（deleteByShiftIdが必要、またはサーバー側で対応）
        // 今回は簡易的に、shiftIdを指定してsaveStandaloneで上書き保存
        // サーバー側でshiftIdパラメータを受け取れるように修正が必要

        // 暫定: 新規保存として処理し、loadedShiftIdとloadedShiftNameを更新
        result = await trpcClient.shifts.saveStandalone.mutate({
          year,
          month,
          name: saveName,
          entries: entries,
          overwriteShiftId: loadedShiftId,  // サーバー側で対応が必要
          isDevelopment: true  // 開発専用シフト
        });

        toast.success(`シフトを上書き保存しました (${entries.length}件)`);
      } else {
        // 新規保存（引き継ぎモードも含む）
        if (isInheritMode) {
          console.log(`[JanuaryShiftGeneration] Saving as new shift (inherit mode from December)`);
        }
        result = await trpcClient.shifts.saveStandalone.mutate({
          year,
          month,
          name: saveName,
          entries: entries,
          isDevelopment: true  // 開発専用シフト
        });

        console.log(`[JanuaryShiftGeneration] Save result:`, result);
        toast.success(`シフトを保存しました (${entries.length}件)`);

        // 新規保存の場合、loadedShiftIdを更新
        if (result && result.shiftId) {
          setLoadedShiftId(result.shiftId);
          setLoadedShiftName(saveName);
          // 引き継ぎモードを解除（保存後は通常の編集モードに）
          setIsInheritMode(false);
        }
      }

      setIsSaveModalOpen(false);
    } catch (error: any) {
      console.error('[JanuaryShiftGeneration] Save failed:', error);
      toast.error("保存に失敗しました", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverwriteSave = () => {
    // 引き継ぎモードの場合は上書き保存を無効化
    if (isInheritMode) {
      toast.error("12月データから引き継いだシフトは上書き保存できません", {
        description: "別名で保存してください"
      });
      return;
    }

    if (loadedShiftId && loadedShiftName) {
      // 既存シフトがある場合は直接上書き保存
      setSaveMode('overwrite');
      setSaveName(loadedShiftName);
      setIsSaveModalOpen(true);
    } else {
      // 新規の場合は名前入力モーダル
      const defaultName = `1月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_${Math.floor(Math.random() * 1000)}`;
      setSaveMode('overwrite');
      setSaveName(defaultName);
      setIsSaveModalOpen(true);
    }
  };

  const handleNewSave = () => {
    // 常に新しい名前で保存
    const defaultName = `1月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_${Math.floor(Math.random() * 1000)}`;
    setSaveMode('new');
    setSaveName(defaultName);
    setIsSaveModalOpen(true);
  };

  // 初期シフトデータの読み込み
  useEffect(() => {
    // 既に読み込んだシフトIDと同じ場合はスキップ
    if (!initialShiftId || initialShiftId === loadedShiftId) return;

    const loadInitialShiftData = async () => {
      try {
        setIsLoadingInitialData(true);
        console.log('[DevShiftGeneration] Loading shift data for ID:', initialShiftId);

        // シフト詳細を取得
        const shiftData = await trpcClient.shifts.getById.query({ id: initialShiftId });
        console.log('[DevShiftGeneration] Shift data loaded:', shiftData);

        if (!shiftData || !shiftData.shiftDetails || shiftData.shiftDetails.length === 0) {
          console.error('[DevShiftGeneration] No shift details found');
          toast.error("シフトデータが見つかりませんでした");
          setLoadedShiftId(initialShiftId); // エラーでも再試行を防ぐ
          return;
        }

        // 開発専用シフト：本番データからのコピーモード
        const isCopyMode = true; // 常にコピーモード
        setIsInheritMode(isCopyMode);

        // シフト名を保存（コピーモードの場合はプレフィックスを付与）
        setLoadedShiftName(`(本番からコピー) ${year}年${month}月シフト`);
        console.log('[DevShiftGeneration] Copy mode from production shift:', shiftData.name);

        console.log('[DevShiftGeneration] Processing', shiftData.shiftDetails.length, 'shift details');

        // shiftDetails を shifts オブジェクトに変換
        const newShifts: any = {};
        let matchedCount = 0;
        let unmatchedEmployees: string[] = [];

        for (const detail of shiftData.shiftDetails) {
          // employeeIdからstaff情報を検索
          const staff = staffList.find(s => {
            // 名前で検索（スペースを正規化して比較）
            const detailName = detail.employee?.name?.replace(/\s+/g, ' ').trim();
            const staffName = s.name?.replace(/\s+/g, ' ').trim();
            return detailName === staffName;
          });

          if (!staff) {
            if (detail.employee?.name && !unmatchedEmployees.includes(detail.employee.name)) {
              unmatchedEmployees.push(detail.employee.name);
            }
            continue;
          }

          matchedCount++;

          // 日付をパース (YYYY-MM-DD形式)
          // 開発専用シフト：すべての日付をコピー
          const dateStr = detail.date;
          const key = `${staff.id}_${dateStr}`;

          // displayTextを優先、なければフォールバック
          let customText = '';
          if (detail.displayText) {
            // displayTextがあればそれを使用（元の表示をそのまま復元）
            customText = detail.displayText;
          } else if (detail.status === 'off') {
            // leaveTypeがない場合は空文字列（空欄として扱う）
            customText = detail.leaveType || '';
          } else if (detail.timeSlot) {
            customText = detail.timeSlot.displayLabel || detail.timeSlot.name || '';
          } else if (detail.startTime && detail.endTime) {
            // timeSlotがnullでもstartTime/endTimeから復元
            const start = detail.startTime.substring(0, 5); // "HH:MM"
            const end = detail.endTime.substring(0, 5);
            // "08:30～13:00" → "8半～13" のような形式に変換
            const startHour = parseInt(start.split(':')[0]);
            const startMin = start.split(':')[1];
            const endHour = parseInt(end.split(':')[0]);
            const startStr = startMin === '30' ? `${startHour}半` : `${startHour}`;
            customText = `${startStr}～${endHour}`;
          }

          // 希望休・希望勤務時間の場合はロック
          const isLocked = detail.generatedBy === 'leave_request' || detail.generatedBy === 'work_preference';

          newShifts[key] = {
            type: detail.status === 'off' ? 'OFF' : 'WORK',
            customText: customText,
            backgroundColor: undefined, // デフォルトの色を使用
            isLocked: isLocked, // ロック状態を設定
            editedInActualMode: detail.editedInActualMode || false, // 実際の稼働シフト編集フラグ
          };
        }

        console.log('[DevShiftGeneration] Matched:', matchedCount, 'Unmatched employees:', unmatchedEmployees);
        setShifts(newShifts);
        // 初期値を保存（元に戻したかどうかの判定に使用）
        setOriginalShifts(JSON.parse(JSON.stringify(newShifts)));
        setLoadedShiftId(initialShiftId); // 読み込み完了をマーク
        toast.success(`シフトデータを読み込みました (${shiftData.name})`);
      } catch (error: any) {
        console.error("[DevShiftGeneration] Failed to load initial shift data:", error);
        toast.error("シフトデータの読み込みに失敗しました", { description: error.message });
        setLoadedShiftId(initialShiftId); // エラーでも再試行を防ぐ
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    loadInitialShiftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShiftId, year, month]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolledLeft(container.scrollLeft > 20);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const eventRowHeight = useMemo(() => {
    return 60;
  }, []);

  const staffStats = useMemo(() => {
    const stats: any = {};
    staffList.forEach(staff => {
      stats[staff.id] = calculateWorkStats(shifts, staff.id, dates);
    });
    return stats;
  }, [shifts, staffList, dates]);

  const sufficiencyData = useMemo(() => {
    return calculateSufficiency(dates, shifts, staffList);
  }, [dates, shifts, staffList]);

  // ====================================================================
  // PDF出力（HTML to Canvas to PDF 方式）
  // 日本語とスタイルを完璧に保持
  // ====================================================================
  const handlePrint = async () => {
    try {
      const gridWrapper = document.getElementById('grid-wrapper');
      if (!gridWrapper) {
        toast.error('テーブルが見つかりません');
        return;
      }

      // PDF出力用のスタイルを一時的に適用
      gridWrapper.classList.add('pdf-export-mode');

      // 統計列を一時的に非表示
      const statsColumns = document.querySelectorAll('.print\\:hidden');
      statsColumns.forEach(col => {
        (col as HTMLElement).style.display = 'none';
      });

      // 少し待ってからキャプチャ（スタイル適用を待つ）
      await new Promise(resolve => setTimeout(resolve, 100));

      // PDF生成
      const metaData = {
        startDate: START_DATE,
        endDate: END_DATE,
        title: `${FACILITY_NAME} 勤務表`,
        periodString: '2026年1月1日 〜 2026年1月31日',
      };

      await generateShiftPDF([], metaData);

      // 元に戻す
      gridWrapper.classList.remove('pdf-export-mode');
      statsColumns.forEach(col => {
        (col as HTMLElement).style.display = '';
      });

      toast.success('PDFを出力しました');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF出力に失敗しました');

      // エラー時も元に戻す
      const gridWrapper = document.getElementById('grid-wrapper');
      if (gridWrapper) {
        gridWrapper.classList.remove('pdf-export-mode');
        const statsColumns = document.querySelectorAll('.print\\:hidden');
        statsColumns.forEach(col => {
          (col as HTMLElement).style.display = '';
        });
      }
    }
  };

  // ====================================================================
  // 旧実装（window.print() 方式）
  // 元に戻す場合はこちらを使用してください
  // ====================================================================
  // const handlePrint = () => {
  //   window.print();
  // };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  // AIチェック実行関数
  const runAICheck = async (shiftData: any) => {
    try {
      setIsChecking(true);
      setCheckResult(null);

      const response = await fetch('/api/external-shifts/january/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AIチェックに失敗しました');
      }

      const result = await response.json();
      setCheckResult(result.result);

      if (result.result.violations.length === 0) {
        toast.success('問題は見つかりませんでした');
      } else {
        toast.warning(`${result.result.violations.length}件の問題が見つかりました`);
      }
    } catch (error: any) {
      console.error('AI check failed:', error);
      toast.error('AIチェックに失敗しました', {
        description: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleAICheck = async () => {
    // シフトデータを変換してAIチェック
    const shiftsArray = dates.flatMap(date => {
      return staffList.map(staff => {
        const key = `${staff.id}_${getIsoDate(date)}`;
        const cell = shifts[key];
        if (!cell || !cell.customText) return null;

        return {
          employeeId: staff.id,
          employeeName: staff.name,
          date: getIsoDate(date),
          shiftType: cell.type,
          customText: cell.customText,
          isLocked: cell.isLocked || false
        };
      }).filter(Boolean);
    });

    const shiftData = {
      year: 2026,
      month: 1,
      shifts: shiftsArray
    };

    await runAICheck(shiftData);
  };

  const startFakeAIGeneration = () => {
    // AI生成前の状態を保存（アンドゥ用）
    setPreviousShifts(JSON.parse(JSON.stringify(shifts)));
    console.log('[DevShiftGeneration] Saved current state before AI generation');

    setIsGenerating(true);
    setProgress(0);
    setLoadingStage('初期化中...');

    const stages = [
      { p: 10, text: '職員データベース照合中...' },
      { p: 30, text: '雇用条件・固定シフト適用中...' },
      { p: 60, text: '夜勤・早番・休日バランス調整中...' },
      { p: 80, text: '配置基準充足チェック中...' },
      { p: 100, text: '完了' }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (currentStageIndex < stages.length && newProgress >= stages[currentStageIndex].p) {
          setLoadingStage(stages[currentStageIndex].text);
          currentStageIndex++;
        }
        if (newProgress >= 100) {
          clearInterval(interval);
          completeGeneration();
        }
        return newProgress;
      });
    }, 50);
  };

  // AI生成を一つ前に戻す
  const handleUndo = () => {
    if (!previousShifts) {
      toast.error('戻せる状態がありません');
      return;
    }

    setShifts(previousShifts);
    setPreviousShifts(null);
    toast.success('AI生成前の状態に戻しました');
    console.log('[DevShiftGeneration] Restored previous state');
  };

  const normalizeShiftText = (text: string): string => {
    if (text === '8～17' || text === '8:00～17:00') return '日A';
    if (text === '9～18' || text === '9:00～18:00') return '日B';
    if (text === '早') return '早';
    return text;
  };

  // 後処理1: 夜→明→休のサイクルを強制的に再適用（大橋は例外）
  const enforceNightCycle = (newShifts: Record<string, any>, allDates: Date[]) => {
    const OHASHI_ID = '7'; // 大橋健一

    staffList.forEach((staff) => {
      if (staff.id === OHASHI_ID) return; // 大橋は例外

      for (let i = 0; i < allDates.length; i++) {
        const d0 = allDates[i];
        const d1 = i + 1 < allDates.length ? allDates[i + 1] : null;
        const d2 = i + 2 < allDates.length ? allDates[i + 2] : null;

        const key0 = `${staff.id}_${getIsoDate(d0)}`;
        const key1 = d1 ? `${staff.id}_${getIsoDate(d1)}` : null;
        const key2 = d2 ? `${staff.id}_${getIsoDate(d2)}` : null;

        const cell0 = newShifts[key0];
        if (!cell0 || cell0.type !== 'NIGHT') continue;

        // 1日目: 夜勤はそのまま固定
        newShifts[key0] = {
          type: 'NIGHT',
          customText: '夜',
          isLocked: false,
        };

        // 2日目: 明け
        if (key1) {
          newShifts[key1] = {
            type: 'EARLY',
            customText: '明',
            isLocked: false,
          };
        }

        // 3日目: 休
        if (key2) {
          newShifts[key2] = {
            type: 'OFF',
            customText: '休',
            isLocked: false,
          };
        }
      }
    });
  };

  // 後処理2: 夜勤が0人の日を保険として埋める
  const ensureAtLeastOneNightPerDay = (newShifts: Record<string, any>, allDates: Date[]) => {
    allDates.forEach((date) => {
      const dateStr = getIsoDate(date);
      const nightCount = staffList.filter((s) => {
        const cell = newShifts[`${s.id}_${dateStr}`];
        return cell && cell.type === 'NIGHT';
      }).length;

      if (nightCount > 0) return; // 既に夜勤がいる

      // 夜勤候補者を探す
      const candidates = staffList.filter((s: any) => {
        if (s.note === 'スポット勤務' || s.note === '休職') return false;
        if (s.constraints?.fixedTimeOnly) return false;
        if (s.constraints?.forbiddenTypes?.includes('NIGHT')) return false;

        const d0 = date;
        const d1 = new Date(date);
        d1.setDate(d1.getDate() + 1);

        const k0 = `${s.id}_${getIsoDate(d0)}`;
        const k1 = d1 <= END_DATE ? `${s.id}_${getIsoDate(d1)}` : null;

        const c0 = newShifts[k0];
        const c1 = k1 ? newShifts[k1] : null;

        const ok0 = !c0 || (!c0.isLocked && c0.type !== 'OFF' && c0.type !== 'EARLY' && c0.customText !== '明');
        const ok1 = !k1 || !c1 || (!c1.isLocked && c1.type !== 'OFF');

        return ok0 && ok1;
      });

      if (candidates.length === 0) return;

      // ランダムに1人選択して夜勤を配置
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      const d0 = date;
      const d1 = new Date(date);
      d1.setDate(d1.getDate() + 1);
      const d2 = new Date(date);
      d2.setDate(d2.getDate() + 2);

      const k0 = `${selected.id}_${getIsoDate(d0)}`;
      const k1 = d1 <= END_DATE ? `${selected.id}_${getIsoDate(d1)}` : null;
      const k2 = d2 <= END_DATE ? `${selected.id}_${getIsoDate(d2)}` : null;

      newShifts[k0] = { type: 'NIGHT', customText: '夜', isLocked: false };
      if (k1) newShifts[k1] = { type: 'EARLY', customText: '明', isLocked: false };
      if (k2) {
        const c2 = newShifts[k2];
        if (!c2 || !c2.isLocked) {
          newShifts[k2] = { type: 'OFF', customText: '休', isLocked: false };
        }
      }
    });
  };

  // 後処理3: 早番をちょうど1人に正規化
  const normalizeEarlyShiftPerDay = (newShifts: Record<string, any>, allDates: Date[]) => {
    allDates.forEach((date) => {
      const dateStr = getIsoDate(date);

      const staffCells = staffList.map((s) => ({
        staff: s,
        key: `${s.id}_${dateStr}`,
        cell: newShifts[`${s.id}_${dateStr}`],
      })).filter((x) => x.cell);

      const earlyCells = staffCells.filter((x) =>
        x.cell.customText === '早' || x.cell.customText === '7～16'
      );
      const earlyCount = earlyCells.length;

      // 0人 → 誰か1人入れる
      if (earlyCount === 0) {
        const candidates = staffList.filter((s: any) => {
          if (s.note === 'スポット勤務' || s.note === '休職') return false;
          if (s.constraints?.fixedTimeOnly) return false;
          if (s.constraints?.forbiddenTypes?.includes('EARLY')) return false;

          const cell = newShifts[`${s.id}_${dateStr}`];
          if (!cell) return true;
          if (!cell.isLocked && cell.type !== 'OFF' && cell.type !== 'NIGHT' && cell.type !== 'HOPE' && cell.type !== 'WINTER' && cell.customText !== '明') return true;
          return false;
        });

        if (candidates.length > 0) {
          const selected = candidates[Math.floor(Math.random() * candidates.length)];
          const key = `${selected.id}_${dateStr}`;
          newShifts[key] = { type: 'EARLY', customText: '早', isLocked: false };
        }
        return;
      }

      // 2人以上 → 1人だけ残して他をデフォルトシフトに戻す
      if (earlyCount > 1) {
        const keeper = earlyCells[0];
        const others = earlyCells.slice(1);

        others.forEach(({ staff, key }) => {
          const defaultShift = staff.constraints?.defaultShift ?? '9～18';
          const defaultText = normalizeShiftText(defaultShift);
          newShifts[key] = {
            type: 'DAY',
            customText: defaultText,
            isLocked: false,
          };
        });
      }
    });
  };

  const completeGeneration = () => {
    // AI生成前に既存の管理者ロックを保存（手動でロックしたセルを保護）
    const existingLocks: Record<string, any> = {};
    Object.keys(shifts).forEach(key => {
      const cell = shifts[key];
      if (cell && cell.isLocked) {
        existingLocks[key] = { ...cell };
      }
    });
    console.log('[DevShiftGeneration] Preserved', Object.keys(existingLocks).length, 'manually locked cells');

    const newShifts: any = {};
    const nightCandidates = getNightShiftCandidates(staffList);

    try {
      // 1. 固定スケジュール
      staffList.forEach(staff => {
        dates.forEach(date => {
          const key = `${staff.id}_${getIsoDate(date)}`;
          const dateStr = getIsoDate(date);
          const dayOfWeek = date.getDay();
          const isHolidayFlag = isHoliday(date);
          const cons = staff.constraints || {};

          let val = null;

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
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        const hasNight = staffList.some(s => {
          const cell = newShifts[`${s.id}_${keySuffix}`];
          return cell && (cell.type === 'NIGHT' || cell.customText === '夜');
        });

        if (!hasNight) {
          const candidates = [...nightCandidates].sort(() => 0.5 - Math.random());

          let assigned = false;
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

            const isS0Available = !s0 || (!s0.isLocked && s0.type !== 'OFF' && s0.type !== 'EARLY' && s0.customText !== '明');
            const isS1Available = !s1 || (!s1.isLocked && s1.type !== 'OFF' && s1.type !== 'HOPE' && s1.type !== 'WINTER');

            if (isS0Available && isS1Available) {
              newShifts[k0] = { type: 'NIGHT', customText: '夜', isLocked: false };
              if (s1 !== undefined) newShifts[k1] = { type: 'EARLY', customText: '明', isLocked: false };
              if (s2 !== undefined && (!s2 || !s2.isLocked)) {
                newShifts[k2] = { type: 'OFF', customText: '休', isLocked: false };
              }
              assigned = true;
              break;
            }
          }
        }
      }

      // 2.1 夜勤が0の日を強制的に埋めるフォールバック
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        const hasNight = staffList.some(s => {
          const cell = newShifts[`${s.id}_${keySuffix}`];
          return cell && (cell.type === 'NIGHT' || cell.customText === '夜');
        });
        if (hasNight) continue;

        // 通常ロジックで誰も入らなかった場合の保険
        const candidates = FULL_TIME_STAFF_IDS
          .map(id => staffList.find(s => s.id === id))
          .filter((s): s is any => !!s)
          .filter(s => !s.constraints?.fixedTimeOnly && s.note !== 'スポット勤務');

        for (const staff of candidates) {
          const staffId = staff.id;
          const d0 = date;
          const d1 = new Date(date);
          d1.setDate(d1.getDate() + 1);
          const d2 = new Date(date);
          d2.setDate(d2.getDate() + 2);

          const k0 = `${staffId}_${getIsoDate(d0)}`;
          const k1 = d1 <= END_DATE ? `${staffId}_${getIsoDate(d1)}` : null;
          const k2 = d2 <= END_DATE ? `${staffId}_${getIsoDate(d2)}` : null;

          const c0 = newShifts[k0];
          const c1 = k1 ? newShifts[k1] : null;
          const c2 = k2 ? newShifts[k2] : null;

          const ok0 = !c0 || (!c0.isLocked && c0.type !== 'OFF' && c0.type !== 'EARLY' && c0.customText !== '明');
          const ok1 = !k1 || !c1 || (!c1.isLocked && c1.type !== 'OFF');

          if (!ok0 || !ok1) continue;

          newShifts[k0] = { type: 'NIGHT', customText: '夜', isLocked: false };
          if (k1) newShifts[k1] = { type: 'EARLY', customText: '明', isLocked: false };
          if (k2 && (!c2 || !c2.isLocked)) {
            newShifts[k2] = { type: 'OFF', customText: '休', isLocked: false };
          }
          break;
        }
      }

      // 2.5 早番自動割り当て
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        const hasEarly = staffList.some(s => {
          const cell = newShifts[`${s.id}_${keySuffix}`];
          return cell && (
            cell.customText === '早' ||
            cell.customText === '7～16' // 新しい早番
          );
        });

        if (!hasEarly) {
          const availableStaff = staffList.filter((s: any) => {
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

      // 4.5. 遅番バックアップロジック（夜勤サイクルに干渉しない）
      const lateShiftFailures: string[] = []; // 配置できなかった日を記録
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

          // 夜勤サイクルチェック: 「夜」「明」「有」「有給」の場合は配置しない
          const canAssignToTarget = (id: string) => {
            const key = `${id}_${keySuffix}`;
            const cell = newShifts[key];

            // セルがロックされている、休み、夜勤、明け、有給の場合は配置不可
            if (cell && (cell.isLocked || cell.type === 'OFF' || cell.customText === '夜' || cell.customText === '明' || cell.customText === '有' || cell.customText === '有給')) {
              return false;
            }

            // 前日が夜勤の場合は配置不可（明けになる日）
            if (i > 0) {
              const prevDate = dates[i - 1];
              const prevKey = `${id}_${getIsoDate(prevDate)}`;
              const prevCell = newShifts[prevKey];
              if (prevCell && prevCell.customText === '夜') {
                return false;
              }
            }

            return true;
          };

          let assigned = false;

          // まず第一候補に配置を試みる
          if (canAssignToTarget(targetId)) {
            const key = `${targetId}_${keySuffix}`;
            newShifts[key] = { type: 'LATE', customText: '11～20', isLocked: false };
            assigned = true;
          } else {
            // 第一候補が不可なら第二候補を試す
            const altId = (backupId === '2') ? '4' : '2';
            if (canAssignToTarget(altId)) {
              const altKey = `${altId}_${keySuffix}`;
              newShifts[altKey] = { type: 'LATE', customText: '11～20', isLocked: false };
              assigned = true;
            }
          }

          // どちらも配置できなかった場合は記録
          if (!assigned) {
            lateShiftFailures.push(keySuffix);
          }
        }
      }

      // 遅番未配置の警告を状態に保存
      setLateShiftWarnings(lateShiftFailures);

      // 5. 残りの空欄を埋める（正社員は休日を9日に調整）
      staffList.forEach(staff => {
        let specialShiftCount = 0;

        // 正社員の場合、1月の現在の休日数をカウント
        let currentOffDays = 0;
        if (FULL_TIME_STAFF_IDS.includes(staff.id)) {
          dates.forEach(date => {
            if (date.getMonth() !== 0) return; // 1月のみ（0 = 1月）
            const key = `${staff.id}_${getIsoDate(date)}`;
            const cell = newShifts[key];
            if (cell && (cell.type === 'OFF' || cell.customText === '休')) {
              currentOffDays++;
            }
          });
        }

        dates.forEach((date, idx) => {
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
              if (FULL_TIME_STAFF_IDS.includes(staff.id) && date.getMonth() === 0) {
                currentOffDays++;
              }
            } else {
              // 正社員の場合、休日数を9日に近づける
              let shouldBeOff = false;

              if (FULL_TIME_STAFF_IDS.includes(staff.id) && date.getMonth() === 0) {
                if (currentOffDays < 9) {
                  // 休日が9日未満なら、休みを入れる確率を上げる
                  shouldBeOff = Math.random() > 0.3; // 70%の確率で休み
                } else if (currentOffDays >= 9) {
                  // 休日が9日以上なら、勤務にする
                  shouldBeOff = false;
                }
              }

              if (shouldBeOff) {
                newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
                currentOffDays++;
              } else {
                const cons = staff.constraints || {};
                let text = normalizeShiftText(cons.defaultShift || '9～18');

                if (cons.randomShifts && cons.randomShifts.length > 0) {
                  // その日に既に早番が入っているかチェック
                  const hasEarlyOnThisDay = staffList.some(s => {
                    const cell = newShifts[`${s.id}_${getIsoDate(date)}`];
                    return cell && (
                      cell.customText === '早' ||
                      cell.customText === '7～16'
                    );
                  });

                  // 早番が既に入っている場合は、'早'を除外したリストから選択
                  let availableShifts = cons.randomShifts;
                  if (hasEarlyOnThisDay) {
                    availableShifts = cons.randomShifts.filter(s => s !== '早');
                  }

                  if (availableShifts.length > 0) {
                    text = availableShifts[Math.floor(Math.random() * availableShifts.length)];
                  }
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
                  if (FULL_TIME_STAFF_IDS.includes(staff.id) && date.getMonth() === 0) {
                    currentOffDays++;
                  }
                } else if (cons.workDaysPerMonth && Math.random() > 0.8) {
                  newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
                  if (FULL_TIME_STAFF_IDS.includes(staff.id) && date.getMonth() === 0) {
                    currentOffDays++;
                  }
                } else {
                  newShifts[key] = { type: 'DAY', customText: text, isLocked: false };
                }
              }
            }
          }
        });
      });

      // 連勤カットの後処理
      staffList.forEach(staff => {
        let streak = 0;
        dates.forEach(date => {
          const key = `${staff.id}_${getIsoDate(date)}`;
          const cell = newShifts[key];

          const isWork = cell && !(cell.type === 'OFF' || cell.customText === '休');
          if (isWork) {
            streak++;
            if (streak > MAX_CONSECUTIVE_WORK_DAYS && !cell.isLocked) {
              // 5日目以降でロックされてないところは強制で休みにする
              newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
              streak = 0; // ここから新しいカウント
            }
          } else {
            streak = 0;
          }
        });
      });

      // ── 後処理 ──────────────────────
      // 1. 夜→明→休のサイクルを強制適用（大橋除く）
      enforceNightCycle(newShifts, dates);

      // 2. 夜勤0人日の保険（必要に応じて）
      ensureAtLeastOneNightPerDay(newShifts, dates);

      // 3. 早番をちょうど1人に正規化
      normalizeEarlyShiftPerDay(newShifts, dates);

      // 既存の管理者ロックを復元（手動でロックしたセルを保護）
      Object.keys(existingLocks).forEach(key => {
        newShifts[key] = existingLocks[key];
      });
      console.log('[DevShiftGeneration] Restored', Object.keys(existingLocks).length, 'manually locked cells');

      setShifts(newShifts);
      // 初期値を保存（元に戻したかどうかの判定に使用）
      setOriginalShifts(JSON.parse(JSON.stringify(newShifts)));
    } catch (e) {
      console.error("Generation Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // ポップアップを閉じる処理
  const closePopover = () => {
    setPopoverState((prev: any) => ({ ...prev, isOpen: false }));
  };

  const handleCellClick = (e: React.MouseEvent, staff: any, date: Date) => {
    const key = `${staff.id}_${getIsoDate(date)}`;
    const currentVal = shifts[key] || { type: 'OFF', customText: '', isLocked: false };
    if (editLockEnabled && currentVal.isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dateStr = getIsoDate(date);

    setPopoverState({
      isOpen: true,
      staffId: staff.id,
      date: date,
      dateStr: dateStr,
      staffName: staff.name,
      targetRect: rect,
      currentValue: currentVal
    });
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, staff: any, date: Date) => {
    e.preventDefault();
    const key = `${staff.id}_${getIsoDate(date)}`;
    const currentVal = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

    if (editLockEnabled && currentVal.isLocked) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      staffId: staff.id,
      date: date
    });
    closePopover();
  };

  const applyQuickShift = (type: string, customText: string) => {
    if (!contextMenu) return;
    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;

    setShifts((prev: any) => {
      const prevCell = prev[key];

      // 「実際の稼働シフト」モードの場合、夜勤以外はeditedInActualModeをtrueに設定
      const isNightShift = customText === '夜' || type === 'NIGHT';

      // 初期値と比較して、元に戻したかどうかを判定（クリアも含む）
      const originalCell = originalShifts[key];
      const isRevertedToOriginal = originalCell && originalCell.customText === customText;

      // 元に戻した場合のみfalse、それ以外（クリア含む）はモードに応じて設定
      const shouldMarkEdited = actualOperationMode && !isNightShift && !isRevertedToOriginal;

      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          type,
          customText,
          isLocked: false,
          // 元に戻した場合のみfalse、それ以外はモードに応じて設定
          editedInActualMode: isRevertedToOriginal ? false : (shouldMarkEdited ? true : prev[key]?.editedInActualMode)
        }
      };

      const nextDay = new Date(contextMenu.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${contextMenu.staffId}_${getIsoDate(nextDay)}`;
      const nextDayCell = prev[nextDayKey];

      // 夜勤を入力した場合、翌日に自動的に「明け」を設定
      if (isNightShift) {
        // 翌日がまだ設定されていない、または休みの場合のみ「明け」を設定
        if (!nextDayCell || nextDayCell.type === 'OFF' || !nextDayCell.customText || nextDayCell.customText === '休') {
          // 「実際の稼働シフト」モードの場合、「明け」にeditedInActualModeをマーク
          updated[nextDayKey] = {
            type: 'DAY',
            customText: '明',
            isLocked: false,
            editedInActualMode: actualOperationMode ? true : false
          };
        }
      }
      // 夜勤を削除した場合、翌日の「明け」も削除
      else if (prevCell && (prevCell.customText === '夜' || prevCell.type === 'NIGHT')) {
        // 翌日が「明け」の場合のみ削除
        if (nextDayCell && nextDayCell.customText === '明') {
          updated[nextDayKey] = { type: 'OFF', customText: '', isLocked: false, editedInActualMode: false };
        }
      }

      return updated;
    });

    setContextMenu(null);
  };

  const applyAdminLock = () => {
    if (!contextMenu) return;
    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;
    const currentVal = shifts[key] || { type: 'OFF', customText: '', isLocked: false };
    // 現在の値を保持したまま、isLockedをtrueに設定
    setShifts((prev: any) => ({
      ...prev,
      [key]: { ...currentVal, isLocked: true }
    }));
    setContextMenu(null);
  };

  const saveShiftChange = (newVal: any) => {
    if (!popoverState.staffId) return;
    const key = `${popoverState.staffId}_${getIsoDate(popoverState.date)}`;

    setShifts((prev: any) => {
      const prevCell = prev[key];

      // 「実際の稼働シフト」モードの場合、夜勤以外はeditedInActualModeをtrueに設定
      const isNightShift = newVal.customText === '夜' || newVal.type === 'NIGHT';

      // 初期値と比較して、元に戻したかどうかを判定（クリアも含む）
      const originalCell = originalShifts[key];
      const isRevertedToOriginal = originalCell && originalCell.customText === newVal.customText;

      // 元に戻した場合のみfalse、それ以外（クリア含む）はモードに応じて設定
      const shouldMarkEdited = actualOperationMode && !isNightShift && !isRevertedToOriginal;

      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          ...newVal,
          // 元に戻した場合のみfalse、それ以外はモードに応じて設定
          editedInActualMode: isRevertedToOriginal ? false : (shouldMarkEdited ? true : prev[key]?.editedInActualMode)
        }
      };

      const nextDay = new Date(popoverState.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = `${popoverState.staffId}_${getIsoDate(nextDay)}`;
      const nextDayCell = prev[nextDayKey];

      // 夜勤を入力した場合、翌日に自動的に「明け」を設定
      if (isNightShift) {
        // 翌日がまだ設定されていない、または休みの場合のみ「明け」を設定
        if (!nextDayCell || nextDayCell.type === 'OFF' || !nextDayCell.customText || nextDayCell.customText === '休') {
          // 「実際の稼働シフト」モードの場合、「明け」にeditedInActualModeをマーク
          updated[nextDayKey] = {
            type: 'DAY',
            customText: '明',
            isLocked: false,
            editedInActualMode: actualOperationMode ? true : false
          };
        }
      }
      // 夜勤を削除した場合、翌日の「明け」も削除
      else if (prevCell && (prevCell.customText === '夜' || prevCell.type === 'NIGHT')) {
        // 翌日が「明け」の場合のみ削除
        if (nextDayCell && nextDayCell.customText === '明') {
          updated[nextDayKey] = { type: 'OFF', customText: '', isLocked: false, editedInActualMode: false };
        }
      }

      return updated;
    });

    closePopover();
  };

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

  const getDayStyle = (day: number) => {
    if (day === 0) return { color: '#b91c1c', backgroundColor: '#fef2f2' };
    if (day === 6) return { color: '#1d4ed8', backgroundColor: '#eff6ff' };
    return { color: '#334155', backgroundColor: '#f1f5f9' };
  };

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
            <div className="flex justify-between text-xs text-slate-400 font-mono mt-2">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* データ読み込み中ローディング */}
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

      {/* AIチェック中ローディング */}
      {isChecking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl text-center border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">AIシフトチェック中</h2>
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
              <Sparkles className="animate-pulse text-purple-600 relative z-10" size={56} />
            </div>
            <p className="text-slate-600 mb-6 font-medium text-lg">シフトを分析しています...</p>
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

      {popoverState.isOpen && popoverState.targetRect && popoverState.date && (() => {
        const POPOVER_HEIGHT = 450; // ポップアップの推定高さ
        const POPOVER_WIDTH = 320; // w-80 = 320px

        // セルの右側に配置（12px余白）
        const popoverLeft = popoverState.targetRect.right + window.scrollX + 12;

        // 画面からはみ出る場合は左側に表示
        const showOnLeft = (popoverState.targetRect.right + POPOVER_WIDTH + 12) > window.innerWidth;
        const adjustedLeft = showOnLeft
          ? popoverState.targetRect.left + window.scrollX - POPOVER_WIDTH - 12
          : popoverLeft;

        // セルの垂直中央に合わせる
        const cellCenterY = popoverState.targetRect.top + popoverState.targetRect.height / 2;
        const popoverTop = cellCenterY + window.scrollY - POPOVER_HEIGHT / 2;

        // 画面からはみ出さないように調整
        const adjustedTop = Math.max(10, Math.min(popoverTop, window.scrollY + window.innerHeight - POPOVER_HEIGHT - 10));

        // 三角形の位置を計算（ポップアップの上端からの距離）
        const arrowOffset = Math.max(20, Math.min(cellCenterY - (adjustedTop - window.scrollY), POPOVER_HEIGHT - 20));

        return (
          <div
            className="shift-popover absolute z-50 bg-white border-2 border-indigo-300 shadow-2xl rounded-xl p-5 w-80 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-indigo-100"
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

      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-30 print:hidden shadow-lg flex-none h-20">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/10">
            <Calendar size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              シフト管理 <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono border border-slate-700">PRO</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <span>2026年1月度</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>{FACILITY_NAME}</span>
            </p>
            {loadedShiftName && (
              <p className="text-sm font-medium mt-1.5 flex items-center gap-2">
                {isInheritMode ? (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30 font-bold text-xs">
                    12月から引き継ぎ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-bold text-xs">
                    編集中
                  </span>
                )}
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
            onClick={startFakeAIGeneration}
            className="flex items-center gap-2 px-5 py-2 bg-white text-indigo-900 rounded-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl text-xs font-extrabold border border-transparent hover:border-indigo-200"
          >
            <Settings size={14} className="animate-spin-slow text-indigo-600" />
            AI自動生成
          </button>

          <button
            onClick={handleUndo}
            disabled={!previousShifts}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl text-xs font-extrabold border border-transparent ${
              previousShifts
                ? 'bg-orange-500 text-white hover:bg-orange-600 hover:border-orange-300'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={previousShifts ? 'AI生成前の状態に戻す' : '戻せる状態がありません'}
          >
            <Undo size={14} />
            一つ前に戻す
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
            onClick={handleAICheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all shadow-lg hover:shadow-purple-500/30 text-xs font-bold border border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            AIチェック
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

          {/* AIチェック結果表示 */}
          {checkResult && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AIチェック結果
                </h2>
                <button
                  onClick={() => setCheckResult(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* サマリー */}
              <div className={`p-4 rounded-xl border-2 mb-4 ${checkResult.violations.length === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
                }`}>
                <div className="flex items-start gap-3">
                  {checkResult.violations.length === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-2">
                      {checkResult.violations.length === 0 ? '✅ 問題なし' : `⚠️ ${checkResult.violations.length}件の問題が見つかりました`}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{checkResult.summary_ja}</p>
                  </div>
                </div>
              </div>

              {/* 違反リスト */}
              {checkResult.violations.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">検出された問題:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {checkResult.violations.map((violation: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${violation.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          {violation.severity === 'error' ? (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 text-sm">
                            <p className="font-semibold">{violation.employee_name}</p>
                            <p className="text-gray-600">{violation.date}</p>
                            <p className="mt-1">{violation.description_ja}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 改善提案 */}
              {checkResult.suggested_changes && checkResult.suggested_changes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">AIからの改善提案:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {checkResult.suggested_changes.map((change: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-sm space-y-1">
                          <p className="font-semibold">{change.employee_name} - {change.date}</p>
                          <p className="text-gray-600">
                            <span className="line-through">{change.old_shift}</span>
                            {' → '}
                            <span className="text-blue-600 font-semibold">{change.new_shift}</span>
                          </p>
                          <p className="text-gray-700">{change.reason_ja}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 border-b-2 border-slate-800 pb-4 print:mb-2 print:hidden">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-widest mb-2">
                  {START_DATE.getFullYear()}年{START_DATE.getMonth() + 1}月　{FACILITY_NAME}　勤務表
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
                <div className="mt-1 text-slate-400 font-mono text-[10px]">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* 印刷専用コンテナ */}
          <div id="print-root">
            {/* 印刷専用ヘッダー */}
            <h1 id="print-title" className="print-header print-only">
              {START_DATE.getFullYear()}年{START_DATE.getMonth() + 1}月　{FACILITY_NAME}　勤務表
            </h1>

            <div id="grid-wrapper" className={`shift-print-root print:overflow-visible print:h-auto ${printPreview ? 'overflow-visible m-0 p-0 w-full h-auto flex justify-center' : 'h-auto'}`}>
              {/* PDF専用タイトル - 通常時は非表示、PDF出力時のみ表示 */}
              <div className="hidden pdf-title-header">
                <h1 className="text-2xl font-bold text-center py-4 text-slate-900">
                  {START_DATE.getFullYear()}年{START_DATE.getMonth() + 1}月　{FACILITY_NAME}　勤務表
                </h1>
              </div>

            <table className="min-w-max text-center border-collapse border border-slate-900 text-lg print:text-[8px] font-serif leading-tight relative table-auto mx-auto print:mx-0 print:table-fixed">
              <thead>
                <tr className="bg-slate-50 print:bg-transparent" style={{ height: `${eventRowHeight}px` }}>
                  <th className="border border-slate-600 font-bold bg-white text-slate-700 w-30 min-w-[280px]" colSpan={2}>
                    行事予定
                  </th>

                  {dates.map(date => {
                    const dateStr = getIsoDate(date);
                    const isEditing = editingEventDate === dateStr;
                    const eventText = customEvents[dateStr] !== undefined ? customEvents[dateStr] : getEventName(date);

                    return (
                      <td
                        key={date.toString()}
                        className="border border-slate-600 text-[9px] text-slate-700 font-medium p-0.5 bg-slate-50 print:bg-transparent !w-[105px] !min-w-[105px] !max-w-[105px] cursor-pointer hover:bg-blue-50 print:cursor-default"
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
                  {/* 左上の「氏名」セル */}
                  <th className="border border-slate-600 p-1 w-30 min-w-[150px] bg-white print:bg-white font-bold text-slate-800 sticky left-0 top-0 z-30 shadow-lg border-r border-b-2 border-r-slate-600 border-b-slate-700">氏名</th>
                  {/* 資格列 */}
                  <th className="border border-slate-600 p-1 w-24 min-w-[130px] bg-white print:bg-white font-bold text-slate-800 sticky left-[150px] top-0 z-30 shadow-lg border-r-2 border-b-2 border-r-slate-700 border-b-slate-700">資格</th>

                  {dates.map(date => {
                    const day = date.getDay();
                    const style = getDayStyle(day);
                    return (
                      <th key={date.toString()} className="border border-slate-600 !w-[90px] !min-w-[90px] !max-w-[90px] sticky top-0 z-20" style={{ ...style, borderBottomWidth: '2px' }}>
                        <div className="flex flex-col justify-center h-full">
                          <span className="text-sm font-bold font-mono">{date.getDate()}</span>
                          <span className="text-[10px] font-bold opacity-70">
                            {['日', '月', '火', '水', '木', '金', '土'][day]}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="border border-slate-600 !w-[270px] !min-w-[270px] !max-w-[270px] bg-indigo-50 text-indigo-900 font-bold border-l-2 border-l-slate-800 print:hidden px-3 sticky top-0 z-20">日数</th>
                  <th className="border border-slate-600 !w-[270px] !min-w-[270px] !max-w-[270px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-3 sticky top-0 z-20">時間</th>
                  <th className="border border-slate-600 !w-[270px] !min-w-[270px] !max-w-[270px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-3 sticky top-0 z-20">夜勤</th>
                  <th className="border border-slate-600 !w-[270px] !min-w-[270px] !max-w-[270px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-3 sticky top-0 z-20">休日</th>
                  <th className="border border-slate-600 !w-[270px] !min-w-[270px] !max-w-[270px] bg-indigo-50 text-indigo-900 font-bold print:hidden px-3 sticky top-0 z-20">有給</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => {
                  const stats = staffStats[staff.id] || { days: 0, hours: 0, nightCount: 0, holidays: 0, paidHolidays: 0 };
                  return (
                    <tr key={staff.id} className="hover:bg-yellow-50 print:hover:bg-transparent h-12 transition-colors">
                      {/* 氏名列 */}
                      <td className="border border-slate-600 px-2 text-left whitespace-nowrap font-bold text-slate-800 bg-white sticky left-0 z-10 shadow-lg border-r border-r-slate-600 w-30 min-w-[150px]">
                        {staff.name}
                      </td>
                      {/* 資格列 */}
                      <td className="border border-slate-600 px-2 text-left text-xs whitespace-nowrap text-slate-700 bg-white border-r-2 border-r-slate-700 w-24 min-w-[130px]">
                        {staff.qualification}
                      </td>
                      {dates.map(date => {
                        const key = `${staff.id}_${getIsoDate(date)}`;
                        const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

                        const isLocked = cellData.isLocked;
                        const isLockedAndActive = isLocked && editLockEnabled;

                        let textColor = 'text-slate-900';

                        const lockPatternClass = isLockedAndActive
                          ? 'bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_5px,#f1f5f9_5px,#f1f5f9_10px)]'
                          : '';

                        const styles: any = {};

                        if (cellData.customText === '休' || cellData.customText === '休職') {
                          styles.color = '#dc2626'; // 赤色
                          // ロックありはほぼ白に近い薄いピンク、ロックなしは白
                          styles.backgroundColor = isLockedAndActive ? '#fef7fb' : '#ffffff'; // ほぼ白のピンク : 白
                        }
                        else if (cellData.customText === '有' || cellData.customText === '有給') {
                          styles.color = '#9a3412'; // オレンジ文字（濃く）
                          styles.backgroundColor = '#fed7aa'; // オレンジ背景（オレンジ200）
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
                          styles.backgroundColor = isLockedAndActive ? '#6ee7b7' : '#86efac'; // Green 300（濃く）
                        }
                        else if (cellData.customText === '遅' || cellData.customText.startsWith('11') || cellData.customText.startsWith('18')) {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#fb923c' : '#fdba74'; // Orange 300（濃く）
                        }
                        else if (cellData.customText === '冬') {
                          styles.color = '#1e40af';
                          styles.backgroundColor = isLockedAndActive ? '#bfdbfe' : '#dbeafe';
                        }
                        else if (cellData.customText === '日A' || cellData.customText === '8～17' || cellData.customText === '8-17') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#bae6fd' : '#e0f2fe'; // Sky 100 (薄い水色系)
                        }
                        else if (cellData.customText === '日B' || cellData.customText === '9～18' || cellData.customText === '9-18') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#f472b6' : '#f9a8d4'; // Pink 300（濃く）
                        }

                        // 「実際の稼働シフト」モードで編集されたセルは蛍光黄色背景＋枠線（夜勤は除く）
                        if (cellData.editedInActualMode && cellData.customText !== '夜') {
                          styles.backgroundColor = '#fef08a'; // yellow-200（蛍光黄色）
                          styles.color = '#1f2937'; // 文字色は濃いグレー
                          styles.boxShadow = 'inset 0 0 0 2px #ca8a04'; // yellow-600の細い枠線
                        }

                        const isNightPrint = cellData.customText === '夜';

                        // 現在のセル位置
                        const currentDateStr = getIsoDate(date);

                        // ポップアップで選択中のセルかどうか
                        const isPopoverCell = popoverState.isOpen &&
                          String(staff.id) === String(popoverState.staffId) &&
                          popoverState.dateStr &&
                          currentDateStr === popoverState.dateStr;

                        // ハイライトを適用
                        if (isPopoverCell) {
                          // ポップアップ表示中のセルのみ：濃い青色のハイライトと枠線
                          if (!styles.backgroundColor) {
                            styles.backgroundColor = '#dbeafe'; // blue-100
                          }
                          styles.boxShadow = 'inset 0 0 0 3px #3b82f6'; // blue-500の太い枠線効果
                        }

                        return (
                          <td
                            key={key}
                            onClick={(e) => handleCellClick(e, staff, date)}
                            onContextMenu={(e) => handleContextMenu(e, staff, date)}
                            className={`
                            border border-slate-600 p-0 overflow-hidden relative z-[1]
                            !w-[105px] !min-w-[105px] !max-w-[105px]
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
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 border-l-2 border-l-slate-800 print:hidden !w-[270px] !min-w-[270px] !max-w-[270px] text-center px-3">{stats.days}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[270px] !min-w-[270px] !max-w-[270px] text-center px-3">{stats.hours}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[270px] !min-w-[270px] !max-w-[270px] text-center px-3">{stats.nightCount}</td>
                      <td className={`border border-slate-600 font-mono bg-slate-50 print:hidden !w-[270px] !min-w-[270px] !max-w-[270px] text-center px-3 ${FULL_TIME_STAFF_IDS.includes(staff.id) && stats.holidays < 9 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{stats.holidays}</td>
                      <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden !w-[270px] !min-w-[270px] !max-w-[270px] text-center px-3">{stats.paidHolidays}</td>
                    </tr>
                  );
                })}

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
                  <td className="border border-slate-600 bg-indigo-900 text-yellow-300 font-bold px-2 sticky left-0 z-30 shadow-md text-base" colSpan={2}>
                    配置判定
                  </td>
                  {dates.map(date => {
                    const dateIso = getIsoDate(date);
                    const result = sufficiencyData[dateIso];
                    let bgClass = "bg-emerald-50";

                    // 背景色の決定（信号機式）
                    if (result && result.maxShortage >= 2) {
                      bgClass = "bg-red-100"; // 赤: 深刻（正社員不足 or -2人以上）
                    } else if (result && result.maxShortage >= 1) {
                      bgClass = "bg-yellow-100"; // 黄: 注意（-1人不足）
                    }

                    const hasIssues = result && (
                      result.fullTimeShortages.length > 0 ||
                      result.criticalShortages.length > 0 ||
                      result.minorShortages.length > 0
                    );

                    return (
                      <td key={date.toString()} className={`border border-slate-600 text-[10px] align-top p-1.5 !w-[90px] !min-w-[90px] !max-w-[90px] ${bgClass}`}>
                        {hasIssues ? (
                          <div className="flex flex-col gap-1">
                            {/* 正社員不足（最優先・赤） */}
                            {result.fullTimeShortages.length > 0 && (
                              <div className="bg-red-600 text-white px-1 py-0.5 rounded text-[9px] font-bold">
                                正社員不足
                              </div>
                            )}
                            {result.fullTimeShortages.map((range, i) => (
                              <div key={`ft-${i}`} className="text-red-700 font-semibold leading-tight">
                                {range}
                              </div>
                            ))}

                            {/* 深刻な人数不足（-2人以上・赤） */}
                            {result.criticalShortages.length > 0 && (
                              <div className="bg-orange-600 text-white px-1 py-0.5 rounded text-[9px] font-bold mt-1">
                                -2人以上
                              </div>
                            )}
                            {result.criticalShortages.map((range, i) => (
                              <div key={`cr-${i}`} className="text-orange-700 font-semibold leading-tight">
                                {range}
                              </div>
                            ))}

                            {/* 軽度の人数不足（-1人・黄） */}
                            {result.minorShortages.length > 0 && result.criticalShortages.length === 0 && result.fullTimeShortages.length === 0 && (
                              <div className="bg-yellow-600 text-white px-1 py-0.5 rounded text-[9px] font-bold">
                                -1人
                              </div>
                            )}
                            {result.minorShortages.map((range, i) => (
                              <div key={`mn-${i}`} className="text-yellow-800 font-medium leading-tight">
                                {range}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-emerald-600 font-bold text-sm">✓</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td colSpan={5} className="border border-slate-600 bg-slate-100"></td>
                </tr>
                {lateShiftWarnings.length > 0 && (
                  <tr className="h-10">
                    <td className="border border-slate-600 bg-red-100 text-red-800 font-bold px-2 sticky left-0 z-30 shadow-md" colSpan={2}>
                      遅番未配置
                    </td>
                    {dates.map(date => {
                      const dateIso = getIsoDate(date);
                      const isWarning = lateShiftWarnings.includes(dateIso);
                      return (
                        <td key={date.toString()} className={`border border-slate-600 text-center !w-[90px] !min-w-[90px] !max-w-[90px] ${isWarning ? 'bg-red-200 text-red-900 font-bold' : 'bg-white'}`}>
                          {isWarning ? '⚠' : ''}
                        </td>
                      );
                    })}
                    <td colSpan={5} className="border border-slate-600 bg-slate-100"></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
        </div>
      </main>

      {/* Legend - fixed at bottom left */}
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

      {/* 保存モーダル */}
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
                disabled={saveMode === 'overwrite' && loadedShiftId}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg ${
                  saveMode === 'overwrite' && loadedShiftId
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200'
                    : 'border-gray-300'
                }`}
                placeholder="例: 1月シフト_20260115_001"
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

      <style>{`
        /* PDF Export Mode - dom-to-image-more用の一時スタイル */
        .pdf-export-mode {
          /* 1. スクロールバーを削除（コンテナを展開） */
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          width: auto !important;
          max-width: none !important;
        }

        /* PDF専用タイトルを表示 */
        .pdf-export-mode .pdf-title-header {
          display: block !important;
        }

        /* 全要素のノイズ（灰色の枠・影）を除去 */
        .pdf-export-mode * {
          box-shadow: none !important;
        }

        /* セル自体は罫線を保持（これがテーブルの区切り線） */
        .pdf-export-mode th,
        .pdf-export-mode td {
          position: static !important;
          border: 1px solid #94a3b8 !important; /* slate-400 */
        }

        /* セル内部の要素（div, span等）の装飾を完全除去 */
        .pdf-export-mode td > *,
        .pdf-export-mode th > * {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          ring: 0 !important;
          background-color: transparent !important; /* 背景色は親セルに任せる */
        }

        /* セル内部の更に深い要素も装飾除去 */
        .pdf-export-mode td > * > *,
        .pdf-export-mode th > * > * {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          ring: 0 !important;
          background-color: transparent !important;
        }

        /* 氏名列（1列目）を広げて全表示 */
        .pdf-export-mode th:nth-child(1),
        .pdf-export-mode td:nth-child(1) {
          min-width: 150px !important;
          width: auto !important;
          white-space: nowrap !important;
        }

        /* 資格列（2列目）の表示設定 */
        .pdf-export-mode th:nth-child(2),
        .pdf-export-mode td:nth-child(2) {
          min-width: 100px !important;
          width: 100px !important;
          white-space: nowrap !important;
        }

        /* 日付列のサイズ調整と改行対応 */
        .pdf-export-mode th:nth-child(n+3):not(.print\\:hidden),
        .pdf-export-mode td:nth-child(n+3):not(.print\\:hidden) {
          min-width: 70px !important;
          max-width: 70px !important;
          width: 70px !important;
          white-space: pre-wrap !important; /* 改行を反映 */
          line-height: 1.2 !important;
        }

        /* PDF Print Styles v3.0 - Updated */
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background-color: white !important;
          }

          main {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          main > div {
            zoom: 1 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 2mm 0 !important;
            margin: 0 !important;
          }

          #grid-wrapper {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
          }

          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }

          table {
            border: 1px solid #333 !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            width: auto !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            table-layout: auto !important;
            font-size: 6.5px !important;
          }

          table th,
          table td {
            border: 1px solid #333 !important;
            padding: 1px !important;
            line-height: 1.1 !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            position: static !important;
            left: auto !important;
            box-shadow: none !important;
          }

          /* Tailwindの幅クラスを全て上書き */
          table th[class*="w-"],
          table td[class*="w-"],
          table th[class*="min-w-"],
          table td[class*="min-w-"],
          table th[class*="max-w-"],
          table td[class*="max-w-"] {
            width: auto !important;
            min-width: auto !important;
            max-width: none !important;
          }

          /* A4横向きに収めるため全セル幅を固定 */
          /* 合計: 氏名90 + 資格70 + 日付36x22 = 952px (A4横に収まる) */

          /* 1列目: 氏名列 */
          table thead tr th:nth-child(1),
          table tbody tr td:nth-child(1) {
            width: 90px !important;
            min-width: 90px !important;
            max-width: 90px !important;
          }

          /* 2列目: 資格列 */
          table thead tr th:nth-child(2),
          table tbody tr td:nth-child(2) {
            width: 70px !important;
            min-width: 70px !important;
            max-width: 70px !important;
          }

          /* 3列目以降: 日付列（統計列は印刷時非表示なので無視） */
          table thead tr:nth-child(2) th:nth-child(n+3):not([class*="print:hidden"]),
          table tbody tr td:nth-child(n+3):not([class*="print:hidden"]) {
            width: 22px !important;
            min-width: 22px !important;
            max-width: 22px !important;
          }

          /* 行事予定行（1行目、colSpan=2） */
          table thead tr:first-child th:first-child {
            width: 160px !important;
            min-width: 160px !important;
          }

          h1 {
            font-size: 12px !important;
            margin: 2px 0 3px 0 !important;
          }

          tbody tr {
            page-break-inside: avoid !important;
          }

          table thead {
            display: table-header-group !important;
          }
        }

        .print-preview-mode header {
          display: flex;
        }
        .print-preview-mode main {
          max-width: 297mm;
          margin: 0 auto;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
}
