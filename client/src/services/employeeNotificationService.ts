/**
 * 職員向け通知API抽象化層
 *
 * 締切リマインダー、提出状況などのAPI
 */

import type { ApiResponse } from '../types/api';

// ===========================
// インターフェース定義
// ===========================

export interface EmployeeNotification {
  id: string;
  type: 'deadline' | 'reminder' | 'approval' | 'rejection' | 'shift_published';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  relatedShiftId?: number;
  daysUntilDeadline?: number;
}

export interface NotificationStats {
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  upcomingDeadline: {
    shiftId: number;
    year: number;
    month: number;
    deadline: string;
    daysRemaining: number;
  } | null;
}

export interface EmployeeNotificationService {
  /**
   * 職員向け通知を取得
   */
  getNotifications(employeeId: number, limit?: number): Promise<EmployeeNotification[]>;

  /**
   * 通知統計を取得
   */
  getStats(employeeId: number): Promise<NotificationStats>;
}

// ===========================
// モック実装
// ===========================

class EmployeeNotificationServiceMock implements EmployeeNotificationService {
  async getNotifications(employeeId: number, limit: number = 10): Promise<EmployeeNotification[]> {
    // モックデータ
    const notifications: EmployeeNotification[] = [
      {
        id: '1',
        type: 'deadline',
        title: '12月分の希望休締切が近づいています',
        message: '12月分の希望休締切は11月15日です。あと3日です。',
        priority: 'high',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        daysUntilDeadline: 3,
      },
      {
        id: '2',
        type: 'approval',
        title: '希望休が承認されました',
        message: '11月20日の希望休が承認されました。',
        priority: 'medium',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: '3',
        type: 'shift_published',
        title: '11月のシフトが確定しました',
        message: '11月のシフトが確定しました。ご確認ください。',
        priority: 'medium',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ];

    return notifications.slice(0, limit);
  }

  async getStats(employeeId: number): Promise<NotificationStats> {
    return {
      pendingRequests: 2,
      approvedRequests: 5,
      rejectedRequests: 0,
      upcomingDeadline: {
        shiftId: 1,
        year: 2025,
        month: 12,
        deadline: '2025-11-15T23:59:59Z',
        daysRemaining: 3,
      },
    };
  }
}

// ===========================
// 本番実装
// ===========================

class EmployeeNotificationServiceProduction implements EmployeeNotificationService {
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

  async getNotifications(employeeId: number, limit: number = 10): Promise<EmployeeNotification[]> {
    try {
      const response = await this.fetchApi<EmployeeNotification[]>(
        `/api/trpc/employeeNotifications.getForEmployee?employeeId=${employeeId}&limit=${limit}`,
        { method: 'GET' }
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch employee notifications:', error);
      return [];
    }
  }

  async getStats(employeeId: number): Promise<NotificationStats> {
    try {
      const response = await this.fetchApi<NotificationStats>(
        `/api/trpc/employeeNotifications.getStats?employeeId=${employeeId}`,
        { method: 'GET' }
      );
      return response.data || {
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        upcomingDeadline: null,
      };
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
      return {
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        upcomingDeadline: null,
      };
    }
  }
}

// ===========================
// エクスポート
// ===========================

export const employeeNotificationService: EmployeeNotificationService =
  import.meta.env.VITE_USE_MOCK_API !== 'false'
    ? new EmployeeNotificationServiceMock()
    : new EmployeeNotificationServiceProduction();

export { EmployeeNotificationServiceMock, EmployeeNotificationServiceProduction };
