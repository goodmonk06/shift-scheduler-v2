/**
 * 勤務希望API抽象化層
 *
 * 時間指定勤務（特定の時間帯のみ勤務可能）の管理
 */

import { trpcClient } from '../lib/trpc';

// ===========================
// インターフェース定義
// ===========================

export interface WorkPreference {
  id: number;
  employeeId: number;
  shiftId: number | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM - 勤務可能開始時刻
  endTime: string; // HH:MM - 勤務可能終了時刻
  isAdditional: boolean;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface CreateWorkPreferenceInput {
  employeeId: number;
  shiftId?: number;
  startDate: string;
  endDate: string;
  startTime: string; // HH:MM format - required
  endTime: string; // HH:MM format - required
  isAdditional?: boolean;
  reason?: string;
}

export interface WorkPreferenceService {
  /**
   * 全勤務希望一覧を取得（管理者用）
   */
  getAll(): Promise<WorkPreference[]>;

  /**
   * 指定シフトの勤務希望一覧を取得
   */
  getByShift(shiftId: number): Promise<WorkPreference[]>;

  /**
   * 職員の勤務希望一覧を取得
   */
  getByEmployee(employeeId: number): Promise<WorkPreference[]>;

  /**
   * 勤務希望を作成
   */
  create(input: CreateWorkPreferenceInput): Promise<WorkPreference>;

  /**
   * 勤務希望を更新
   */
  update(id: number, data: Partial<CreateWorkPreferenceInput>): Promise<WorkPreference>;

  /**
   * 勤務希望を削除
   */
  delete(id: number): Promise<void>;

  /**
   * 勤務希望を承認
   */
  approve(id: number): Promise<WorkPreference>;

  /**
   * 勤務希望を却下
   */
  reject(id: number): Promise<WorkPreference>;
}

// ===========================
// 本番実装
// ===========================

class WorkPreferenceServiceProduction implements WorkPreferenceService {
  async getAll(): Promise<WorkPreference[]> {
    const result = await trpcClient.workPreferences.list.query();
    return (result || []) as WorkPreference[];
  }

  async getByShift(shiftId: number): Promise<WorkPreference[]> {
    const result = await trpcClient.workPreferences.getByShift.query({ shiftId });
    return (result || []) as WorkPreference[];
  }

  async getByEmployee(employeeId: number): Promise<WorkPreference[]> {
    const result = await trpcClient.workPreferences.getByEmployee.query({ employeeId });
    return (result || []) as WorkPreference[];
  }

  async create(input: CreateWorkPreferenceInput): Promise<WorkPreference> {
    const result = await trpcClient.workPreferences.create.mutate(input);
    return result as unknown as WorkPreference;
  }

  async update(id: number, data: Partial<CreateWorkPreferenceInput>): Promise<WorkPreference> {
    const result = await trpcClient.workPreferences.update.mutate({ id, ...data });
    return result as unknown as WorkPreference;
  }

  async delete(id: number): Promise<void> {
    await trpcClient.workPreferences.delete.mutate({ id });
  }

  async approve(id: number): Promise<WorkPreference> {
    const result = await trpcClient.workPreferences.approve.mutate({ id });
    return result as unknown as WorkPreference;
  }

  async reject(id: number): Promise<WorkPreference> {
    const result = await trpcClient.workPreferences.reject.mutate({ id });
    return result as unknown as WorkPreference;
  }
}

// ===========================
// Mock実装（開発・テスト用）
// ===========================

class WorkPreferenceServiceMock implements WorkPreferenceService {
  private mockData: WorkPreference[] = [
    {
      id: 1,
      employeeId: 1,
      shiftId: 1,
      startDate: "2025-12-10",
      endDate: "2025-12-10",
      startTime: "09:00",
      endTime: "13:00",
      isAdditional: false,
      reason: "午後は私用があります",
      status: "approved",
      submittedAt: new Date().toISOString(),
    },
  ];

  async getAll(): Promise<WorkPreference[]> {
    return [...this.mockData];
  }

  async getByShift(shiftId: number): Promise<WorkPreference[]> {
    return this.mockData.filter(wp => wp.shiftId === shiftId);
  }

  async getByEmployee(employeeId: number): Promise<WorkPreference[]> {
    return this.mockData.filter(wp => wp.employeeId === employeeId);
  }

  async create(input: CreateWorkPreferenceInput): Promise<WorkPreference> {
    const newPref: WorkPreference = {
      id: this.mockData.length + 1,
      ...input,
      shiftId: input.shiftId || null,
      isAdditional: input.isAdditional || false,
      reason: input.reason || null,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    this.mockData.push(newPref);
    return newPref;
  }

  async update(id: number, data: Partial<CreateWorkPreferenceInput>): Promise<WorkPreference> {
    const index = this.mockData.findIndex(wp => wp.id === id);
    if (index === -1) throw new Error("勤務希望が見つかりません");

    this.mockData[index] = { ...this.mockData[index], ...data };
    return this.mockData[index];
  }

  async delete(id: number): Promise<void> {
    const index = this.mockData.findIndex(wp => wp.id === id);
    if (index === -1) throw new Error("勤務希望が見つかりません");

    this.mockData.splice(index, 1);
  }

  async approve(id: number): Promise<WorkPreference> {
    const index = this.mockData.findIndex(wp => wp.id === id);
    if (index === -1) throw new Error("勤務希望が見つかりません");

    this.mockData[index].status = "approved";
    return this.mockData[index];
  }

  async reject(id: number): Promise<WorkPreference> {
    const index = this.mockData.findIndex(wp => wp.id === id);
    if (index === -1) throw new Error("勤務希望が見つかりません");

    this.mockData[index].status = "rejected";
    return this.mockData[index];
  }
}

// ===========================
// サービスインスタンスのエクスポート
// ===========================

/**
 * 勤務希望サービス
 * 環境に応じて本番実装またはMock実装を使用
 */
export const workPreferenceService: WorkPreferenceService =
  import.meta.env.MODE === 'test'
    ? new WorkPreferenceServiceMock()
    : new WorkPreferenceServiceProduction();
