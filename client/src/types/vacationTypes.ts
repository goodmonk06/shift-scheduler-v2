// 休暇タイプ
export type LeaveType = "休" | "有休";

// 勤務希望タイプ
export type WorkType = "時間指定" | "早番希望" | "遅番希望" | "夜勤希望";

// リクエストの種類（休暇 or 勤務希望）
export type RequestCategory = "leave" | "work";

export interface DayRequest {
  day: number;
  type: LeaveType | WorkType;
  category: RequestCategory;
  reason?: string;
  // 時間指定の場合のみ使用
  startTime?: string;
  endTime?: string;
}

export interface VacationRequestProps {
  onUnsavedChangesChange: (hasChanges: boolean, count: number) => void;
  headerImageUrl?: string;
}

export interface VacationCalendarProps {
  year: number;
  month: number;
  monthDays: number[];
  requests: Map<number, DayRequest>;
  submittedRequests: Map<number, DayRequest>;
  isBeforeDeadline: boolean;
  onDateClick: (day: number) => void;
  getRequestBadge: (day: number) => React.ReactNode;
}

export interface VacationDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number | null;
  nextMonthName: string;
  holidayName?: string;
  // リクエストのカテゴリー（休暇 or 勤務希望）
  category: RequestCategory;
  setCategory: (category: RequestCategory) => void;
  // タイプ（休・有休・時間指定など）
  requestType: LeaveType | WorkType;
  setRequestType: (type: LeaveType | WorkType) => void;
  // 時間指定の場合
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  // 理由
  reason: string;
  setReason: (reason: string) => void;
  onSave: () => void;
  onRemove: () => void;
  hasRequest: boolean;
}

export interface VacationTimePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  onConfirm: (hours: { startHour: string; startMinute: string; endHour: string; endMinute: string }) => void;
}

export interface PickerValue {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  [key: string]: string; // Add index signature for react-mobile-picker compatibility
}
