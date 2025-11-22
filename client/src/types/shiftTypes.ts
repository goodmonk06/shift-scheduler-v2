import type { ShiftStatus } from "./api";

export interface ShiftData {
  id: string;
  year: number;
  month: number;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignment {
  date: string;
  employeeId: string; // Display ID (e.g., "EMP001")
  employeeName: string;
  positionGroup?: "fulltime" | "parttime";
  timeSlotId: string | null;
  timeSlotName: string | null;
  startTime?: string; // 開始時刻（HH:MM形式）
  endTime?: string;   // 終了時刻（HH:MM形式）
  isVacationRequest: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
  shiftDetailId?: number; // ID of the shift detail record for editing
  employeeDbId?: number; // Database numeric ID
  generatedBy?: string; // How this shift was generated (leave_request, work_preference, rule_based, ai, manual)
}

export interface AIGenerationConfig {
  includeVacationRequests: boolean;
  prioritizeLowSkillFirst: boolean;
  enforceMaxConsecutiveDays: boolean;
  allowManagementOvertime: boolean;
  customInstructions: string;
}

export interface Employee {
  id: string; // Display ID (e.g., "EMP001")
  name: string;
  dbId?: number; // Database numeric ID
}

export interface ShiftStatistics {
  totalDays: number;
  assignedDays: number;
  vacationDays: number;
  unassignedDays: number;
  warnings: number;
}
