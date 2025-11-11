import { useState } from "react";
import {
  Home, Users, Sparkles, Calendar,
  Briefcase, Clock, Settings, UsersRound,
  FileText, Bell, Archive, BarChart3,
  RefreshCw, LogOut, Server
} from "lucide-react";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { AdminDashboard } from "./components/AdminDashboard";
import { ShiftCreation } from "./components/ShiftCreation";
import { ShiftEditor } from "./components/ShiftEditor";
import { VacationManagement } from "./components/VacationManagement";
import { StaffManagement } from "./components/StaffManagement";
import { PositionGroups } from "./components/PositionGroups";
import { WorkTimeSlots } from "./components/WorkTimeSlots";
import { WorkplaceRules } from "./components/WorkplaceRules";
import { RequiredStaffing } from "./components/RequiredStaffing";
import { ShiftList } from "./components/ShiftList";
import { ChangeProposals } from "./components/ChangeProposals";
import { Statistics } from "./components/Statistics";
import { EmergencyNotifications } from "./components/EmergencyNotifications";
import { ShiftArchive } from "./components/ShiftArchive";
import { ServerManagement } from "./components/ServerManagement";
import { VacationProvider } from "./contexts/VacationContext";

type AdminView =
  | "dashboard"
  | "employees"
  | "position-groups"
  | "work-time-slots"
  | "workplace-rules"
  | "required-staffing"
  | "shifts"
  | "shift-editor"
  | "leave-requests"
  | "change-proposals"
  | "statistics"
  | "emergency-notifications"
  | "archive"
  | "server-management";

interface AdminAppProps {
  hasNotifications?: boolean;
  onNotificationsToggle?: () => void;
  onLogout?: () => void;
}

export function AdminApp({ hasNotifications = false, onNotificationsToggle, onLogout }: AdminAppProps) {
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // シフト編集画面へ遷移
  const handleEditShift = (shiftId: string) => {
    setEditingShiftId(shiftId);
    setAdminView("shift-editor");
  };

  // シフト一覧に戻る
  const handleBackToShiftList = () => {
    setEditingShiftId(null);
    setAdminView("shifts");
  };

  // Admin Navigation
  const renderAdminView = () => {
    console.log("Current admin view:", adminView); // デバッグ用
    switch (adminView) {
      case "dashboard":
        return <AdminDashboard onNavigate={handleViewChange} />;
      case "employees":
        return <StaffManagement />;
      case "position-groups":
        return <PositionGroups />;
      case "work-time-slots":
        return <WorkTimeSlots />;
      case "workplace-rules":
        return <WorkplaceRules />;
      case "required-staffing":
        return <RequiredStaffing />;
      case "shifts":
        return <ShiftList onEditShift={handleEditShift} />;
      case "shift-editor":
        return editingShiftId ? (
          <ShiftEditor shiftId={editingShiftId} onBack={handleBackToShiftList} />
        ) : (
          <ShiftCreation onBack={handleBackToShiftList} />
        );
      case "leave-requests":
        return <VacationManagement />;
      case "change-proposals":
        return <ChangeProposals />;
      case "statistics":
        return <Statistics />;
      case "emergency-notifications":
        return <EmergencyNotifications />;
      case "archive":
        return <ShiftArchive />;
      case "server-management":
        return <ServerManagement />;
      default:
        return <AdminDashboard onNavigate={handleViewChange} />;
    }
  };
  
  // ビュー変更ハンドラー（デバッグ用）
  const handleViewChange = (view: AdminView) => {
    console.log("Changing view to:", view);
    setAdminView(view);
  };

  return (
    <VacationProvider>
      <div className="flex" data-user-type="admin">
        {/* Admin Sidebar Navigation */}
        <aside className="w-64 bg-card border-r min-h-[calc(100vh-73px)]">
        <ScrollArea className="h-[calc(100vh-73px)]">
          <nav className="space-y-1 p-4">
            {/* メイン */}
            <div className="space-y-1">
              <Button
                variant={adminView === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                ダッシュボード
              </Button>
            </div>

            <Separator className="my-3" />

            {/* マスタ管理 */}
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs text-muted-foreground">マスタ管理</p>
              <Button
                variant={adminView === "employees" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("employees")}
              >
                <Users className="w-4 h-4 mr-2" />
                職員管理
              </Button>
              <Button
                variant={adminView === "position-groups" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("position-groups")}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                役職グループ
              </Button>
              <Button
                variant={adminView === "work-time-slots" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("work-time-slots")}
              >
                <Clock className="w-4 h-4 mr-2" />
                勤務時間枠
              </Button>
            </div>

            <Separator className="my-3" />

            {/* 設定 */}
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs text-muted-foreground">設定</p>
              <Button
                variant={adminView === "workplace-rules" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("workplace-rules")}
              >
                <Settings className="w-4 h-4 mr-2" />
                職場ルール
              </Button>
              <Button
                variant={adminView === "required-staffing" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("required-staffing")}
              >
                <UsersRound className="w-4 h-4 mr-2" />
                必要人数設定
              </Button>
            </div>

            <Separator className="my-3" />

            {/* シフト管理 */}
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs text-muted-foreground">シフト管理</p>
              <Button
                variant={adminView === "shifts" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("shifts")}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                シフト作成・編集
              </Button>
              <Button
                variant={adminView === "leave-requests" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("leave-requests")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                希望休管理
              </Button>
              <Button
                variant={adminView === "change-proposals" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("change-proposals")}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                変更提案管理
              </Button>
            </div>

            <Separator className="my-3" />

            {/* その他 */}
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs text-muted-foreground">その他</p>
              <Button
                variant={adminView === "statistics" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("statistics")}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                統計・レポート
              </Button>
              <Button
                variant={adminView === "emergency-notifications" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("emergency-notifications")}
              >
                <Bell className="w-4 h-4 mr-2" />
                緊急通知
              </Button>
              <Button
                variant={adminView === "archive" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("archive")}
              >
                <Archive className="w-4 h-4 mr-2" />
                アーカイブ
              </Button>
              <Button
                variant={adminView === "server-management" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl"
                onClick={() => handleViewChange("server-management")}
              >
                <Server className="w-4 h-4 mr-2" />
                サーバー管理
              </Button>
            </div>

            {onLogout && (
              <>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ログアウト
                  </Button>
                </div>
              </>
            )}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {renderAdminView()}
        
        {/* デモ用：通知を切り替えるボタン */}
        {onNotificationsToggle && (
          <div className="fixed bottom-4 right-4">
            <Button
              onClick={onNotificationsToggle}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              {hasNotifications ? "通知をクリア" : "通知を作成"}
            </Button>
          </div>
        )}
      </main>
      </div>
    </VacationProvider>
  );
}
