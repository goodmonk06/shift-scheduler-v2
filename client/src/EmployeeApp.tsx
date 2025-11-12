import { useState, useEffect } from "react";
import { Calendar, Home, Users, AlertTriangle, Heart, Settings as SettingsIcon } from "lucide-react";
import { Button } from "./components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";
import { EmployeeHome } from "./components/EmployeeHome";
import { VacationRequest } from "./components/VacationRequest";
import { ShiftView } from "./components/ShiftView";
import { EmergencyFAB } from "./components/EmergencyFAB";
import { Settings, themes, headerImages, fontSizes } from "./components/Settings";
import { Toaster } from "./components/ui/sonner";

type EmployeeView = "home" | "vacation" | "shift" | "settings";

interface EmployeeAppProps {
  hasNotifications?: boolean;
  onLogout?: () => void;
  employeeName?: string;
  employeeId?: number;
}

export function EmployeeApp({ hasNotifications = false, onLogout, employeeName = "ゲスト", employeeId = 1 }: EmployeeAppProps) {
  const [employeeView, setEmployeeView] = useState<EmployeeView>("home");
  // 未保存の変更があるかどうか（VacationRequestから受け取る）
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedCount, setUnsavedCount] = useState(0);
  // 警告ダイアログの状態
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<EmployeeView | null>(null);
  
  // 設定: テーマ、ヘッダー画像、フォントサイズ（職員画面専用）
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('employeeTheme') || 'default';
    }
    return 'default';
  });
  const [selectedImage, setSelectedImage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('employeeHeaderImage') || 'flowers';
    }
    return 'flowers';
  });
  const [selectedFontSize, setSelectedFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('employeeFontSize') || 'medium';
    }
    return 'medium';
  });

  // 初期化時にデフォルト値を設定
  useEffect(() => {
    const root = document.documentElement;
    const theme = themes.find(t => t.id === 'default');
    if (theme) {
      root.style.setProperty('--employee-primary', theme.colors.primary);
      root.style.setProperty('--employee-secondary', theme.colors.secondary);
      root.style.setProperty('--employee-accent', theme.colors.accent);
    }
    root.style.setProperty('--employee-font-size', '16px');
  }, []);

  // テーマを適用（職員画面専用のCSS変数）
  useEffect(() => {
    const theme = themes.find(t => t.id === selectedTheme);
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--employee-primary', theme.colors.primary);
      root.style.setProperty('--employee-secondary', theme.colors.secondary);
      root.style.setProperty('--employee-accent', theme.colors.accent);
    }
    localStorage.setItem('employeeTheme', selectedTheme);
  }, [selectedTheme]);

  // 画像設定を保存
  useEffect(() => {
    localStorage.setItem('employeeHeaderImage', selectedImage);
  }, [selectedImage]);

  // フォントサイズを適用（職員画面専用）
  useEffect(() => {
    const fontSize = fontSizes.find(f => f.id === selectedFontSize);
    if (fontSize) {
      const root = document.documentElement;
      root.style.setProperty('--employee-font-size', fontSize.size);
    }
    localStorage.setItem('employeeFontSize', selectedFontSize);
  }, [selectedFontSize]);

  const currentHeaderImageUrl = headerImages.find(img => img.id === selectedImage)?.url || headerImages[0].url;

  // ナビゲーション処理（未保存の変更チェック含む）
  const handleNavigation = (view: EmployeeView) => {
    // 同じ画面への遷移は無視
    if (view === employeeView) return;
    
    // 希望休画面から離れようとしていて、未保存の変更がある場合
    if (employeeView === "vacation" && hasUnsavedChanges) {
      setPendingNavigation(view);
      setShowExitAlert(true);
      return;
    }
    
    // それ以外は直接遷移
    setEmployeeView(view);
  };

  // 警告を確認して移動
  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      setEmployeeView(pendingNavigation);
      setHasUnsavedChanges(false);
      setUnsavedCount(0);
      setShowExitAlert(false);
      setPendingNavigation(null);
    }
  };

  // 移動をキャンセル
  const handleCancelNavigation = () => {
    setShowExitAlert(false);
    setPendingNavigation(null);
  };

  // Employee Navigation
  const renderEmployeeView = () => {
    switch (employeeView) {
      case "home":
        return <EmployeeHome employeeName={employeeName} employeeId={employeeId} hasNotifications={hasNotifications} headerImageUrl={currentHeaderImageUrl} />;
      case "vacation":
        return (
          <VacationRequest 
            onUnsavedChangesChange={(hasChanges, count) => {
              setHasUnsavedChanges(hasChanges);
              setUnsavedCount(count);
            }}
            headerImageUrl={currentHeaderImageUrl}
          />
        );
      case "shift":
        return <ShiftView />;
      case "settings":
        return (
          <Settings
            selectedTheme={selectedTheme}
            selectedImage={selectedImage}
            selectedFontSize={selectedFontSize}
            onThemeChange={setSelectedTheme}
            onImageChange={setSelectedImage}
            onFontSizeChange={setSelectedFontSize}
            onLogout={onLogout}
          />
        );
      default:
        return <EmployeeHome employeeName={employeeName} employeeId={employeeId} hasNotifications={hasNotifications} headerImageUrl={currentHeaderImageUrl} />;
    }
  };

  return (
    <>
      <Toaster />
      <div className="pb-20" data-user-type="employee">
        {renderEmployeeView()}
      </div>
      
      {/* Bottom Navigation for Employee - Always visible */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-2 p-3">
          <Button
            variant={employeeView === "home" ? "default" : "ghost"}
            className={`flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all ${
              employeeView === "home" 
                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg" 
                : "hover:bg-secondary/20"
            }`}
            onClick={() => handleNavigation("home")}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">ホーム</span>
          </Button>
          <Button
            variant={employeeView === "vacation" ? "default" : "ghost"}
            className={`flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all ${
              employeeView === "vacation" 
                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg" 
                : "hover:bg-secondary/20"
            }`}
            onClick={() => handleNavigation("vacation")}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">希望休</span>
          </Button>
          <Button
            variant={employeeView === "shift" ? "default" : "ghost"}
            className={`flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all ${
              employeeView === "shift" 
                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg" 
                : "hover:bg-secondary/20"
            }`}
            onClick={() => handleNavigation("shift")}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">シフト</span>
          </Button>
          <Button
            variant={employeeView === "settings" ? "default" : "ghost"}
            className={`flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all ${
              employeeView === "settings" 
                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg" 
                : "hover:bg-secondary/20"
            }`}
            onClick={() => handleNavigation("settings")}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-xs">設定</span>
          </Button>
        </div>
      </div>

      {/* Emergency FAB - Only show on employee home */}
      {employeeView === "home" && <EmergencyFAB hasNotifications={hasNotifications} />}

      {/* Exit Alert Dialog */}
      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="rounded-3xl border-2 border-warning/50 max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-warning" />
              未送信の希望休があります
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  現在{unsavedCount}件の希望休が未送信です。
                </p>
                <p className="text-destructive">
                  このまま移動すると、入力した内容は失われます。
                </p>
                <div className="p-3 bg-warning/10 rounded-xl border-2 border-warning/30">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-xl">💡</span>
                    <span>希望休を保存するには「申請する」ボタンを押してください</span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={handleCancelNavigation}
              className="rounded-xl border-2"
            >
              <Heart className="w-4 h-4 mr-2 fill-current" />
              入力を続ける
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmNavigation}
              className="rounded-xl bg-gradient-to-r from-destructive to-destructive/80"
            >
              破棄して移動
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
