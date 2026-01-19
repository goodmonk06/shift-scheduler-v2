// シフト入力ポップオーバー共通ユーティリティ関数
import type { CustomTimeSlot } from './ShiftPopoverTypes';

/**
 * LocalStorageキーを生成
 */
export const getCustomTimesKey = (shiftId: number | undefined, employeeId: string): string => {
  return `customTimes_${shiftId || 'temp'}_${employeeId}`;
};

/**
 * LocalStorageからカスタム時間枠を読み込み
 */
export const loadCustomTimes = (shiftId: number | undefined, employeeId: string): CustomTimeSlot[] => {
  try {
    const key = getCustomTimesKey(shiftId, employeeId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as CustomTimeSlot[];
  } catch (e) {
    console.error('Failed to load custom times:', e);
    return [];
  }
};

/**
 * LocalStorageにカスタム時間枠を保存
 */
export const saveCustomTimes = (shiftId: number | undefined, employeeId: string, times: CustomTimeSlot[]): void => {
  try {
    const key = getCustomTimesKey(shiftId, employeeId);
    localStorage.setItem(key, JSON.stringify(times));
  } catch (e) {
    console.error('Failed to save custom times:', e);
  }
};

/**
 * 時間表示をフォーマット（30分は「半」表示）
 * 例: "08:30", "14:00" → "8半～14"
 */
export const formatTimeDisplay = (startTime: string, endTime: string, breakMinutes: number): string => {
  const [startHour, startMin] = startTime.split(':');
  const [endHour, endMin] = endTime.split(':');

  const startDisplay = startMin === '30' ? `${parseInt(startHour)}半` : parseInt(startHour);
  const endDisplay = endMin === '30' ? `${parseInt(endHour)}半` : parseInt(endHour);

  return `${startDisplay}～${endDisplay}`;
};

/**
 * ポップオーバーの位置を計算
 */
export const calculatePopoverPosition = (
  targetRect: DOMRect,
  popoverHeight: number = 500,
  popoverWidth: number = 320
): { top: number; left: number } => {
  // セルの右側に配置（12px余白）
  const popoverLeft = targetRect.right + window.scrollX + 12;

  // 画面からはみ出る場合は左側に表示
  const showOnLeft = (targetRect.right + popoverWidth + 12) > window.innerWidth;
  const adjustedLeft = showOnLeft
    ? targetRect.left + window.scrollX - popoverWidth - 12
    : popoverLeft;

  // セルの垂直中央に合わせる
  const cellCenterY = targetRect.top + targetRect.height / 2;
  const popoverTop = cellCenterY + window.scrollY - popoverHeight / 2;

  // 画面からはみ出さないように調整
  const adjustedTop = Math.max(10, Math.min(popoverTop, window.scrollY + window.innerHeight - popoverHeight - 10));

  return { top: adjustedTop, left: adjustedLeft };
};
