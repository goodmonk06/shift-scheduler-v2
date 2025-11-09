import { MessageSquare, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import type { AdditionalRequestDialogProps } from "../types/shiftViewTypes";

export function AdditionalRequestDialog({
  open,
  onOpenChange,
  selectedShift,
  requestReason,
  onRequestReasonChange,
  onSubmit,
}: AdditionalRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-warning" />
            追加の希望休申請
          </DialogTitle>
          <DialogDescription>
            仮確定後のやむを得ない事情による追加希望を申請します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm">申請内容</h4>
                {selectedShift && (
                  <p className="text-sm text-muted-foreground">
                    {selectedShift.date} ({selectedShift.shiftType} {selectedShift.time})
                    <br />
                    この日を休みにする追加希望を申請します
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <label className="text-sm">やむを得ない理由 *</label>
            <Textarea
              placeholder="例: 子供の急な発熱のため、保育園から呼び出しがありました"
              value={requestReason}
              onChange={(e) => onRequestReasonChange(e.target.value)}
              className="rounded-xl"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              緊急性のある理由を具体的に記入してください
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            キャンセル
          </Button>
          <Button
            onClick={onSubmit}
            className="rounded-xl bg-warning hover:bg-warning/90"
          >
            申請する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
