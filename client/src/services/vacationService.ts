/**
 * 希望休API抽象化層
 * 
 * このファイルは開発環境と本番環境の切り替えを容易にするための抽象化層です。
 * 
 * 開発環境: localStorageを使ったモック実装
 * 本番環境: バックエンドAPIを呼び出す実装
 * 
 * バックエンド統合時は、VacationServiceProduction の実装を完成させてください。
 */

import type {
  LeaveRequest,
  CreateLeaveRequestInput,
  CreateLeaveRequestBatchInput,
  UpdateLeaveRequestInput,
  GetLeaveRequestsFilter,
  SetLeaveRequestDeadlineInput,
  ApiResponse,
} from '../types/api';

// ===========================
// インターフェース定義
// ===========================

export interface VacationService {
  /**
   * 職員の希望休一覧を取得
   */
  getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]>;

  /**
   * 希望休を作成（単一）
   */
  createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest>;

  /**
   * 希望休を一括作成（複数日をまとめて申請）
   */
  createLeaveRequestBatch(input: CreateLeaveRequestBatchInput): Promise<LeaveRequest[]>;

  /**
   * 希望休を更新
   */
  updateLeaveRequest(id: number, input: UpdateLeaveRequestInput): Promise<LeaveRequest>;

  /**
   * 希望休を削除
   */
  deleteLeaveRequest(id: number): Promise<void>;

  /**
   * 希望休を承認
   */
  approveLeaveRequest(id: number): Promise<LeaveRequest>;

  /**
   * 希望休を却下
   */
  rejectLeaveRequest(id: number): Promise<LeaveRequest>;

  /**
   * シフトの希望休締め切り日を取得
   */
  getLeaveRequestDeadline(shiftId: number): Promise<Date>;

  /**
   * シフトの希望休締め切り日を設定
   */
  setLeaveRequestDeadline(input: SetLeaveRequestDeadlineInput): Promise<void>;

  /**
   * 全ての希望休申請を取得（管理者用）
   */
  getAllLeaveRequests(shiftId?: number): Promise<LeaveRequest[]>;
}

// ===========================
// モック実装（localStorage使用）
// ===========================

class VacationServiceMock implements VacationService {
  private readonly STORAGE_KEY = 'vacation_leave_requests';
  private readonly DEADLINE_KEY = 'vacation_deadline';

  private getStoredRequests(): LeaveRequest[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveRequests(requests: LeaveRequest[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    }
  }

  async getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]> {
    const requests = this.getStoredRequests();
    return requests.filter(req => {
      if (filter.employeeId && req.employeeId !== filter.employeeId) return false;
      if (filter.shiftId && req.shiftId !== filter.shiftId) return false;
      if (filter.status && !filter.status.includes(req.status)) return false;
      if (filter.month) {
        const reqMonth = req.startDate.substring(0, 7); // YYYY-MM
        if (reqMonth !== filter.month) return false;
      }
      return true;
    });
  }

  async createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    const requests = this.getStoredRequests();
    const newRequest: LeaveRequest = {
      id: Date.now(),
      employeeId: input.employeeId,
      shiftId: input.shiftId,
      requestDate: input.requestDate,
      startDate: input.startDate,
      endDate: input.endDate,
      leaveType: input.leaveType,
      startTime: input.startTime,
      endTime: input.endTime,
      reason: input.reason || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    requests.push(newRequest);
    this.saveRequests(requests);
    return newRequest;
  }

  async createLeaveRequestBatch(input: CreateLeaveRequestBatchInput): Promise<LeaveRequest[]> {
    const created: LeaveRequest[] = [];
    for (const req of input.requests) {
      const result = await this.createLeaveRequest({
        employeeId: input.employeeId,
        shiftId: input.shiftId,
        requestDate: new Date().toISOString().split('T')[0],
        startDate: req.date,
        endDate: req.date,
        leaveType: req.leaveType,
        startTime: req.startTime,
        endTime: req.endTime,
        reason: req.reason,
      });
      created.push(result);
    }
    return created;
  }

  async updateLeaveRequest(id: number, input: UpdateLeaveRequestInput): Promise<LeaveRequest> {
    const requests = this.getStoredRequests();
    const index = requests.findIndex(req => req.id === id);
    if (index === -1) {
      throw new Error(`LeaveRequest with id ${id} not found`);
    }
    
    requests[index] = {
      ...requests[index],
      ...input,
      updatedAt: new Date(),
    };
    this.saveRequests(requests);
    return requests[index];
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    const requests = this.getStoredRequests();
    const filtered = requests.filter(req => req.id !== id);
    this.saveRequests(filtered);
  }

  async approveLeaveRequest(id: number): Promise<LeaveRequest> {
    return this.updateLeaveRequest(id, { status: 'approved' });
  }

  async rejectLeaveRequest(id: number): Promise<LeaveRequest> {
    return this.updateLeaveRequest(id, { status: 'rejected' });
  }

  async getLeaveRequestDeadline(shiftId: number): Promise<Date> {
    if (typeof window === 'undefined') {
      return new Date(2025, 10, 15, 23, 59, 59);
    }
    const stored = localStorage.getItem(this.DEADLINE_KEY);
    if (!stored) {
      return new Date(2025, 10, 15, 23, 59, 59);
    }
    try {
      return new Date(stored);
    } catch {
      return new Date(2025, 10, 15, 23, 59, 59);
    }
  }

  async setLeaveRequestDeadline(input: SetLeaveRequestDeadlineInput): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.DEADLINE_KEY, input.deadline.toISOString());
    }
  }

  async getAllLeaveRequests(shiftId?: number): Promise<LeaveRequest[]> {
    const requests = this.getStoredRequests();
    if (shiftId) {
      return requests.filter(req => req.shiftId === shiftId);
    }
    return requests;
  }
}

// ===========================
// 本番実装（バックエンドAPI呼び出し）
// ===========================

class VacationServiceProduction implements VacationService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }

  /**
   * API呼び出しのヘルパーメソッド
   */
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

  async getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const params = new URLSearchParams();
    if (filter.employeeId) params.append('employeeId', filter.employeeId.toString());
    if (filter.shiftId) params.append('shiftId', filter.shiftId.toString());
    if (filter.month) params.append('month', filter.month);
    if (filter.status) params.append('status', filter.status.join(','));

    const response = await this.fetchApi<LeaveRequest[]>(
      `/api/trpc/leaveRequests.getByEmployee?${params.toString()}`,
      { method: 'GET' }
    );
    return response.data || [];
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<LeaveRequest>(
      '/api/trpc/leaveRequests.create',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return response.data!;
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async createLeaveRequestBatch(input: CreateLeaveRequestBatchInput): Promise<LeaveRequest[]> {
    // TODO: バックエンド側で実装
    // ✅ 新規エンドポイントが必要: leaveRequests.createBatch
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<LeaveRequest[]>(
      '/api/trpc/leaveRequests.createBatch',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return response.data || [];
    */
    throw new Error('Not implemented - バックエンド側で leaveRequests.createBatch を実装してください');
  }

  async updateLeaveRequest(id: number, input: UpdateLeaveRequestInput): Promise<LeaveRequest> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<LeaveRequest>(
      '/api/trpc/leaveRequests.update',
      {
        method: 'PUT',
        body: JSON.stringify({ id, ...input }),
      }
    );
    return response.data!;
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    await this.fetchApi<void>(
      '/api/trpc/leaveRequests.delete',
      {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      }
    );
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async approveLeaveRequest(id: number): Promise<LeaveRequest> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<LeaveRequest>(
      '/api/trpc/leaveRequests.approve',
      {
        method: 'PUT',
        body: JSON.stringify({ id }),
      }
    );
    return response.data!;
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async rejectLeaveRequest(id: number): Promise<LeaveRequest> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<LeaveRequest>(
      '/api/trpc/leaveRequests.reject',
      {
        method: 'PUT',
        body: JSON.stringify({ id }),
      }
    );
    return response.data!;
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }

  async getLeaveRequestDeadline(shiftId: number): Promise<Date> {
    // TODO: バックエンド側で実装
    // ✅ 新規エンドポイントが必要: shifts.getLeaveRequestDeadline
    // ✅ 実装例:
    /*
    const response = await this.fetchApi<{ deadline: string }>(
      `/api/trpc/shifts.getLeaveRequestDeadline?shiftId=${shiftId}`,
      { method: 'GET' }
    );
    return new Date(response.data!.deadline);
    */
    throw new Error('Not implemented - バックエンド側で shifts.getLeaveRequestDeadline を実装してください');
  }

  async setLeaveRequestDeadline(input: SetLeaveRequestDeadlineInput): Promise<void> {
    // TODO: バックエンド側で実装
    // ✅ 新規エンドポイントが必要: shifts.setLeaveRequestDeadline
    // ✅ 実装例:
    /*
    await this.fetchApi<void>(
      '/api/trpc/shifts.setLeaveRequestDeadline',
      {
        method: 'PUT',
        body: JSON.stringify({
          shiftId: input.shiftId,
          deadline: input.deadline.toISOString(),
        }),
      }
    );
    */
    throw new Error('Not implemented - バックエンド側で shifts.setLeaveRequestDeadline を実装してください');
  }

  async getAllLeaveRequests(shiftId?: number): Promise<LeaveRequest[]> {
    // TODO: バックエンド側で実装
    // ✅ 実装例:
    /*
    const params = shiftId ? `?shiftId=${shiftId}` : '';
    const response = await this.fetchApi<LeaveRequest[]>(
      `/api/trpc/leaveRequests.list${params}`,
      { method: 'GET' }
    );
    return response.data || [];
    */
    throw new Error('Not implemented - バックエンド側で実装してください');
  }
}

// ===========================
// エクスポート
// ===========================

/**
 * 使用するサービス実装を選択
 * 
 * 環境変数 VITE_USE_MOCK_API で切り替え:
 * - true または未設定: モック実装を使用（開発環境）
 * - false: 本番実装を使用（本番環境）
 */
export const vacationService: VacationService = 
  import.meta.env.VITE_USE_MOCK_API === 'true'
    ? new VacationServiceMock()
    : new VacationServiceProduction();

// テスト用にクラスもエクスポート
export { VacationServiceMock, VacationServiceProduction };
