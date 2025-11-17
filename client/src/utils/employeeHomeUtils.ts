import type { DayData } from "../types/employeeHomeTypes";
import type { EmployeeNotification } from "../services/employeeNotificationService";

export const getShiftEmoji = (type: string): string | null => {
  switch (type) {
    case "早番":
      return "🌅";
    case "遅番":
      return "☀️";
    case "夜勤":
      return "🌙";
    default:
      return null;
  }
};

export const getDayNumberColor = (dayData: DayData): string => {
  if (dayData.isHoliday || dayData.dayOfWeek === 0) {
    return "text-destructive"; // Sunday and holidays - red
  }
  if (dayData.dayOfWeek === 6) {
    return "text-blue-600"; // Saturday - blue
  }
  return ""; // Weekdays - default
};

export const getNotificationBgColor = (priority: EmployeeNotification['priority']): string => {
  switch (priority) {
    case 'high':
      return 'bg-gradient-to-br from-warning/20 to-warning/10 border-warning/40';
    case 'medium':
      return 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30';
    case 'low':
      return 'bg-gradient-to-br from-muted/30 to-muted/10 border-muted/30';
    default:
      return 'bg-card border-border';
  }
};
