import { Info, Sparkles, BookOpen, LogOut } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import type { AppInfoCardProps } from "../types/settingsTypes";

export function AppInfoCard({ onShowTutorial, onShowLogout }: AppInfoCardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h3>アプリ情報</h3>
        </div>

        <div className="space-y-3">
          {/* Version */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm">バージョン</p>
                <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tutorial Button */}
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl border-2"
            onClick={onShowTutorial}
          >
            <BookOpen className="w-5 h-5 mr-3" />
            使い方ガイド
          </Button>

          {/* Logout Button */}
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onShowLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            ログアウト
          </Button>
        </div>
      </div>
    </Card>
  );
}
