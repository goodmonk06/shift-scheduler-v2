/**
 * シフト編集UI V2 - 型定義
 *
 * 要件：
 * - Excelライクな操作性
 * - 即時保存（保存ボタン不要）
 * - 複数セル編集対応
 */

// ==========================================
// 1. シフト種別マスタ
// ==========================================

export type ShiftType =
  | 'YAKIN_AKE'    // 夜勤明け 明
  | 'HAYABAN'      // 早番 早
  | 'NIKKIN_A'     // 日勤A 日A
  | 'NIKKIN_B'     // 日勤B 日B
  | 'OSOBAN'       // 遅番 遅
  | 'YAKIN_IRI'    // 夜勤入り 夜
  | 'PART'         // パート（自由時間）
  | 'JIMU'         // 事務員（自由時間）
  | 'OFF'          // 休み 休
  | 'PAID_LEAVE';  // 有給 有

export type ShiftSource = 'HOPE' | 'RULE_AUTO' | 'AI_AUTO' | 'MANUAL';

// シフト種別の詳細情報
export interface ShiftTypeMaster {
  type: ShiftType;
  label: string;           // 画面表示名
  code: string;            // 短縮表記
  defaultStartTime?: string; // デフォルト開始時刻
  defaultEndTime?: string;   // デフォルト終了時刻
  color: string;           // 背景色
  textColor?: string;      // 文字色
  category: 'fixed' | 'leave' | 'flexible'; // カテゴリ
  requiresTimeInput?: boolean; // 時間入力が必要か
  isNightShift?: boolean;      // 夜勤系か
}

// シフト種別マスタデータ
export const SHIFT_TYPE_MASTER: Record<ShiftType, ShiftTypeMaster> = {
  YAKIN_AKE: {
    type: 'YAKIN_AKE',
    label: '夜勤明け',
    code: '明',
    defaultStartTime: '00:00',
    defaultEndTime: '09:00',
    color: '#e3f2fd',
    textColor: '#1976d2',
    category: 'fixed',
    isNightShift: true
  },
  HAYABAN: {
    type: 'HAYABAN',
    label: '早番',
    code: '早',
    defaultStartTime: '06:00',
    defaultEndTime: '15:00',
    color: '#fff3e0',
    textColor: '#f57c00',
    category: 'fixed'
  },
  NIKKIN_A: {
    type: 'NIKKIN_A',
    label: '日勤A',
    code: '日A',
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    color: '#e8f5e9',
    textColor: '#388e3c',
    category: 'fixed'
  },
  NIKKIN_B: {
    type: 'NIKKIN_B',
    label: '日勤B',
    code: '日B',
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    color: '#f3e5f5',
    textColor: '#7b1fa2',
    category: 'fixed'
  },
  OSOBAN: {
    type: 'OSOBAN',
    label: '遅番',
    code: '遅',
    defaultStartTime: '11:00',
    defaultEndTime: '20:00',
    color: '#fce4ec',
    textColor: '#c2185b',
    category: 'fixed'
  },
  YAKIN_IRI: {
    type: 'YAKIN_IRI',
    label: '夜勤入り',
    code: '夜',
    defaultStartTime: '16:00',
    defaultEndTime: '24:00',
    color: '#3f51b5',
    textColor: '#ffffff',
    category: 'fixed',
    isNightShift: true
  },
  PART: {
    type: 'PART',
    label: 'パート',
    code: 'P',
    color: '#f5f5f5',
    textColor: '#616161',
    category: 'flexible',
    requiresTimeInput: true
  },
  JIMU: {
    type: 'JIMU',
    label: '事務員',
    code: 'J',
    color: '#efebe9',
    textColor: '#5d4037',
    category: 'flexible',
    requiresTimeInput: true
  },
  OFF: {
    type: 'OFF',
    label: '休み',
    code: '休',
    color: '#eceff1',
    textColor: '#455a64',
    category: 'leave'
  },
  PAID_LEAVE: {
    type: 'PAID_LEAVE',
    label: '有給',
    code: '有',
    color: '#fff9c4',
    textColor: '#f57f17',
    category: 'leave'
  }
};

// ==========================================
// 2. セルデータ構造
// ==========================================

export interface ShiftCell {
  employeeId: number;      // 職員ID（内部ID）
  date: string;            // 日付 'YYYY-MM-DD'
  shiftType: ShiftType | null; // null = 空白
  startTime?: string;      // 開始時刻 'HH:MM'
  endTime?: string;        // 終了時刻 'HH:MM'
  isLocked: boolean;       // ロック（AI再生成で動かさない）
  isHope: boolean;         // 希望休・希望シフト
  source: ShiftSource;     // データソース
  note?: string;           // メモ
  hasWarning?: boolean;    // 警告あり
  warningMessage?: string; // 警告メッセージ
}

// ==========================================
// 3. 職員情報（テーブル行）
// ==========================================

export interface EmployeeRowData {
  id: number;              // 内部ID
  employeeId: string;      // 表示用ID（0000など）
  name: string;            // 氏名
  position: string;        // 職種・資格（介護福祉士/実務者/初任者）
  employmentType: string;  // 雇用区分（正社員/パート/事務員）
  canWorkNightShift: boolean; // 夜勤可能
  skillLevel: number;      // スキルレベル
  orderIndex: number;      // 表示順
}

// ==========================================
// 4. 日別サマリー（フッター用）
// ==========================================

export interface DaySummary {
  date: string;                   // 日付
  daytimeCount: number;           // 日中の人数（一部除く）
  totalStaff: number;             // 総人数
  shortageByBand: {               // 時間帯別の過不足
    band: 'early' | 'daytime' | 'late' | 'night';
    label: string;                // 表示ラベル
    required: number;             // 必要人数
    actual: number;               // 実際の人数
    diff: number;                 // 差分（マイナス = 不足）
  }[];
  events: string[];               // 行事・メモ（給食委員会、人手不足など）
  hasShortage: boolean;          // 不足があるか
}

// ==========================================
// 5. UI制御用の型
// ==========================================

// 表示モード
export type DisplayMode = 'code' | 'time' | 'both'; // コード表示/時間表示/両方

// フィルタ設定
export interface FilterSettings {
  highlightHope: boolean;        // 希望休を強調
  highlightAI: boolean;          // AI生成セルをハイライト
  highlightShortage: boolean;    // 不足日を色付き
  showOnlyProblems: boolean;     // 問題のあるセルのみ表示
}

// セル選択状態
export interface CellSelection {
  startCell: { employeeId: number; date: string } | null;
  endCell: { employeeId: number; date: string } | null;
  selectedCells: Set<string>; // 'employeeId-date' 形式
}

// 塗りつぶしモード
export interface PaintMode {
  active: boolean;
  shiftType: ShiftType | null;
  overwriteHope: boolean;       // 希望休を上書きするか
}

// ポップオーバー状態
export interface PopoverState {
  isOpen: boolean;
  targetCell: { employeeId: number; date: string } | null;
  position: { x: number; y: number };
}

// ==========================================
// 6. API通信用の型
// ==========================================

// シフト更新リクエスト
export interface UpdateShiftCellRequest {
  shiftId: number;
  employeeId: number;
  date: string;
  shiftType: ShiftType | null;
  startTime?: string;
  endTime?: string;
  isHope?: boolean;
  isLocked?: boolean;
  note?: string;
}

// バッチ更新リクエスト
export interface BatchUpdateShiftRequest {
  shiftId: number;
  updates: UpdateShiftCellRequest[];
}

// シフトバリデーション結果
export interface ShiftValidationResult {
  valid: boolean;
  errors: {
    employeeId: number;
    date: string;
    type: 'consecutive' | 'nightshift' | 'overlap' | 'required';
    message: string;
  }[];
  warnings: {
    employeeId: number;
    date: string;
    type: string;
    message: string;
  }[];
}

// ==========================================
// 7. ユーティリティ関数の型
// ==========================================

// セルキー生成
export const getCellKey = (employeeId: number, date: string): string =>
  `${employeeId}-${date}`;

// セルキーから情報取得
export const parseCellKey = (key: string): { employeeId: number; date: string } => {
  const [employeeId, date] = key.split('-');
  return { employeeId: parseInt(employeeId), date };
};

// 日付範囲生成
export const getDateRange = (year: number, month: number): string[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
};

// 曜日取得
export const getDayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
};

// 時間フォーマット（9:00 -> 09:00）
export const formatTime = (time: string): string => {
  const [hour, minute] = time.split(':');
  return `${hour.padStart(2, '0')}:${minute || '00'}`;
};

// 時間表示の短縮形（09:00-17:00 -> 9-17）
export const getShortTimeDisplay = (startTime: string, endTime: string): string => {
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return `${start}-${end}`;
};