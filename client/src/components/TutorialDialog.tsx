import { BookOpen, Home, Calendar, Users, Settings as SettingsIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import type { TutorialDialogProps } from "../types/settingsTypes";

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-2 border-secondary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            使い方ガイド
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4>ホーム</h4>
                    <p className="text-sm text-muted-foreground">
                      次回のシフトや今月のスケジュールを確認できます。緊急連絡ボタンから管理者に連絡できます。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4>希望休</h4>
                    <p className="text-sm text-muted-foreground">
                      カレンダーから日付を選んで、休み・有休・時間指定の希望を入力できます。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4>シフト</h4>
                    <p className="text-sm text-muted-foreground">
                      確定したシフトを確認できます。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <SettingsIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4>設定</h4>
                    <p className="text-sm text-muted-foreground">
                      文字サイズや色のテーマ、ヘッダー画像をカスタマイズできます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full rounded-xl">
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
