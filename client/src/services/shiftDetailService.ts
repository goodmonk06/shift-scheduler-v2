/**
 * シフト詳細API抽象化層
 *
 * 職員の日毎のシフト割り当て情報を取得・管理
 */

import type { ApiResponse } from '../types/api';

// ===========================
// 型定義
// ===========================

export interface ShiftDetail {
  id: number;
  shiftId: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  status: 'working' | 'off' | 'requested_off' | 'emergency_off';
  timeSlotId: number | null;
  generatedBy: 'manual' | 'ai' | 'leave_request';
  isChanged: boolean;
  previousTimeSlotId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkTimeSlot {
  id: number;
  name: string; // 早番、遅番、夜勤
  displayLabel: string; // A, B, C
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isNightShift: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeShiftData {
  date: string;
  status: 'working' | 'off' | 'requested_off' | 'emergency_off' | 'tentative';
  timeSlot: WorkTimeSlot | null;
  isChanged: boolean;
  note?: string;
  shiftId?: number;
}

// ===========================
// インターフェース定義
// ===========================

export interface ShiftDetailService {
  /**
   * 職員の当月シフト詳細を取得
   */
  getEmployeeShiftDetails(employeeId: number, shiftId: number): Promise<ShiftDetail[]>;

  /**
   * 勤務時間枠一覧を取得
   */
  getWorkTimeSlots(): Promise<WorkTimeSlot[]>;

  /**
   * 職員の当月シフトデータ（日付ごと）を取得
   */
  getEmployeeMonthlyShift(employeeId: number, year: number, month: number): Promise<EmployeeShiftData[]>;
}

// ===========================
// モック実装
// ===========================

class ShiftDetailServiceMock implements ShiftDetailService {
  private readonly SHIFT_DETAILS_KEY = 'shift_details_data';
  private readonly WORK_TIME_SLOTS_KEY = 'work_time_slots_data';

  private getDefaultWorkTimeSlots(): WorkTimeSlot[] {
    return [
      {
        id: 1,
        name: '早番',
        displayLabel: 'A',
        startTime: '07:00',
        endTime: '16:00',
        isNightShift: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: '遅番',
        displayLabel: 'B',
        startTime: '11:00',
        endTime: '20:00',
        isNightShift: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: '夜勤',
        displayLabel: 'C',
        startTime: '16:00',
        endTime: '09:00',
        isNightShift: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private getStoredWorkTimeSlots(): WorkTimeSlot[] {
    if (typeof window === 'undefined') return this.getDefaultWorkTimeSlots();
    const stored = localStorage.getItem(this.WORK_TIME_SLOTS_KEY);
    if (!stored) return this.getDefaultWorkTimeSlots();
    try {
      return JSON.parse(stored);
    } catch {
      return this.getDefaultWorkTimeSlots();
    }
  }

  async getWorkTimeSlots(): Promise<WorkTimeSlot[]> {
    return this.getStoredWorkTimeSlots();
  }

  async getEmployeeShiftDetails(employeeId: number, shiftId: number): Promise<ShiftDetail[]> {
    // モック: ランダムなシフトデータを生成しない（空配列を返す）
    return [];
  }

  async getEmployeeMonthlyShift(
    employeeId: number,
    year: number,
    month: number
  ): Promise<EmployeeShiftData[]> {
    // モック: 空配列を返す（本番APIで実装）
    return [];
  }
}

// ===========================
// 本番実装
// ===========================

class ShiftDetailServiceProduction implements ShiftDetailService {
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

  async getEmployeeShiftDetails(employeeId: number, shiftId: number): Promise<ShiftDetail[]> {
    try {
      const response = await this.fetchApi<ShiftDetail[]>(
        `/api/trpc/shiftDetails.getByEmployee?employeeId=${employeeId}&shiftId=${shiftId}`,
        { method: 'GET' }
      );
      return response.data || [];
    } catch {
      return [];
    }
  }

  async getWorkTimeSlots(): Promise<WorkTimeSlot[]> {
    try {
      const response = await this.fetchApi<WorkTimeSlot[]>(
        '/api/trpc/workTimeSlots.list',
        { method: 'GET' }
      );
      return response.data || [];
    } catch {
      return [];
    }
  }

  async getEmployeeMonthlyShift(
    employeeId: number,
    year: number,
    month: number
  ): Promise<EmployeeShiftData[]> {
    try {
      // 1. 年月からシフトを取得
      const shiftResponse = await this.fetchApi<{ id: number } | null>(
        `/api/trpc/shifts.getByYearMonth?year=${year}&month=${month}`,
        { method: 'GET' }
      );

      if (!shiftResponse.data || !shiftResponse.data.id) {
        return [];
      }

      const shiftId = shiftResponse.data.id;

      // 2. シフト詳細を取得
      const [details, timeSlots] = await Promise.all([
        this.getEmployeeShiftDetails(employeeId, shiftId),
        this.getWorkTimeSlots(),
      ]);

      // 3. TimeSlotとマージ
      const timeSlotsMap = new Map(timeSlots.map(ts => [ts.id, ts]));

      return details.map(detail => ({
        date: detail.date,
        status: detail.status,
        timeSlot: detail.timeSlotId ? (timeSlotsMap.get(detail.timeSlotId) || null) : null,
        isChanged: detail.isChanged,
      }));
    } catch (error) {
      console.error('Failed to load employee monthly shift:', error);
      return [];
    }
  }
}

// ===========================
// エクスポート
// ===========================

import { ENV } from '../lib/env';

// 本番では常にProductionを強制（VITE_USE_MOCK_APIが未定義でも安全）
const useMock = ENV.PROD ? false : ENV.USE_MOCK;

export const shiftDetailService: ShiftDetailService = useMock
  ? new ShiftDetailServiceMock()
  : new ShiftDetailServiceProduction();

export { ShiftDetailServiceMock, ShiftDetailServiceProduction };
