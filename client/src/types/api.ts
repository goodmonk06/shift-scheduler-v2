/**
 * API型定義
 * バックエンドのAPI仕様に完全準拠した型定義
 *
 * このファイルはバックエンドのデータベーススキーマと対応しています。
 * バックエンド側で型定義を変更した場合は、このファイルも更新してください。
 */

import type { EmployeeConstraints } from "../../../shared/employeeConstraintTypes";

// ===========================
// 基本データ型
// ===========================

/**
 * ユーザー（認証情報）
 */
export interface User {
  id: number;
  name: string;
  email: string | null;
  role: "admin" | "user";
  openId: string;
  employeePrimaryId?: number; // Employee.id (primary key) - for employee users only
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

/**
 * 職員情報
 */
export interface Employee {
  id: number;
  userId: number | null;
  employeeId: string;  // 例: "EMP00001"
  name: string;
  email: string | null;
  positionGroupId: number;
  skillLevel: number;  // 50-100
  canWorkNightShift: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  // 職員個別データ（勤務制約、休暇管理、個人情報）
  // 詳細な型定義は shared/employeeConstraintTypes.ts を参照
  additionalConstraints?: EmployeeConstraints;
}

/**
 * 役職グループ
 */
export interface PositionGroup {
  id: number;
  name: string;  // 例: "正社員", "パート"
  employmentType: "fulltime" | "parttime";
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 勤務時間枠
 */
export interface WorkTimeSlot {
  id: number;
  name: string;  // 例: "早番", "遅番", "夜勤"
  displayLabel: string;  // 例: "早", "遅", "夜"
  startTime: string;  // HH:MM形式 例: "07:00"
  endTime: string;  // HH:MM形式 例: "16:00"
  isNightShift: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * シフト
 * ✅ バックエンドに追加が必要: 6段階のステータス管理
 */
export interface Shift {
  id: number;
  year: number;
  month: number;
  name: string;
  status: ShiftStatus;
  userId: number | null;  // 作成者
  generatedBy: "manual" | "ai" | "rule_based";
  tentativePublishedAt: Date | null;
  confirmedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // ✅ バックエンドに追加が必要なフィールド
  leaveRequestDeadline?: Date | null;  // 希望休の締め切り日時
  additionalRequestDeadline?: Date | null;  // 仮確定後の追加希望締め切り
  // バージョン管理用（別IDで保存する場合）
  parentShiftId?: number | null;  // 元のシフトID（改訂版の場合）
  version?: number;  // バージョン番号
}

/**
 * シフトのステータス（8段階）- DBスキーマと完全一致
 */
export type ShiftStatus =
  | "vacation_only"      // 1. 希望休のみ挿入（初期状態）
  | "draft"              // 2. 下書き（手動編集中）
  | "ai_generated"       // 3. AI生成後
  | "tentative"          // 4. 仮確定（人間が手を加えた）
  | "tentative_revised"  // 5. 仮確定（改）- 追加希望受付後
  | "confirmed"          // 6. 最終確定シフト
  | "actual"             // 7. 実績（日々変更後の実際の勤務）
  | "archived";          // 8. アーカイブ済み

/**
 * シフト詳細（個別の勤務割り当て）
 */
export interface ShiftDetail {
  id: number;
  shiftId: number;
  employeeId: number;
  date: string;  // YYYY-MM-DD形式
  status: "working" | "off" | "requested_off" | "emergency_off";
  timeSlotId: number | null;
  leaveType: "休" | "有休" | "時間指定" | null;
  startTime: string | null;  // HH:MM形式（時間指定の場合）
  endTime: string | null;  // HH:MM形式（時間指定の場合）
  generatedBy: "manual" | "ai" | "leave_request" | "rule_based";
  isChanged: boolean;
  previousTimeSlotId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 希望休申請（バックエンド型）
 * ✅ バックエンドに追加が必要なフィールド: leaveType, startTime, endTime, isAdditionalRequest
 */
export interface LeaveRequest {
  id: number;
  employeeId: number;
  shiftId: number;
  requestDate: string;  // YYYY-MM-DD - 申請した日
  startDate: string;  // YYYY-MM-DD - 希望休の開始日
  endDate: string;  // YYYY-MM-DD - 希望休の終了日（同日の場合も同じ日付）
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  // ✅ バックエンドに追加が必要なフィールド
  leaveType?: "休" | "有休" | "時間指定";  // 休みの種類
  startTime: string | null;  // HH:MM形式（時間指定の場合のみ）
  endTime: string | null;  // HH:MM形式（時間指定の場合のみ）
  isAdditionalRequest?: boolean;  // 仮確定後の追加希望かどうか
}

/**
 * シフト変更提案
 */
export interface ChangeProposal {
  id: number;
  employeeId: number;
  shiftId: number;
  proposalDate: string;  // YYYY-MM-DD
  currentTimeSlotId: number | null;
  proposedTimeSlotId: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 緊急通知
 */
export interface EmergencyNotification {
  id: number;
  title: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// リクエスト/レスポンス型
// ===========================

/**
 * 希望休作成リクエスト（単一）
 */
export interface CreateLeaveRequestInput {
  employeeId: number;
  shiftId: number;
  requestDate: string;  // YYYY-MM-DD
  startDate: string;  // YYYY-MM-DD
  endDate: string;  // YYYY-MM-DD
  leaveType: "休" | "有休" | "時間指定";
  startTime?: string;  // HH:MM
  endTime?: string;  // HH:MM
  reason?: string;
}

/**
 * 希望休一括作成リクエスト
 * ✅ バックエンドに実装が必要なエンドポイント: leaveRequests.createBatch
 */
export interface CreateLeaveRequestBatchInput {
  employeeId: number;
  shiftId: number;
  requests: {
    date: string;  // YYYY-MM-DD
    leaveType: "休" | "有休" | "時間指定";
    startTime?: string;  // HH:MM
    endTime?: string;  // HH:MM
    reason?: string;
  }[];
}

/**
 * 希望休更新リクエスト
 */
export interface UpdateLeaveRequestInput {
  startDate?: string;
  endDate?: string;
  leaveType?: "休" | "有休" | "時間指定";
  startTime?: string;
  endTime?: string;
  reason?: string;
  status?: "pending" | "approved" | "rejected";
}

/**
 * 希望休取得フィルター
 */
export interface GetLeaveRequestsFilter {
  employeeId?: number;
  shiftId?: number;
  month?: string;  // YYYY-MM形式
  status?: ("pending" | "approved" | "rejected")[];
}

/**
 * シフト締め切り日設定リクエスト
 * ✅ バックエンドに実装が必要なエンドポイント: shifts.setLeaveRequestDeadline
 */
export interface SetLeaveRequestDeadlineInput {
  shiftId: number;
  deadline: Date;
}

/**
 * 認証レスポンス
 */
export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

/**
 * API共通レスポンス
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ===========================
// フロントエンド用の内部型
// ===========================

/**
 * フロントエンドの希望休表示用データ
 * （既存のVacationContext型との互換性を保つため）
 */
export interface VacationRequestDisplay {
  id: string;
  staffName: string;
  staffId: string;
  month: string;
  requests: {
    day: number;
    type: "休" | "有休" | "時間指定";
    startTime?: string;
    endTime?: string;
    reason?: string;
  }[];
  submittedAt: Date;
  status: "pending" | "approved" | "rejected";
}

// ===========================
// 型変換ヘルパー（実装例）
// ===========================

/**
 * バックエンドのLeaveRequest[]をフロントエンドのVacationRequestDisplayに変換
 * 
 * 注意: バックエンドは1日1レコード、フロントエンドは1申請で複数日をまとめる
 */
export function convertLeaveRequestsToDisplay(
  requests: LeaveRequest[],
  employee: Employee,
  shift: Shift
): VacationRequestDisplay | null {
  if (requests.length === 0) return null;

  return {
    id: `req-${requests[0].id}`,
    staffName: employee.name,
    staffId: employee.employeeId,
    month: `${shift.year}年${shift.month}月`,
    requests: requests.map(req => ({
      day: parseInt(req.startDate.split('-')[2]),
      type: req.leaveType || "休",
      startTime: req.startTime ?? undefined,
      endTime: req.endTime ?? undefined,
      reason: req.reason ?? undefined,
    })),
    submittedAt: requests[0].createdAt,
    status: requests[0].status,
  };
}

/**
 * フロントエンドのVacationRequestDisplayをバックエンドのLeaveRequest[]に変換
 */
export function convertDisplayToLeaveRequests(
  display: VacationRequestDisplay,
  employeeId: number,
  shiftId: number
): CreateLeaveRequestInput[] {
  const year = parseInt(display.month.split('年')[0]);
  const month = parseInt(display.month.split('年')[1].replace('月', ''));
  const requestDate = new Date().toISOString().split('T')[0];

  return display.requests.map(req => ({
    employeeId,
    shiftId,
    requestDate,
    startDate: `${year}-${month.toString().padStart(2, '0')}-${req.day.toString().padStart(2, '0')}`,
    endDate: `${year}-${month.toString().padStart(2, '0')}-${req.day.toString().padStart(2, '0')}`,
    leaveType: req.type,
    startTime: req.startTime,
    endTime: req.endTime,
    reason: req.reason,
  }));
}
