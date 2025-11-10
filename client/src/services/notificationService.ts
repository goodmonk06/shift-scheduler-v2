/**
 * 通知API抽象化層
 *
 * 緊急通知の取得などのAPI
 */

import type { ApiResponse } from '../types/api';

// ===========================
// インターフェース定義
// ===========================

export interface EmergencyNotification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface NotificationService {
  /**
   * 最近の緊急通知を取得
   */
  getRecentNotifications(limit?: number): Promise<EmergencyNotification[]>;
}

// ===========================
// モック実装
// ===========================

class NotificationServiceMock implements NotificationService {
  async getRecentNotifications(limit: number = 5): Promise<EmergencyNotification[]> {
    // モックデータ
    const notifications: EmergencyNotification[] = [
      {
        id: 1,
        title: "明日のシフト変更について",
        message: "山田さんが体調不良のため、明日の早番を佐藤さんに変更しました。",
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
      {
        id: 2,
        title: "来週のシフト確定のお知らせ",
        message: "来週（11月11日〜17日）のシフトが確定しました。",
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: 3,
        title: "緊急連絡：欠員対応",
        message: "本日の夜勤に欠員が発生しました。代替職員の手配をお願いします。",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      },
    ];

    return notifications.slice(0, limit);
  }
}

// ===========================
// 本番実装
// ===========================

class NotificationServiceProduction implements NotificationService {
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

  async getRecentNotifications(limit: number = 5): Promise<EmergencyNotification[]> {
    try {
      const response = await this.fetchApi<EmergencyNotification[]>(
        `/api/trpc/emergencyNotifications.getRecent?limit=${limit}`,
        { method: 'GET' }
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recent notifications:', error);
      return [];
    }
  }
}

// ===========================
// エクスポート
// ===========================

export const notificationService: NotificationService =
  import.meta.env.VITE_USE_MOCK_API === 'true'
    ? new NotificationServiceMock()
    : new NotificationServiceProduction();

export { NotificationServiceMock, NotificationServiceProduction };
