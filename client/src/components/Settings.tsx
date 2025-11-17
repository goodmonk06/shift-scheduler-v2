import { useState } from "react";
import { Settings as SettingsIcon, Sparkles, AlertCircle, LogOut } from "lucide-react";
import { Card } from "./ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { FontSizeSelector } from "./FontSizeSelector";
import { ThemeSelector } from "./ThemeSelector";
import { HeaderImageSelector } from "./HeaderImageSelector";
import { AppInfoCard } from "./AppInfoCard";
import { TutorialDialog } from "./TutorialDialog";
import type { SettingsProps } from "../types/settingsTypes";

export { themes, headerImages, fontSizes } from "../constants/settingsConstants";
export type { Theme, HeaderImage, FontSize } from "../types/settingsTypes";

export function Settings({ selectedTheme, selectedImage, selectedFontSize, onThemeChange, onImageChange, onFontSizeChange, onLogout }: SettingsProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent" />
      <div className="absolute top-20 right-10 text-4xl opacity-20 animate-float">⚙️</div>
      <div className="absolute bottom-40 left-10 text-3xl opacity-20 animate-float-delayed">🎨</div>

      <div className="relative p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-primary" />
              設定
              <Sparkles className="w-5 h-5 text-accent" />
            </h2>
            <p className="text-muted-foreground">お好みのデザインにカスタマイズしましょう</p>
          </div>

          {/* Font Size Selection */}
          <FontSizeSelector selectedFontSize={selectedFontSize} onFontSizeChange={onFontSizeChange} />

          {/* Theme Selection */}
          <ThemeSelector selectedTheme={selectedTheme} onThemeChange={onThemeChange} />

          {/* Header Image Selection */}
          <HeaderImageSelector selectedImage={selectedImage} onImageChange={onImageChange} />

          {/* App Info Section */}
          <AppInfoCard onShowTutorial={() => setShowTutorial(true)} onShowLogout={() => setShowLogout(true)} />

          {/* Info Card */}
          <Card className="p-5 bg-gradient-to-br from-accent/20 via-accent/10 to-secondary/10 border-2 border-accent/40 shadow-lg">
            <div className="flex gap-4">
              <div className="text-4xl">✨</div>
              <div className="space-y-1">
                <h4>設定は自動保存されます</h4>
                <p className="text-sm text-muted-foreground">
                  変更した設定はすぐに反映され、次回アクセス時も保持されます。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tutorial Dialog */}
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-3xl border-2 border-warning/50 max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-warning" />
              ログアウトしますか？
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ログアウトすると、次回アクセス時に再度ログインが必要になります。
                </p>
                <div className="p-3 bg-accent/10 rounded-xl border-2 border-accent/30">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-xl">💡</span>
                    <span>設定内容は保存されますのでご安心ください</span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setShowLogout(false)}
              className="rounded-xl border-2"
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="rounded-xl bg-gradient-to-r from-destructive to-destructive/80"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
