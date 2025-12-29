import { useState } from "react";
import {
  Home, Users, Sparkles, Calendar,
  Briefcase, Clock, Settings, UsersRound,
  FileText, Bell, Archive, BarChart3,
  RefreshCw, LogOut, Server, PartyPopper, Menu
} from "lucide-react";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { AdminDashboard } from "./components/AdminDashboard";
import { ShiftEditor } from "./components/ShiftEditor";
import { VacationManagement } from "./components/VacationManagement";
import { WorkPreferenceManagement } from "./components/WorkPreferenceManagement";
import { StaffManagement } from "./components/StaffManagement";
import { PositionGroups } from "./components/PositionGroups";
import { WorkTimeSlots } from "./components/WorkTimeSlots";
import { WorkplaceRules } from "./components/WorkplaceRules";
import { RequiredStaffing } from "./components/RequiredStaffing";
import { ShiftList } from "./components/ShiftList";
import { ShiftYearlyView } from "./components/ShiftYearlyView";
import { ChangeProposals } from "./components/ChangeProposals";
import { Statistics } from "./components/Statistics";
import { EmergencyNotifications } from "./components/EmergencyNotifications";
import { ShiftArchive } from "./components/ShiftArchive";
import { ServerManagement } from "./components/ServerManagement";
import { FacilityEventManagement } from "./components/FacilityEventManagement";
import { DecemberShiftGeneration } from "./components/DecemberShiftGeneration";
import { DecemberShiftSelectionModal } from "./components/DecemberShiftSelectionModal";
import { JanuaryShiftGeneration } from "./components/JanuaryShiftGeneration";
import { JanuaryShiftSelectionModal } from "./components/JanuaryShiftSelectionModal";
import { DevShiftGeneration } from "./components/DevShiftGeneration";
import { DevShiftSelectionModal } from "./components/DevShiftSelectionModal";
import { ShiftGeneration } from "./components/ShiftGeneration";
import { ShiftSelectionModal } from "./components/ShiftSelectionModal";
import { VacationProvider } from "./contexts/VacationContext";

type AdminView =
  | "dashboard"
  | "employees"
  | "position-groups"
  | "work-time-slots"
  | "workplace-rules"
  | "required-staffing"
  | "facility-events"
  | "shifts"
  | "shift-editor"
  | "shift-generation"
  | "december-shift-generation"
  | "january-shift-generation"
  | "dev-shift-generation"
  | "leave-requests"
  | "work-preferences"
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
  const [isDecemberSelectionModalOpen, setIsDecemberSelectionModalOpen] = useState(false);
  const [selectedDecemberShiftId, setSelectedDecemberShiftId] = useState<number | null>(null);
  const [isJanuarySelectionModalOpen, setIsJanuarySelectionModalOpen] = useState(false);
  const [selectedJanuaryShiftId, setSelectedJanuaryShiftId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 新しいシフト生成システム用（12月・1月以外）
  const [isShiftSelectionModalOpen, setIsShiftSelectionModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  // 開発専用シフト用
  const [isDevShiftSelectionModalOpen, setIsDevShiftSelectionModalOpen] = useState(false);
  const [devShiftYear, setDevShiftYear] = useState<number>(new Date().getFullYear());
  const [devShiftMonth, setDevShiftMonth] = useState<number>(new Date().getMonth() + 1);
  const [devShiftSourceId, setDevShiftSourceId] = useState<number | null>(null); // コピー元の本番シフトID

  // 未保存変更確認用
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<AdminView | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 未保存変更があるかチェックしてから画面遷移
  const navigateWithCheck = (newView: AdminView) => {
    if (hasUnsavedChanges) {
      setPendingView(newView);
      setIsUnsavedChangesModalOpen(true);
    } else {
      setAdminView(newView);
    }
  };

  // 未保存変更を破棄して画面遷移またはアクション実行
  const confirmNavigation = () => {
    setHasUnsavedChanges(false);

    if (pendingView) {
      setAdminView(pendingView);
      setPendingView(null);
    }

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }

    setIsUnsavedChangesModalOpen(false);
  };

  // 画面遷移をキャンセル
  const cancelNavigation = () => {
    setPendingView(null);
    setPendingAction(null);
    setIsUnsavedChangesModalOpen(false);
  };

  // シフト編集画面へ遷移
  const handleEditShift = (shiftId: string) => {
    console.log('[AdminApp] handleEditShift called with shiftId:', shiftId);
    setEditingShiftId(shiftId);
    setAdminView("shift-editor");
    console.log('[AdminApp] editingShiftId set to:', shiftId, 'view changed to: shift-editor');
  };

  // シフト一覧に戻る
  const handleBackToShiftList = () => {
    setEditingShiftId(null);
    setAdminView("shifts");
  };

  // 12月シフト生成画面へ遷移（年間ビューから）
  const handleDecemberClick = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => setIsDecemberSelectionModalOpen(true));
      setIsUnsavedChangesModalOpen(true);
    } else {
      setIsDecemberSelectionModalOpen(true);
    }
  };

  // 12月シフト：新規作成
  const handleDecemberNew = () => {
    setSelectedDecemberShiftId(null);
    setAdminView("december-shift-generation");
  };

  // 12月シフト：既存データから作成
  const handleDecemberExisting = (shiftId: number) => {
    setSelectedDecemberShiftId(shiftId);
    setAdminView("december-shift-generation");
  };

  // 1月シフト生成画面へ遷移（年間ビューから）
  const handleJanuaryClick = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => setIsJanuarySelectionModalOpen(true));
      setIsUnsavedChangesModalOpen(true);
    } else {
      setIsJanuarySelectionModalOpen(true);
    }
  };

  // 1月シフト：新規作成
  const handleJanuaryNew = () => {
    setSelectedJanuaryShiftId(null);
    setAdminView("january-shift-generation");
  };

  // 1月シフト：既存データから作成
  const handleJanuaryExisting = (shiftId: number) => {
    setSelectedJanuaryShiftId(shiftId);
    setAdminView("january-shift-generation");
  };

  // 1月シフト：12月データを引き継いで新規作成
  const handleJanuaryInherit = (decemberShiftId: number) => {
    setSelectedJanuaryShiftId(decemberShiftId);
    setAdminView("january-shift-generation");
  };

  // 開発専用シフト：月クリック時（開発タブから）
  const handleDevShiftClick = (year: number, month: number) => {
    setDevShiftYear(year);
    setDevShiftMonth(month);
    setDevShiftSourceId(null);
    setIsDevShiftSelectionModalOpen(true);
  };

  // 開発専用シフト：新規作成
  const handleDevShiftNew = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setDevShiftSourceId(null);
        setAdminView("dev-shift-generation");
      });
      setIsUnsavedChangesModalOpen(true);
    } else {
      setDevShiftSourceId(null);
      setAdminView("dev-shift-generation");
    }
  };

  // 開発専用シフト：本番データをコピーして作成
  const handleDevShiftCopy = (sourceShiftId: number) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setDevShiftSourceId(sourceShiftId);
        setAdminView("dev-shift-generation");
      });
      setIsUnsavedChangesModalOpen(true);
    } else {
      setDevShiftSourceId(sourceShiftId);
      setAdminView("dev-shift-generation");
    }
  };

  // 開発専用シフト：既存の開発データを開く
  const handleDevShiftExisting = (shiftId: number) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setDevShiftSourceId(shiftId);
        setAdminView("dev-shift-generation");
      });
      setIsUnsavedChangesModalOpen(true);
    } else {
      setDevShiftSourceId(shiftId);
      setAdminView("dev-shift-generation");
    }
  };

  // 12月・1月以外の月クリック時（年間ビューから）
  const handleMonthClick = (year: number, month: number, existingShiftId: number | null) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedShiftId(existingShiftId);
    setIsShiftSelectionModalOpen(true);
  };

  // 12月以外：新規作成
  const handleShiftNew = () => {
    setSelectedShiftId(null);
    setAdminView("shift-generation");
  };

  // 12月以外：既存データから作成
  const handleShiftExisting = (shiftId: number) => {
    setSelectedShiftId(shiftId);
    setAdminView("shift-generation");
  };

  // シフト生成画面から戻る
  const handleBackFromShiftGeneration = () => {
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
      case "facility-events":
        return <FacilityEventManagement />;
      case "shifts":
        return <ShiftYearlyView onEditShift={handleEditShift} onDecemberClick={handleDecemberClick} onJanuaryClick={handleJanuaryClick} onMonthClick={handleMonthClick} onDevShiftClick={handleDevShiftClick} />;
      case "shift-editor":
        console.log('[AdminApp] Rendering shift-editor, editingShiftId:', editingShiftId);
        if (!editingShiftId) {
          // This shouldn't happen - editingShiftId should always be set when navigating to shift-editor
          console.error('[AdminApp] No editingShiftId provided for shift-editor view');
          setAdminView("shifts");
          return <AdminDashboard onNavigate={handleViewChange} />;
        }
        return <ShiftEditor shiftId={editingShiftId} onBack={handleBackToShiftList} />;
      case "shift-generation":
        return <ShiftGeneration year={selectedYear} month={selectedMonth} initialShiftId={selectedShiftId} onBack={handleBackFromShiftGeneration} />;
      case "december-shift-generation":
        return <DecemberShiftGeneration initialShiftId={selectedDecemberShiftId} onUnsavedChanges={setHasUnsavedChanges} />;
      case "january-shift-generation":
        return <JanuaryShiftGeneration initialShiftId={selectedJanuaryShiftId} onUnsavedChanges={setHasUnsavedChanges} />;
      case "dev-shift-generation":
        return <DevShiftGeneration year={devShiftYear} month={devShiftMonth} initialShiftId={devShiftSourceId} onUnsavedChanges={setHasUnsavedChanges} />;
      case "leave-requests":
        return <VacationManagement />;
      case "work-preferences":
        return <WorkPreferenceManagement />;
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
  
  // ビュー変更ハンドラー（未保存変更をチェック）
  const handleViewChange = (view: AdminView) => {
    console.log("Changing view to:", view);
    navigateWithCheck(view);
  };

  return (
    <VacationProvider>
      <div className="flex h-[calc(100vh-73px)] overflow-hidden" data-user-type="admin">
        {/* Admin Sidebar Navigation */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-card border-r h-full print:hidden transition-all duration-300 relative flex-shrink-0`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-4 z-50 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <ScrollArea className="h-full">
          <nav className={`space-y-1 p-4 ${!isSidebarOpen && 'px-2'}`}>
            {/* メイン */}
            <div className="space-y-1">
              <Button
                variant={adminView === "dashboard" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("dashboard")}
              >
                <Home className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "ダッシュボード"}
              </Button>
            </div>

            {isSidebarOpen && <Separator className="my-3" />}

            {/* マスタ管理 */}
            <div className="space-y-1">
              {isSidebarOpen && <p className="px-3 py-2 text-xs text-muted-foreground">マスタ管理</p>}
              <Button
                variant={adminView === "employees" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("employees")}
              >
                <Users className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "職員管理"}
              </Button>
              <Button
                variant={adminView === "position-groups" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("position-groups")}
              >
                <Briefcase className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "役職グループ"}
              </Button>
              <Button
                variant={adminView === "work-time-slots" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("work-time-slots")}
              >
                <Clock className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "勤務時間枠"}
              </Button>
            </div>

            {isSidebarOpen && <Separator className="my-3" />}

            {/* 設定 */}
            <div className="space-y-1">
              {isSidebarOpen && <p className="px-3 py-2 text-xs text-muted-foreground">設定</p>}
              <Button
                variant={adminView === "workplace-rules" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("workplace-rules")}
              >
                <Settings className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "職場ルール"}
              </Button>
              <Button
                variant={adminView === "required-staffing" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("required-staffing")}
              >
                <UsersRound className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "必要人数設定"}
              </Button>
              <Button
                variant={adminView === "facility-events" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("facility-events")}
              >
                <PartyPopper className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "施設イベント"}
              </Button>
            </div>

            {isSidebarOpen && <Separator className="my-3" />}

            {/* シフト管理 */}
            <div className="space-y-1">
              {isSidebarOpen && <p className="px-3 py-2 text-xs text-muted-foreground">シフト管理</p>}
              <Button
                variant={adminView === "shifts" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("shifts")}
              >
                <Sparkles className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "シフト作成・編集"}
              </Button>
              <Button
                variant={adminView === "december-shift-generation" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => setIsDecemberSelectionModalOpen(true)}
              >
                <Calendar className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "12月シフト生成"}
              </Button>
              <Button
                variant={adminView === "leave-requests" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("leave-requests")}
              >
                <Calendar className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "希望休管理"}
              </Button>
              <Button
                variant={adminView === "work-preferences" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("work-preferences")}
              >
                <Clock className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "時間指定勤務希望"}
              </Button>
              <Button
                variant={adminView === "change-proposals" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("change-proposals")}
              >
                <RefreshCw className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "変更提案管理"}
              </Button>
            </div>

            {isSidebarOpen && <Separator className="my-3" />}

            {/* その他 */}
            <div className="space-y-1">
              {isSidebarOpen && <p className="px-3 py-2 text-xs text-muted-foreground">その他</p>}
              <Button
                variant={adminView === "statistics" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("statistics")}
              >
                <BarChart3 className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "統計・レポート"}
              </Button>
              <Button
                variant={adminView === "emergency-notifications" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("emergency-notifications")}
              >
                <Bell className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "緊急通知"}
              </Button>
              <Button
                variant={adminView === "archive" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("archive")}
              >
                <Archive className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "アーカイブ"}
              </Button>
              <Button
                variant={adminView === "server-management" ? "default" : "ghost"}
                className={`w-full ${isSidebarOpen ? 'justify-start' : 'justify-center px-2'} rounded-xl`}
                onClick={() => handleViewChange("server-management")}
              >
                <Server className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
                {isSidebarOpen && "サーバー管理"}
              </Button>
            </div>

            {onLogout && (
              <>
            {isSidebarOpen && <Separator className="my-3" />}
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onLogout}
                  >
                    <LogOut className={`w-4 h-4 ${isSidebarOpen && 'mr-2'}`} />
              {isSidebarOpen && "ログアウト"}
                  </Button>
                </div>
              </>
            )}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-auto">
        {renderAdminView()}

        {/* December Shift Selection Modal */}
        <DecemberShiftSelectionModal
          isOpen={isDecemberSelectionModalOpen}
          onClose={() => setIsDecemberSelectionModalOpen(false)}
          onSelectNew={handleDecemberNew}
          onSelectExisting={handleDecemberExisting}
        />

        {/* January Shift Selection Modal */}
        <JanuaryShiftSelectionModal
          isOpen={isJanuarySelectionModalOpen}
          onClose={() => setIsJanuarySelectionModalOpen(false)}
          onSelectNew={handleJanuaryNew}
          onSelectExisting={handleJanuaryExisting}
          onSelectInherit={handleJanuaryInherit}
        />

        {/* Dev Shift Selection Modal */}
        <DevShiftSelectionModal
          isOpen={isDevShiftSelectionModalOpen}
          onClose={() => setIsDevShiftSelectionModalOpen(false)}
          year={devShiftYear}
          month={devShiftMonth}
          onSelectNew={handleDevShiftNew}
          onSelectCopy={handleDevShiftCopy}
          onSelectExisting={handleDevShiftExisting}
        />

        {/* Shift Selection Modal (12月・1月以外用) */}
        <ShiftSelectionModal
          isOpen={isShiftSelectionModalOpen}
          onClose={() => setIsShiftSelectionModalOpen(false)}
          onSelectNew={handleShiftNew}
          onSelectExisting={handleShiftExisting}
          year={selectedYear}
          month={selectedMonth}
        />

        {/* 未保存変更確認モーダル */}
        {isUnsavedChangesModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">未保存の変更があります</h2>
              <p className="text-gray-600 mb-6">
                シフト作成を保存せずに離れますか？<br />
                保存していない変更は失われます。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelNavigation}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all font-semibold text-base"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmNavigation}
                  className="px-6 py-3 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all font-semibold text-base shadow-lg hover:shadow-xl"
                >
                  破棄して移動
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </VacationProvider>
  );
}
