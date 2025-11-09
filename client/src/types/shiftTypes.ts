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
  employeeId: string;
  employeeName: string;
  positionGroup?: "fulltime" | "parttime";
  timeSlotId: string | null;
  timeSlotName: string | null;
  isVacationRequest: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface AIGenerationConfig {
  includeVacationRequests: boolean;
  prioritizeLowSkillFirst: boolean;
  enforceMaxConsecutiveDays: boolean;
  allowManagementOvertime: boolean;
  customInstructions: string;
}

export interface Employee {
  id: string;
  name: string;
}

export interface ShiftStatistics {
  totalDays: number;
  assignedDays: number;
  vacationDays: number;
  unassignedDays: number;
  warnings: number;
}
