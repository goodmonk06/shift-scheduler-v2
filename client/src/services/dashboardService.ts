/**
 * ダッシュボードAPI抽象化層
 *
 * ダッシュボードの統計情報を取得するAPI
 */

import type { ApiResponse } from '../types/api';
import { trpcClient } from '../lib/trpc';

// ===========================
// インターフェース定義
// ===========================

export interface DashboardStats {
  totalEmployees: number;
  currentShift: {
    id: number;
    year: number;
    month: number;
    status: string;
    leaveRequestDeadline: string | null;
  } | null;
  emergencyNotifications: number;
  archivedShifts: number;
}

export interface DashboardService {
  /**
   * ダッシュボード統計情報を取得
   */
  getStats(): Promise<DashboardStats>;
}

// ===========================
// モック実装
// ===========================

class DashboardServiceMock implements DashboardService {
  async getStats(): Promise<DashboardStats> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return {
      totalEmployees: 24,
      currentShift: {
        id: 1,
        year: currentYear,
        month: currentMonth,
        status: "confirmed",
        leaveRequestDeadline: new Date(currentYear, currentMonth - 1, 15, 23, 59, 59).toISOString(),
      },
      emergencyNotifications: 3,
      archivedShifts: 12,
    };
  }
}

// ===========================
// 本番実装
// ===========================

class DashboardServiceProduction implements DashboardService {
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

  async getStats(): Promise<DashboardStats> {
    try {
      const result = await trpcClient.dashboard.getStats.query();
      return result || {
        totalEmployees: 0,
        currentShift: null,
        emergencyNotifications: 0,
        archivedShifts: 0,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // フォールバック
      return {
        totalEmployees: 0,
        currentShift: null,
        emergencyNotifications: 0,
        archivedShifts: 0,
      };
    }
  }
}

// ===========================
// エクスポート
// ===========================

import { ENV } from '../lib/env';

// 本番では常にProductionを強制（VITE_USE_MOCK_APIが未定義でも安全）
const useMock = ENV.PROD ? false : ENV.USE_MOCK;

export const dashboardService: DashboardService = useMock
  ? new DashboardServiceMock()
  : new DashboardServiceProduction();

export { DashboardServiceMock, DashboardServiceProduction };
