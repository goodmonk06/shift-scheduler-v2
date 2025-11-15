/**
 * 認証API抽象化層
 * 
 * ログイン、ログアウト、現在のユーザー情報取得などの認証関連API
 */

import type { User, Employee, AuthResponse, ApiResponse } from '../types/api';

// ===========================
// インターフェース定義
// ===========================

export interface LoginCredentials {
  email: string;
  password: string;
  role: 'employee' | 'admin';
}

export interface LoginResult {
  id: number;
  name: string;
  role: 'employee' | 'admin';
  email?: string;
}

export interface AuthService {
  /**
   * 統合ログイン（職員・管理者共通）
   */
  login(credentials: LoginCredentials): Promise<LoginResult>;

  /**
   * 職員ログイン（簡易認証）- レガシー
   */
  loginAsEmployee(identifier: string): Promise<AuthResponse>;

  /**
   * 管理者ログイン - レガシー
   */
  loginAsAdmin(email: string): Promise<AuthResponse>;

  /**
   * ログアウト
   */
  logout(): Promise<void>;

  /**
   * 現在のユーザー情報を取得
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * 現在のユーザーの職員情報を取得
   */
  getCurrentEmployee(): Promise<Employee | null>;
}

// ===========================
// モック実装
// ===========================

class AuthServiceMock implements AuthService {
  private readonly CURRENT_USER_KEY = 'auth_current_user';
  private readonly CURRENT_EMPLOYEE_KEY = 'auth_current_employee';

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    // モック認証（常に成功）
    await new Promise(resolve => setTimeout(resolve, 500)); // ローディング演出

    if (credentials.role === 'employee') {
      const user: LoginResult = {
        id: 1,
        name: '山田花子',
        role: 'employee',
        email: credentials.email,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      }

      return user;
    } else {
      const user: LoginResult = {
        id: 100,
        name: '管理者',
        role: 'admin',
        email: credentials.email,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      }

      return user;
    }
  }

  async loginAsEmployee(identifier: string): Promise<AuthResponse> {
    // デモ用の職員データ
    const mockUser: User = {
      id: 1,
      name: '山田花子',
      email: null,
      role: 'user',
      openId: identifier,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const mockEmployee: Employee = {
      id: 1,
      userId: 1,
      employeeId: identifier,
      name: '山田花子',
      email: null,
      positionGroupId: 1,
      skillLevel: 80,
      canWorkNightShift: true,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(this.CURRENT_EMPLOYEE_KEY, JSON.stringify(mockEmployee));
    }

    return {
      success: true,
      user: mockUser,
    };
  }

  async loginAsAdmin(email: string): Promise<AuthResponse> {
    // デモ用の管理者データ
    const mockUser: User = {
      id: 100,
      name: '管理者',
      email: email,
      role: 'admin',
      openId: email,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(mockUser));
      localStorage.removeItem(this.CURRENT_EMPLOYEE_KEY);
    }

    return {
      success: true,
      user: mockUser,
    };
  }

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CURRENT_USER_KEY);
      localStorage.removeItem(this.CURRENT_EMPLOYEE_KEY);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.CURRENT_USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  async getCurrentEmployee(): Promise<Employee | null> {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.CURRENT_EMPLOYEE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}

// ===========================
// 本番実装
// ===========================

class AuthServiceProduction implements AuthService {
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

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    // ✅ バックエンド実装例:
    const response = await this.fetchApi<LoginResult>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );

    if (!response.data) {
      throw new Error('ログインに失敗しました');
    }

    return response.data;
  }

  async loginAsEmployee(identifier: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/simple-auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ログインに失敗しました');
    }

    const data = await response.json();

    // Convert simpleAuth response to User type
    const user: User = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: 'user',
      openId: data.user.employeeId,
      employeePrimaryId: data.user.employeePrimaryId, // Employee.id (primary key)
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    return {
      success: true,
      user,
    };
  }

  async loginAsAdmin(email: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/admin-auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ログインに失敗しました');
    }

    const data = await response.json();

    const user: User = {
      id: data.user.id,
      name: data.user.name || '管理者',
      email: data.user.email,
      role: 'admin',
      openId: data.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    return {
      success: true,
      user,
    };
  }

  async logout(): Promise<void> {
    // Try both logout endpoints
    await Promise.all([
      fetch(`${this.baseUrl}/api/simple-auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {}),
      fetch(`${this.baseUrl}/api/admin-auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {}),
    ]);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('[AuthService] Checking current user...');

      // Try employee auth first
      const employeeResponse = await fetch(`${this.baseUrl}/api/simple-auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      console.log('[AuthService] Employee auth response:', employeeResponse.status, employeeResponse.ok);

      if (employeeResponse.ok) {
        const data = await employeeResponse.json();
        if (data.user) {
          console.log('[AuthService] Employee user found:', data.user.name);
          return {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: 'user',
            openId: data.user.employeeId,
            employeePrimaryId: data.user.employeePrimaryId, // Employee.id (primary key)
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
        }
      }

      // Try admin auth
      const adminResponse = await fetch(`${this.baseUrl}/api/admin-auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      console.log('[AuthService] Admin auth response:', adminResponse.status, adminResponse.ok);

      if (adminResponse.ok) {
        const data = await adminResponse.json();
        if (data.user) {
          console.log('[AuthService] Admin user found:', data.user.name || '管理者');
          return {
            id: data.user.id,
            name: data.user.name || '管理者',
            email: data.user.email,
            role: 'admin',
            openId: data.user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
        }
      }

      console.log('[AuthService] No authenticated user found');
      return null;
    } catch (error) {
      console.error('[AuthService] Error checking current user:', error);
      return null;
    }
  }

  async getCurrentEmployee(): Promise<Employee | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/simple-auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.user) return null;

      // Get employee details via tRPC
      // For now, return a minimal employee object
      // TODO: Call tRPC employees.getByUserId when needed
      return null;
    } catch {
      return null;
    }
  }
}

// ===========================
// エクスポート
// ===========================

import { ENV } from '../lib/env';

// 本番では常にProductionを強制（VITE_USE_MOCK_APIが未定義でも安全）
const useMock = ENV.PROD ? false : ENV.USE_MOCK;

export const authService: AuthService = useMock
  ? new AuthServiceMock()
  : new AuthServiceProduction();

export { AuthServiceMock, AuthServiceProduction };
