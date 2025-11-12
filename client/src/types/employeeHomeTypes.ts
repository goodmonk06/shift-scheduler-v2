import type { EmployeeNotification, NotificationStats } from "../services/employeeNotificationService";

export type ShiftType = "早番" | "遅番" | "夜勤";

export interface DayData {
  day: number;
  hasShift: boolean;
  shiftType: ShiftType;
  shiftTime?: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isHoliday?: boolean;
  holidayName?: string;
  event?: {
    title: string;
    description: string;
    time?: string;
  };
}

export interface NextShiftData {
  date: string;
  type: string;
  time: string;
}

export interface EmployeeHomeProps {
  employeeName: string;
  hasNotifications?: boolean;
  headerImageUrl?: string;
  employeeId?: number;
}

export interface HeaderCardProps {
  employeeName: string;
  headerImageUrl: string;
}

export interface NextShiftCardProps {
  nextShift: NextShiftData;
}

export interface MonthlyCalendarCardProps {
  currentMonth: string;
  currentDay: number;
  firstDayOfWeek: number;
  monthDays: DayData[];
  onDayClick: (dayData: DayData) => void;
}

export interface NotificationListProps {
  notifications: EmployeeNotification[];
  stats: NotificationStats | null;
  isLoading: boolean;
}

export interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: DayData | null;
}
