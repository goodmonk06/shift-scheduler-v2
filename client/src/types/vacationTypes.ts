export interface DayRequest {
  day: number;
  type: "休" | "有休" | "時間指定";
  startTime?: string;
  endTime?: string;
  reason?: string;
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
  requestType: "休" | "有休" | "時間指定";
  setRequestType: (type: "休" | "有休" | "時間指定") => void;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  reason: string;
  setReason: (reason: string) => void;
  onSave: () => void;
  onRemove: () => void;
  hasRequest: boolean;
  onTimePickerOpen: () => void;
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
