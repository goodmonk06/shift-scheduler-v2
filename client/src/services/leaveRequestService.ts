/**
 * 希望休申請API抽象化層
 *
 * 希望休申請の取得、一括承認、提出状況確認などのAPI
 */

import type { ApiResponse } from '../types/api';
import { trpcClient } from '../lib/trpc';

// ===========================
// インターフェース定義
// ===========================

export interface SubmissionStatus {
  total: number;
  submitted: number;
  notSubmitted: {
    id: number;
    name: string;
    email: string | null;
  }[];
  pendingApproval: number;
  approved: number;
}

export interface BulkApprovalResult {
  approved: number;
  total: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  shiftId: number | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: "休" | "有休";
  isAdditional: boolean;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface CreateLeaveRequestInput {
  employeeId: number;
  shiftId?: number;
  startDate: string;
  endDate: string;
  leaveType?: "休" | "有休";
  isAdditional?: boolean;
  reason?: string;
}

export interface LeaveRequestService {
  /**
   * 全希望休一覧を取得（管理者用）
   */
  getAll(): Promise<LeaveRequest[]>;

  /**
   * 指定シフトの希望休一覧を取得
   */
  getByShift(shiftId: number): Promise<LeaveRequest[]>;

  /**
   * 指定シフトの希望休提出状況を取得（管理者用）
   */
  getSubmissionStatus(shiftId: number): Promise<SubmissionStatus>;

  /**
   * 指定シフトの未承認希望休を一括承認（管理者用）
   */
  approveAllForShift(shiftId: number): Promise<BulkApprovalResult>;

  /**
   * 職員の希望休一覧を取得
   */
  getByEmployee(employeeId: number): Promise<LeaveRequest[]>;

  /**
   * 希望休を作成
   */
  create(input: CreateLeaveRequestInput): Promise<LeaveRequest>;

  /**
   * 希望休を更新
   */
  update(id: number, data: Partial<CreateLeaveRequestInput>): Promise<LeaveRequest>;

  /**
   * 希望休を削除
   */
  delete(id: number): Promise<void>;

  /**
   * 希望休を承認
   */
  approve(id: number): Promise<LeaveRequest>;

  /**
   * 希望休を却下
   */
  reject(id: number): Promise<LeaveRequest>;
}

// ===========================
// モック実装
// ===========================

class LeaveRequestServiceMock implements LeaveRequestService {
  async getAll(): Promise<LeaveRequest[]> {
    return [];
  }

  async getByShift(shiftId: number): Promise<LeaveRequest[]> {
    return [];
  }

  async getSubmissionStatus(shiftId: number): Promise<SubmissionStatus> {
    // モックデータ
    return {
      total: 24,
      submitted: 18,
      notSubmitted: [
        { id: 1, name: "山田太郎", email: "yamada@example.com" },
        { id: 5, name: "佐藤花子", email: "sato@example.com" },
        { id: 12, name: "鈴木一郎", email: "suzuki@example.com" },
        { id: 18, name: "田中美咲", email: "tanaka@example.com" },
        { id: 22, name: "伊藤健太", email: "ito@example.com" },
        { id: 24, name: "渡辺優子", email: "watanabe@example.com" },
      ],
      pendingApproval: 3,
      approved: 15,
    };
  }

  async approveAllForShift(shiftId: number): Promise<BulkApprovalResult> {
    // モックで5件承認
    return {
      approved: 5,
      total: 18,
    };
  }

  async getByEmployee(employeeId: number): Promise<LeaveRequest[]> {
    return [];
  }

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    return {
      id: Date.now(),
      employeeId: input.employeeId,
      shiftId: input.shiftId || null,
      startDate: input.startDate,
      endDate: input.endDate,
      leaveType: input.leaveType || "休",
      isAdditional: input.isAdditional || false,
      reason: input.reason ?? null,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
  }

  async update(id: number, data: Partial<CreateLeaveRequestInput>): Promise<LeaveRequest> {
    return {
      id,
      employeeId: data.employeeId || 1,
      shiftId: data.shiftId || null,
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      leaveType: data.leaveType || "休",
      isAdditional: data.isAdditional || false,
      reason: data.reason ?? null,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
  }

  async delete(id: number): Promise<void> {
    // モックでは何もしない
  }

  async approve(id: number): Promise<LeaveRequest> {
    return {
      id,
      employeeId: 1,
      shiftId: null,
      startDate: "",
      endDate: "",
      leaveType: "休",
      isAdditional: false,
      reason: null,
      status: "approved",
      submittedAt: new Date().toISOString(),
    };
  }

  async reject(id: number): Promise<LeaveRequest> {
    return {
      id,
      employeeId: 1,
      shiftId: null,
      startDate: "",
      endDate: "",
      leaveType: "休",
      isAdditional: false,
      reason: null,
      status: "rejected",
      submittedAt: new Date().toISOString(),
    };
  }
}

// ===========================
// 本番実装
// ===========================

class LeaveRequestServiceProduction implements LeaveRequestService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }

  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getAll(): Promise<LeaveRequest[]> {
    try {
      const result = await trpcClient.leaveRequests.list.query();
      return result || [];
    } catch (error) {
      console.error('Failed to fetch all leave requests:', error);
      throw error;
    }
  }

  async getByShift(shiftId: number): Promise<LeaveRequest[]> {
    try {
      const result = await trpcClient.leaveRequests.getByShift.query({ shiftId });
      return result || [];
    } catch (error) {
      console.error('Failed to fetch shift leave requests:', error);
      throw error;
    }
  }

  async getSubmissionStatus(shiftId: number): Promise<SubmissionStatus> {
    try {
      const result = await trpcClient.leaveRequests.getSubmissionStatus.query({ shiftId });
      return result || {
        total: 0,
        submitted: 0,
        notSubmitted: [],
        pendingApproval: 0,
        approved: 0,
      };
    } catch (error) {
      console.error('Failed to fetch submission status:', error);
      throw error;
    }
  }

  async approveAllForShift(shiftId: number): Promise<BulkApprovalResult> {
    try {
      const result = await trpcClient.leaveRequests.approveAllForShift.mutate({ shiftId });
      return result || { approved: 0, total: 0 };
    } catch (error) {
      console.error('Failed to approve all leave requests:', error);
      throw error;
    }
  }

  async getByEmployee(employeeId: number): Promise<LeaveRequest[]> {
    try {
      const result = await trpcClient.leaveRequests.getByEmployee.query({ employeeId });
      return result || [];
    } catch (error) {
      console.error('Failed to fetch employee leave requests:', error);
      throw error;
    }
  }

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    try {
      const result = await trpcClient.leaveRequests.create.mutate(input);
      return result as unknown as LeaveRequest;
    } catch (error) {
      console.error('Failed to create leave request:', error);
      throw error;
    }
  }

  async update(id: number, data: Partial<CreateLeaveRequestInput>): Promise<LeaveRequest> {
    try {
      const result = await trpcClient.leaveRequests.update.mutate({ id, ...data });
      return result as unknown as LeaveRequest;
    } catch (error) {
      console.error('Failed to update leave request:', error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await trpcClient.leaveRequests.delete.mutate({ id });
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      throw error;
    }
  }

  async approve(id: number): Promise<LeaveRequest> {
    try {
      const result = await trpcClient.leaveRequests.approve.mutate({ id });
      return result as unknown as LeaveRequest;
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      throw error;
    }
  }

  async reject(id: number): Promise<LeaveRequest> {
    try {
      const result = await trpcClient.leaveRequests.reject.mutate({ id });
      return result as unknown as LeaveRequest;
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      throw error;
    }
  }
}

// ===========================
// エクスポート
// ===========================

import { ENV } from '../lib/env';

// 本番では常にProductionを強制（VITE_USE_MOCK_APIが未定義でも安全）
const useMock = ENV.PROD ? false : ENV.USE_MOCK;

export const leaveRequestService: LeaveRequestService = useMock
  ? new LeaveRequestServiceMock()
  : new LeaveRequestServiceProduction();

export { LeaveRequestServiceMock, LeaveRequestServiceProduction };
