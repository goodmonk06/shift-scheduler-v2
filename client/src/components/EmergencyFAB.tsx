import { useState } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

interface EmergencyFABProps {
  hasNotifications?: boolean;
}

export function EmergencyFAB({ hasNotifications = false }: EmergencyFABProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    console.log("Emergency notification:", message);
    setShowDialog(false);
    setMessage("");
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-50">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent to-destructive rounded-full blur-xl opacity-50 animate-pulse" />
        
        <button
          onClick={() => setShowDialog(true)}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-accent via-accent/90 to-destructive/80 shadow-2xl hover:shadow-accent/50 transition-all hover:scale-110 flex items-center justify-center group"
          aria-label="緊急連絡"
        >
          <Bell className="w-7 h-7 text-white group-hover:animate-bounce" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </span>
            </span>
          )}
        </button>
        
        {/* Label */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 bg-card px-3 py-1 rounded-full shadow-lg border-2 border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          <span>緊急連絡</span>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-3xl border-2 border-accent/30 shadow-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/30 rounded-2xl blur-md" />
                <div className="relative bg-gradient-to-br from-accent to-accent/80 p-3 rounded-2xl shadow-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className="flex-1">緊急連絡</span>
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gradient-to-br from-warning/20 via-warning/10 to-accent/10 border-2 border-warning/30 rounded-2xl">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <p className="text-muted-foreground">
                  急な体調不良や緊急の予定変更など、すぐに管理者へ連絡が必要な場合にご使用ください。
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                連絡内容
              </label>
              <Textarea
                placeholder="例：体調不良のため本日の勤務が難しいです"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[150px] rounded-2xl border-2 focus:border-accent"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="rounded-xl border-2"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="rounded-xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg"
            >
              <Bell className="w-4 h-4 mr-2" />
              送信する
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
