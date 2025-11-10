/**
 * シフトAPI抽象化層
 *
 * シフト情報の取得、作成、更新などのAPI
 */

import type { Shift, ApiResponse } from '../types/api';
import { trpcClient } from '../lib/trpc';

// ===========================
// インターフェース定義
// ===========================

export interface ShiftService {
  /**
   * 現在月のシフトを取得
   */
  getCurrentMonthShift(): Promise<Shift | null>;

  /**
   * 指定年月のシフトを取得
   */
  getShiftByYearMonth(year: number, month: number): Promise<Shift | null>;

  /**
   * シフトIDでシフトを取得
   */
  getShiftById(id: number): Promise<Shift | null>;

  /**
   * 全シフト一覧を取得
   */
  getAllShifts(): Promise<Shift[]>;

  /**
   * 新しいシフトを作成
   */
  createShift(params: { year: number; month: number; name: string }): Promise<Shift>;

  /**
   * シフトを削除
   */
  deleteShift(id: number): Promise<void>;
}

// ===========================
// モック実装
// ===========================

class ShiftServiceMock implements ShiftService {
  private readonly SHIFTS_KEY = 'shifts_data';

  private getStoredShifts(): Shift[] {
    if (typeof window === 'undefined') return this.getDefaultShifts();
    const stored = localStorage.getItem(this.SHIFTS_KEY);
    if (!stored) return this.getDefaultShifts();
    try {
      return JSON.parse(stored);
    } catch {
      return this.getDefaultShifts();
    }
  }

  private getDefaultShifts(): Shift[] {
    return [
      {
        id: 1,
        year: 2025,
        month: 12,
        name: '2025年12月シフト',
        status: 'draft',
        userId: 1,
        generatedBy: 'manual',
        tentativePublishedAt: null,
        confirmedAt: null,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date('2025-11-01'),
        updatedAt: new Date('2025-11-01'),
        leaveRequestDeadline: new Date(2025, 10, 15, 23, 59, 59), // 11月15日
      },
      {
        id: 2,
        year: 2026,
        month: 1,
        name: '2026年1月シフト',
        status: 'draft',
        userId: 1,
        generatedBy: 'manual',
        tentativePublishedAt: null,
        confirmedAt: null,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date('2025-11-01'),
        updatedAt: new Date('2025-11-01'),
        leaveRequestDeadline: new Date(2025, 11, 15, 23, 59, 59), // 12月15日
      },
    ];
  }

  async getCurrentMonthShift(): Promise<Shift | null> {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;

    return this.getShiftByYearMonth(year, month);
  }

  async getShiftByYearMonth(year: number, month: number): Promise<Shift | null> {
    const shifts = this.getStoredShifts();
    return shifts.find(s => s.year === year && s.month === month) || null;
  }

  async getShiftById(id: number): Promise<Shift | null> {
    const shifts = this.getStoredShifts();
    return shifts.find(s => s.id === id) || null;
  }

  async getAllShifts(): Promise<Shift[]> {
    return this.getStoredShifts();
  }

  async createShift(params: { year: number; month: number; name: string }): Promise<Shift> {
    const shifts = this.getStoredShifts();
    const newShift: Shift = {
      id: Date.now(),
      year: params.year,
      month: params.month,
      name: params.name,
      status: 'draft',
      userId: 1,
      generatedBy: 'manual',
      tentativePublishedAt: null,
      confirmedAt: null,
      isArchived: false,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      leaveRequestDeadline: null,
    };

    const updatedShifts = [newShift, ...shifts];
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SHIFTS_KEY, JSON.stringify(updatedShifts));
    }

    return newShift;
  }

  async deleteShift(id: number): Promise<void> {
    const shifts = this.getStoredShifts();
    const updatedShifts = shifts.filter(s => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SHIFTS_KEY, JSON.stringify(updatedShifts));
    }
  }
}

// ===========================
// 本番実装
// ===========================

class ShiftServiceProduction implements ShiftService {
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

  async getCurrentMonthShift(): Promise<Shift | null> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    try {
      const response = await this.fetchApi<Shift>(
        '/api/trpc/shifts.getCurrentMonth',
        { method: 'GET' }
      );
      return response.data || null;
    } catch {
      return null;
    }
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async getShiftByYearMonth(year: number, month: number): Promise<Shift | null> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    try {
      const response = await this.fetchApi<Shift>(
        `/api/trpc/shifts.getByYearMonth?year=${year}&month=${month}`,
        { method: 'GET' }
      );
      return response.data || null;
    } catch {
      return null;
    }
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async getShiftById(id: number): Promise<Shift | null> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    try {
      const response = await this.fetchApi<Shift>(
        `/api/trpc/shifts.getById?id=${id}`,
        { method: 'GET' }
      );
      return response.data || null;
    } catch {
      return null;
    }
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async getAllShifts(): Promise<Shift[]> {
    try {
      const result = await trpcClient.shifts.list.query();
      // tRPC client returns data directly, but ensure it's an array
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      return [];
    }
  }

  async createShift(params: { year: number; month: number; name: string }): Promise<Shift> {
    return await trpcClient.shifts.create.mutate(params);
  }

  async deleteShift(id: number): Promise<void> {
    await trpcClient.shifts.delete.mutate({ id });
  }
}

// ===========================
// エクスポート
// ===========================

export const shiftService: ShiftService =
  import.meta.env.VITE_USE_MOCK_API === 'true'
    ? new ShiftServiceMock()
    : new ShiftServiceProduction();

export { ShiftServiceMock, ShiftServiceProduction };
