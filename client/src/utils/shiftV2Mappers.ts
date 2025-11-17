/**
 * シフトV2マッピングユーティリティ
 *
 * 旧形式のシフトデータ（timeSlotName, workTimeSlots）を
 * 新形式のShiftCell形式に変換する
 */

import type { ShiftType, ShiftCell, ShiftSource, DaySummary, SHIFT_TYPE_MASTER } from '../types/shiftV2Types';
import type { ShiftAssignment } from '../types/shiftTypes';
import { SHIFT_TYPE_MASTER as MASTER } from '../types/shiftV2Types';

/**
 * timeSlotNameからShiftTypeへのマッピング
 *
 * データベースに登録されているtimeSlotNameを新UIのShiftTypeに変換
 */
export function mapTimeSlotNameToShiftType(timeSlotName: string | null): ShiftType | null {
  if (!timeSlotName) return null;

  // 正規化（前後の空白を削除、全角半角統一）
  const normalized = timeSlotName.trim().toLowerCase().replace(/[Ａ-Ｚａ-ｚ]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );

  // マッピングテーブル
  const mapping: Record<string, ShiftType> = {
    // 夜勤明け
    '夜勤明け': 'YAKIN_AKE',
    '明': 'YAKIN_AKE',
    'yakin_ake': 'YAKIN_AKE',

    // 早番
    '早番': 'HAYABAN',
    '早': 'HAYABAN',
    'hayaban': 'HAYABAN',

    // 日勤A
    '日勤a': 'NIKKIN_A',
    '日a': 'NIKKIN_A',
    'nikkin_a': 'NIKKIN_A',

    // 日勤B
    '日勤b': 'NIKKIN_B',
    '日b': 'NIKKIN_B',
    'nikkin_b': 'NIKKIN_B',

    // 遅番
    '遅番': 'OSOBAN',
    '遅': 'OSOBAN',
    'osoban': 'OSOBAN',

    // 夜勤入り
    '夜勤入り': 'YAKIN_IRI',
    '夜': 'YAKIN_IRI',
    'yakin_iri': 'YAKIN_IRI',

    // パート
    'パート': 'PART',
    'part': 'PART',

    // 事務員
    '事務員': 'JIMU',
    '事務': 'JIMU',
    'jimu': 'JIMU',

    // 休み
    '休み': 'OFF',
    '休': 'OFF',
    'off': 'OFF',

    // 有給
    '有給': 'PAID_LEAVE',
    '有': 'PAID_LEAVE',
    'paid_leave': 'PAID_LEAVE',
    '有休': 'PAID_LEAVE',
  };

  return mapping[normalized] || null;
}

/**
 * ShiftAssignmentをShiftCellに変換
 */
export function convertAssignmentToCell(
  assignment: ShiftAssignment,
  workTimeSlots: Record<
    number,
    { name: string; displayLabel: string; startTime: string; endTime: string }
  >
): ShiftCell {
  // employeeIdを数値に変換（"EMP001" -> 1 の形式を想定）
  const employeeId = assignment.employeeDbId || parseInt(assignment.employeeId?.replace(/\D/g, '') || '0');

  // timeSlotNameからShiftTypeを取得
  const shiftType = mapTimeSlotNameToShiftType(assignment.timeSlotName);

  // timeSlotIdから時間情報を取得
  let startTime: string | undefined;
  let endTime: string | undefined;

  if (assignment.timeSlotId) {
    const slot = workTimeSlots[parseInt(assignment.timeSlotId)];
    if (slot) {
      startTime = slot.startTime;
      endTime = slot.endTime;
    }
  }

  // ソースを判定
  let source: ShiftSource = 'MANUAL';
  if (assignment.isVacationRequest) {
    source = 'HOPE';
  }
  // TODO: 生成履歴からAI_AUTOやRULE_AUTOを判定できるように拡張

  return {
    shiftDetailId: assignment.shiftDetailId,
    employeeId,
    date: assignment.date,
    shiftType,
    startTime,
    endTime,
    isLocked: false,
    isHope: assignment.isVacationRequest,
    source,
    hasWarning: assignment.hasWarning,
    warningMessage: assignment.warningMessage,
  };
}

/**
 * ShiftAssignmentの配列をShiftCell Mapに変換
 */
export function convertAssignmentsToCellsMap(
  assignments: ShiftAssignment[],
  workTimeSlots: Record<
    number,
    { name: string; displayLabel: string; startTime: string; endTime: string }
  >
): Map<string, ShiftCell> {
  const cellsMap = new Map<string, ShiftCell>();

  for (const assignment of assignments) {
    const cell = convertAssignmentToCell(assignment, workTimeSlots);
    const key = `${cell.employeeId}-${cell.date}`;
    cellsMap.set(key, cell);
  }

  return cellsMap;
}

/**
 * 日次サマリーを計算
 *
 * 各日の日中人数、不足人数などを計算
 */
export function calculateDaySummaries(
  cells: Map<string, ShiftCell>,
  dates: string[]
): Map<string, DaySummary> {
  const summariesMap = new Map<string, DaySummary>();

  for (const date of dates) {
    // その日のセルを抽出
    const dayCells: ShiftCell[] = [];
    for (const [key, cell] of cells.entries()) {
      if (cell.date === date) {
        dayCells.push(cell);
      }
    }

    // 日中の人数を計算（早番、日勤A、日勤B、遅番、パート、事務）
    const daytimeCells = dayCells.filter(cell =>
      cell.shiftType &&
      ['HAYABAN', 'NIKKIN_A', 'NIKKIN_B', 'OSOBAN', 'PART', 'JIMU'].includes(cell.shiftType)
    );
    const daytimeCount = daytimeCells.length;

    // 総人数
    const totalStaff = dayCells.filter(c => c.shiftType !== null).length;

    // 行事予定（TODO: 実際のデータから取得）
    const events: string[] = [];

    // 不足人数（TODO: 必要人数の設定から計算）
    const shortageByBand: {
      band: 'early' | 'daytime' | 'late' | 'night';
      label: string;
      required: number;
      actual: number;
      diff: number;
    }[] = [];

    summariesMap.set(date, {
      date,
      daytimeCount,
      totalStaff,
      shortageByBand,
      events,
      hasShortage: false, // TODO: shortageByBandから計算
    });
  }

  return summariesMap;
}
