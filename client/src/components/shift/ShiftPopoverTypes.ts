// シフト入力ポップオーバー共通型定義

export interface CustomTimeSlot {
  displayText: string;      // "8～14" or "8半～14"
  startTime: string;        // "08:00"
  endTime: string;          // "14:00"
  breakMinutes: 0 | 30 | 60; // 休憩時間（分）
}

export interface ShiftPreset {
  text: string;
  type: string;
}

export interface PopoverCurrentValue {
  type: string;
  customText: string;
  isLocked?: boolean;
  editedInActualMode?: boolean;
}

export interface PopoverState {
  isOpen: boolean;
  staffId: string | null;
  date: Date | null;
  dateStr?: string;
  staffName: string;
  targetRect: DOMRect | null;
  currentValue: PopoverCurrentValue | null;
}

export interface ShiftInputPopoverProps {
  popoverState: PopoverState;
  onClose: () => void;
  onSaveShift: (value: { type: string; customText: string; isLocked?: boolean }) => void;
  shiftPresets: ShiftPreset[];
  customTimesMap: Record<string, CustomTimeSlot[]>;
  onUpdateCustomTimes: (staffId: string, times: CustomTimeSlot[]) => void;
  loadedShiftId?: number | null;
  toast: {
    success: (message: string) => void;
    error?: (message: string) => void;
  };
}
