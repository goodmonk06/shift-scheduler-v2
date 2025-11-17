import { Sparkles, Heart, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import type { VacationDayDialogProps } from "../types/vacationTypes";

export function VacationDayDialog({
  open,
  onOpenChange,
  selectedDay,
  nextMonthName,
  holidayName,
  requestType,
  setRequestType,
  startHour,
  startMinute,
  endHour,
  endMinute,
  reason,
  setReason,
  onSave,
  onRemove,
  hasRequest,
  onTimePickerOpen,
}: VacationDayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-2 border-secondary/30 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{holidayName ? "🎌" : "📅"}</span>
            <div className="flex flex-col">
              <span>{nextMonthName}{selectedDay}日の設定</span>
              {holidayName && (
                <span className="text-sm text-destructive font-medium">{holidayName}</span>
              )}
            </div>
            <Sparkles className="w-5 h-5 text-accent ml-auto" />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Request Type */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-accent fill-accent" />
              休みの種類
            </Label>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setRequestType("休")}
                className={`
                  relative p-6 rounded-2xl transition-all duration-300 text-left
                  ${requestType === "休"
                    ? "bg-gradient-to-br from-success/30 to-success/15 border-4 border-success shadow-lg scale-[1.02]"
                    : "bg-white border-2 border-muted hover:border-success/50 hover:bg-success/5"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🌸</span>
                  <span className={`text-2xl font-bold ${requestType === "休" ? "text-[#2B3A55]" : "text-foreground"}`}>
                    休
                  </span>
                  {requestType === "休" && (
                    <CheckCircle className="w-8 h-8 text-success ml-auto" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRequestType("有休")}
                className={`
                  relative p-6 rounded-2xl transition-all duration-300 text-left
                  ${requestType === "有休"
                    ? "bg-gradient-to-br from-secondary/40 to-secondary/20 border-4 border-secondary shadow-lg scale-[1.02]"
                    : "bg-white border-2 border-muted hover:border-secondary/50 hover:bg-secondary/5"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">💐</span>
                  <span className={`text-2xl font-bold ${requestType === "有休" ? "text-[#2B3A55]" : "text-foreground"}`}>
                    有休
                  </span>
                  {requestType === "有休" && (
                    <CheckCircle className="w-8 h-8 text-[#2B3A55] ml-auto" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequestType("時間指定");
                  onTimePickerOpen();
                }}
                className={`
                  relative p-6 rounded-2xl transition-all duration-300 text-left
                  ${requestType === "時間指定"
                    ? "bg-gradient-to-br from-accent/40 to-accent/20 border-4 border-accent shadow-lg scale-[1.02]"
                    : "bg-white border-2 border-muted hover:border-accent/50 hover:bg-accent/5"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">⏰</span>
                  <div className="flex-1">
                    <span className={`text-2xl font-bold ${requestType === "時間指定" ? "text-[#2B3A55]" : "text-foreground"}`}>
                      時間指定
                    </span>
                    {requestType === "時間指定" && startHour && endHour && (
                      <div className="mt-2 text-lg font-medium text-[#2B3A55]">
                        {startHour}:{startMinute} - {endHour}:{endMinute}
                      </div>
                    )}
                  </div>
                  {requestType === "時間指定" && (
                    <CheckCircle className="w-8 h-8 text-[#2B3A55] ml-auto" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <span className="text-xl">💭</span>
              理由（任意）
            </Label>
            <Textarea
              id="reason"
              placeholder="例：家族の用事、通院など"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] rounded-2xl border-2"
            />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-background border-t pt-4 gap-2 flex-col sm:flex-row">
          {hasRequest && (
            <Button
              variant="outline"
              onClick={onRemove}
              className="rounded-xl text-destructive hover:text-destructive border-2 w-full sm:w-auto"
            >
              🗑️ 削除
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-2 flex-1 sm:flex-none"
            >
              キャンセル
            </Button>
            <Button
              onClick={onSave}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              設定する
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
