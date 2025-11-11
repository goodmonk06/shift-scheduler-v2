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
    email: string;
  }[];
  pendingApproval: number;
  approved: number;
}

export interface BulkApprovalResult {
  approved: number;
  total: number;
}

export interface LeaveRequestService {
  /**
   * 指定シフトの希望休提出状況を取得
   */
  getSubmissionStatus(shiftId: number): Promise<SubmissionStatus>;

  /**
   * 指定シフトの未承認希望休を一括承認
   */
  approveAllForShift(shiftId: number): Promise<BulkApprovalResult>;
}

// ===========================
// モック実装
// ===========================

class LeaveRequestServiceMock implements LeaveRequestService {
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
