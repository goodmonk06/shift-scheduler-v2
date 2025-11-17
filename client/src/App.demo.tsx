import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { EmployeeApp } from "./EmployeeApp";
import { AdminApp } from "./AdminApp";
import { EmployeeLogin } from "./components/EmployeeLogin";
import { AdminLogin } from "./components/AdminLogin";
import { VacationProvider } from "./contexts/VacationContext";
import { ShiftEditor } from "./components/ShiftEditor";

/**
 * デモ用のメインアプリケーション
 * 実際の実装では、ログイン画面と各画面は別のルート/URLになります
 * 
 * 画面構成:
 * 1. 職員ログイン画面 (/employee/login)
 * 2. 職員画面 (/employee)
 * 3. 管理者ログイン画面 (/admin/login)
 * 4. 管理者画面 (/)
 * 5. シフト作成画面 (開発用)
 * 
 * 職員側エンジニアに渡すファイル:
 * - EmployeeLogin.tsx (ログイン画面)
 * - EmployeeApp.tsx (メインアプリ)
 * - components/EmployeeHome.tsx
 * - components/VacationRequest.tsx
 * - components/ShiftView.tsx
 * - components/EmergencyFAB.tsx
 * - components/DecorativeElements.tsx
 * 
 * 管理者側エンジニアに渡すファイル:
 * - AdminLogin.tsx (ログイン画面)
 * - AdminApp.tsx (メインアプリ)
 * - components/AdminDashboard.tsx
 * - components/ShiftEditor.tsx
 */

type ViewType = "employee-login" | "employee-app" | "admin-login" | "admin-app" | "shift-editor";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("employee-login");
  // 管理者からの通知（シフト仮確定など）があるかどうか
  const [hasNotifications, setHasNotifications] = useState(false);

  return (
    <VacationProvider>
      <div className="min-h-screen bg-background">
        {/* Top Mode Switcher - デモ用のみ */}
        <div className="border-b bg-card/50 backdrop-blur fixed top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Tabs
              value={currentView}
              onValueChange={(v: string) => setCurrentView(v as ViewType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 rounded-xl h-auto p-1">
                <TabsTrigger 
                  value="employee-login" 
                  className="rounded-xl py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-accent data-[state=active]:text-white"
                >
                  <span className="hidden sm:inline">👤 </span>職員ログイン
                </TabsTrigger>
                <TabsTrigger 
                  value="employee-app" 
                  className="rounded-xl py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-accent data-[state=active]:text-white"
                >
                  <span className="hidden sm:inline">📱 </span>職員画面
                </TabsTrigger>
                <TabsTrigger 
                  value="admin-login" 
                  className="rounded-xl py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white"
                >
                  <span className="hidden sm:inline">🔐 </span>管理者ログイン
                </TabsTrigger>
                <TabsTrigger 
                  value="admin-app" 
                  className="rounded-xl py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white"
                >
                  <span className="hidden sm:inline">👔 </span>管理者画面
                </TabsTrigger>
                <TabsTrigger 
                  value="shift-editor" 
                  className="rounded-xl py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <span className="hidden sm:inline">✨ </span>シフト作成
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-20">
          {currentView === "employee-login" && (
            <EmployeeLogin 
              onLoginSuccess={() => setCurrentView("employee-app")}
              onSwitchToAdmin={() => setCurrentView("admin-login")}
            />
          )}
          
          {currentView === "employee-app" && (
            <EmployeeApp hasNotifications={hasNotifications} />
          )}
          
          {currentView === "admin-login" && (
            <AdminLogin 
              onLoginSuccess={() => setCurrentView("admin-app")}
              onSwitchToEmployee={() => setCurrentView("employee-login")}
            />
          )}
          
          {currentView === "admin-app" && (
            <AdminApp 
              hasNotifications={hasNotifications} 
              onNotificationsToggle={() => setHasNotifications(!hasNotifications)}
            />
          )}
          
          {currentView === "shift-editor" && (
            <ShiftEditor />
          )}
        </div>
      </div>
    </VacationProvider>
  );
}
