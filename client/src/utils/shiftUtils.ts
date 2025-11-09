import type { ShiftType } from "../types/shiftViewTypes";

export const getShiftColor = (shiftType: ShiftType): string => {
  switch (shiftType) {
    case "早番":
      return "bg-gradient-to-br from-secondary/30 to-secondary/50 border-secondary";
    case "遅番":
      return "bg-gradient-to-br from-warning/30 to-warning/50 border-warning";
    case "夜勤":
      return "bg-gradient-to-br from-primary/30 to-primary/50 border-primary";
    case "休み":
      return "bg-gradient-to-br from-success/20 to-success/30 border-success";
    default:
      return "bg-card";
  }
};

export const getShiftIcon = (shiftType: ShiftType): string => {
  switch (shiftType) {
    case "早番":
      return "🌅";
    case "遅番":
      return "☀️";
    case "夜勤":
      return "🌙";
    case "休み":
      return "🌸";
    default:
      return "";
  }
};
