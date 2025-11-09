export type ShiftType = "早番" | "遅番" | "夜勤" | "休み";
export type ShiftStatus = "tentative" | "confirmed" | "completed";
export type ReportStatus = "not_reported" | "reported" | "approved";

export interface ShiftDay {
  date: string;
  day: number;
  shiftType: ShiftType;
  time: string;
  status: ShiftStatus;
  actualTime?: string;
  reportStatus?: ReportStatus;
}

export interface ShiftCardProps {
  shift: ShiftDay;
  showActions?: boolean;
  showReport?: boolean;
  canRequestAdditional?: boolean;
  canReportActual?: boolean;
  onRequestAdditional?: (shift: ShiftDay) => void;
  onReportActual?: (shift: ShiftDay) => void;
}

export interface AdditionalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShift: ShiftDay | null;
  requestReason: string;
  onRequestReasonChange: (reason: string) => void;
  onSubmit: () => void;
}

export interface ActualReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShift: ShiftDay | null;
  actualStartTime: string;
  actualEndTime: string;
  reportNote: string;
  onActualStartTimeChange: (time: string) => void;
  onActualEndTimeChange: (time: string) => void;
  onReportNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export interface ShiftFlowCardProps {}

export interface ShiftTabContentProps {
  shifts: ShiftDay[];
  canRequestAdditional?: boolean;
  canReportActual?: boolean;
  deadline?: Date;
  deadlineLabel?: string;
  onRequestAdditional?: (shift: ShiftDay) => void;
  onReportActual?: (shift: ShiftDay) => void;
}
