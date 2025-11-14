import { useState, useEffect } from "react";
import { EmployeeApp } from "./EmployeeApp";
import { AdminApp } from "./AdminApp";
import { EmployeeLogin } from "./components/EmployeeLogin";
import { AdminLogin } from "./components/AdminLogin";
import { VacationProvider } from "./contexts/VacationContext";
import { authService } from "./services/authService";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { LoadingScreen } from "./components/ui/loading-spinner";

/**
 * 本番用のメインアプリケーション
 * 
 * ログインフロー:
 * 1. 未ログイン -> ログイン画面を表示
 * 2. ログイン成功 -> ユーザー権限に応じて職員画面 or 管理者画面を表示
 * 3. ログアウト -> ログイン画面に戻る
 * 
 * ルーティング:
 * - / : ログイン画面（未ログイン時）
 * - /employee : 職員画面（職員ログイン後）
 * - /admin : 管理者画面（管理者ログイン後）
 * 
 * 認証状態管理:
 * - authService を使用してログイン状態を管理
 * - トークンはlocalStorageまたはcookieに保存
 * - ページリロード時も認証状態を維持
 */

type UserRole = "employee" | "admin" | null;

interface User {
  id: number;
  name: string;
  role: UserRole;
  email?: string;
  employeePrimaryId?: number; // Employee.id (primary key) - for employee users only
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginType, setLoginType] = useState<"employee" | "admin">("employee");
  const [hasNotifications, setHasNotifications] = useState(false);

  // 初期化: 認証状態を確認
  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // role を employee | admin に正規化
        const normalizedRole = currentUser.role === 'user' ? 'employee' : currentUser.role as UserRole;
        setUser({
          id: currentUser.id,
          name: currentUser.name,
          role: normalizedRole,
          email: currentUser.email || undefined,
          employeePrimaryId: currentUser.employeePrimaryId, // Employee.id (primary key)
        });
      }
    } catch (error) {
      console.error("認証状態の確認に失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmployeeLogin(identifier: string) {
    try {
      // 職員は employeeId または email でログイン（パスワード不要）
      const response = await authService.loginAsEmployee(identifier);

      if (response.success && response.user) {
        setUser({
          id: response.user.id,
          name: response.user.name,
          role: "employee",
          email: response.user.email,
          employeePrimaryId: response.user.employeePrimaryId, // Employee.id (primary key)
        });
      }

      // 通知の確認（オプション）
      // const notifications = await notificationService.getUnread();
      // setHasNotifications(notifications.length > 0);
    } catch (error) {
      console.error("ログインエラー:", error);
      throw error; // EmployeeLoginコンポーネントでエラー表示
    }
  }

  async function handleAdminLogin(email: string) {
    try {
      // 管理者はメールアドレスでログイン（パスワード不要）
      const response = await authService.loginAsAdmin(email);

      if (response.success && response.user) {
        setUser({
          id: response.user.id,
          name: response.user.name,
          role: "admin",
          email: response.user.email,
        });
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      throw error; // AdminLoginコンポーネントでエラー表示
    }
  }

  async function handleLogout() {
    try {
      await authService.logout();
      setUser(null);
      setHasNotifications(false);
      setLoginType("employee"); // デフォルトに戻す
      toast.success("ログアウト完了", {
        description: "正常にログアウトしました",
      });
    } catch (error) {
      console.error("ログアウトエラー:", error);
      toast.error("ログアウトエラー", {
        description: "ログアウト処理に失敗しました",
      });
    }
  }

  // ローディング中
  if (isLoading) {
    return <LoadingScreen message="読み込み中..." />;
  }

  // 未ログイン: ログイン画面を表示
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {loginType === "employee" ? (
          <EmployeeLogin 
            onLoginSuccess={handleEmployeeLogin}
            onSwitchToAdmin={() => setLoginType("admin")}
          />
        ) : (
          <AdminLogin 
            onLoginSuccess={handleAdminLogin}
            onSwitchToEmployee={() => setLoginType("employee")}
          />
        )}
      </div>
    );
  }

  // ログイン済み: 権限に応じた画面を表示
  return (
    <ErrorBoundary>
      <VacationProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          {user.role === "employee" ? (
            <EmployeeApp
              hasNotifications={hasNotifications}
              onLogout={handleLogout}
              employeeName={user.name}
              employeeId={user.employeePrimaryId || user.id}
            />
          ) : (
            <AdminApp
              hasNotifications={hasNotifications}
              onNotificationsToggle={() => setHasNotifications(!hasNotifications)}
              onLogout={handleLogout}
            />
          )}
        </div>
      </VacationProvider>
    </ErrorBoundary>
  );
}
