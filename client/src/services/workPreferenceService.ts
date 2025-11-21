/**
 * 勤務希望API抽象化層
 *
 * 時間指定勤務（特定の時間帯のみ勤務可能）の管理
 */

import { trpcClient } from '../lib/trpc';

// ===========================
// インターフェース定義
// ===========================

export type WorkPreferenceType = "time_specified" | "night_shift" | "post_night" | "training" | "other";

export interface WorkPreference {
  id: number;
  employeeId: number;
  shiftId: number | null;
  date: string; // YYYY-MM-DD
  preferenceType: WorkPreferenceType;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  notes: string | null;
  isCountAsStaff: boolean;
  displayIcon: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface CreateWorkPreferenceInput {
  employeeId: number;
  shiftId?: number;
  date: string;
  preferenceType: WorkPreferenceType;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  isCountAsStaff?: boolean;
  displayIcon?: string | null;
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
    try {
      const result = await trpcClient.db.query.mutate({
        sql: `
          SELECT
            wp.id,
            wp.employee_id as employeeId,
            wp.shift_id as shiftId,
            wp.date,
            wp.preference_type as preferenceType,
            wp.start_time as startTime,
            wp.end_time as endTime,
            wp.notes,
            wp.is_count_as_staff as isCountAsStaff,
            wp.display_icon as displayIcon,
            wp.status,
            wp.submitted_at as submittedAt
          FROM workPreferences wp
          ORDER BY wp.date ASC, wp.employee_id ASC
        `,
        params: [],
      });

      return (result as any[]).map((row: any) => ({
        ...row,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch work preferences:", error);
      return [];
    }
  }

  async getByShift(shiftId: number): Promise<WorkPreference[]> {
    try {
      const result = await trpcClient.db.query.mutate({
        sql: `
          SELECT
            wp.id,
            wp.employee_id as employeeId,
            wp.shift_id as shiftId,
            wp.date,
            wp.preference_type as preferenceType,
            wp.start_time as startTime,
            wp.end_time as endTime,
            wp.notes,
            wp.is_count_as_staff as isCountAsStaff,
            wp.display_icon as displayIcon,
            wp.status,
            wp.submitted_at as submittedAt
          FROM workPreferences wp
          WHERE wp.shift_id = ?
          ORDER BY wp.date ASC, wp.employee_id ASC
        `,
        params: [shiftId],
      });

      return (result as any[]).map((row: any) => ({
        ...row,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch work preferences by shift:", error);
      return [];
    }
  }

  async getByEmployee(employeeId: number): Promise<WorkPreference[]> {
    try {
      const result = await trpcClient.db.query.mutate({
        sql: `
          SELECT
            wp.id,
            wp.employee_id as employeeId,
            wp.shift_id as shiftId,
            wp.date,
            wp.preference_type as preferenceType,
            wp.start_time as startTime,
            wp.end_time as endTime,
            wp.notes,
            wp.is_count_as_staff as isCountAsStaff,
            wp.display_icon as displayIcon,
            wp.status,
            wp.submitted_at as submittedAt
          FROM workPreferences wp
          WHERE wp.employee_id = ?
          ORDER BY wp.date ASC
        `,
        params: [employeeId],
      });

      return (result as any[]).map((row: any) => ({
        ...row,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch work preferences by employee:", error);
      return [];
    }
  }

  async create(input: CreateWorkPreferenceInput): Promise<WorkPreference> {
    throw new Error("Create not implemented - use direct database access");
  }

  async update(id: number, data: Partial<CreateWorkPreferenceInput>): Promise<WorkPreference> {
    throw new Error("Update not implemented - use direct database access");
  }

  async delete(id: number): Promise<void> {
    throw new Error("Delete not implemented - use direct database access");
  }

  async approve(id: number): Promise<WorkPreference> {
    try {
      await trpcClient.db.query.mutate({
        sql: `UPDATE workPreferences SET status = 'approved' WHERE id = ?`,
        params: [id],
      });

      // Fetch and return the updated record
      const result = await trpcClient.db.query.mutate({
        sql: `SELECT * FROM workPreferences WHERE id = ?`,
        params: [id],
      });

      const row = (result as any[])[0];
      return {
        ...row,
        employeeId: row.employee_id,
        shiftId: row.shift_id,
        preferenceType: row.preference_type,
        startTime: row.start_time,
        endTime: row.end_time,
        isCountAsStaff: row.is_count_as_staff,
        displayIcon: row.display_icon,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to approve work preference:", error);
      throw error;
    }
  }

  async reject(id: number): Promise<WorkPreference> {
    try {
      await trpcClient.db.query.mutate({
        sql: `UPDATE workPreferences SET status = 'rejected' WHERE id = ?`,
        params: [id],
      });

      // Fetch and return the updated record
      const result = await trpcClient.db.query.mutate({
        sql: `SELECT * FROM workPreferences WHERE id = ?`,
        params: [id],
      });

      const row = (result as any[])[0];
      return {
        ...row,
        employeeId: row.employee_id,
        shiftId: row.shift_id,
        preferenceType: row.preference_type,
        startTime: row.start_time,
        endTime: row.end_time,
        isCountAsStaff: row.is_count_as_staff,
        displayIcon: row.display_icon,
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to reject work preference:", error);
      throw error;
    }
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
      date: "2025-12-10",
      preferenceType: "time_specified",
      startTime: "09:00",
      endTime: "13:00",
      notes: "午後は私用があります",
      isCountAsStaff: true,
      displayIcon: null,
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
      employeeId: input.employeeId,
      shiftId: input.shiftId || null,
      date: input.date,
      preferenceType: input.preferenceType,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      notes: input.notes || null,
      isCountAsStaff: input.isCountAsStaff !== undefined ? input.isCountAsStaff : true,
      displayIcon: input.displayIcon || null,
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
 * TODO: TRPCルーターにworkPreferencesエンドポイントを実装後、本番実装を有効化
 */
export const workPreferenceService: WorkPreferenceService = new WorkPreferenceServiceMock();

// ===========================
// ヘルパー関数
// ===========================

/**
 * 勤務希望タイプのラベルを取得
 */
export function getPreferenceTypeLabel(type: WorkPreferenceType): string {
  switch (type) {
    case "time_specified":
      return "勤務希望";
    case "night_shift":
      return "夜勤";
    case "post_night":
      return "明け";
    case "training":
      return "研修";
    case "other":
      return "その他";
    default:
      return type;
  }
}

/**
 * 勤務希望タイプのアイコンを取得
 */
export function getPreferenceIcon(type: WorkPreferenceType, customIcon?: string | null): string {
  if (customIcon) return customIcon;

  switch (type) {
    case "time_specified":
      return "⏰";
    case "night_shift":
      return "🌙";
    case "post_night":
      return "🌅";
    case "training":
      return "📚";
    case "other":
      return "📌";
    default:
      return "📝";
  }
}

/**
 * 勤務希望タイプの色を取得（Tailwind CSSクラス）
 */
export function getPreferenceColor(type: WorkPreferenceType): string {
  switch (type) {
    case "time_specified":
      return "bg-blue-100 text-blue-700";
    case "night_shift":
      return "bg-purple-100 text-purple-700";
    case "post_night":
      return "bg-orange-100 text-orange-700";
    case "training":
      return "bg-green-100 text-green-700";
    case "other":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
