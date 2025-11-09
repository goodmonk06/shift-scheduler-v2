import { FileText, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import type { ActualReportDialogProps } from "../types/shiftViewTypes";

export function ActualReportDialog({
  open,
  onOpenChange,
  selectedShift,
  actualStartTime,
  actualEndTime,
  reportNote,
  onActualStartTimeChange,
  onActualEndTimeChange,
  onReportNoteChange,
  onSubmit,
}: ActualReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            勤務実績報告
          </DialogTitle>
          <DialogDescription>
            実際の勤務時間を報告してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex gap-2">
              <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm">予定シフト</h4>
                {selectedShift && (
                  <p className="text-sm text-muted-foreground">
                    {selectedShift.date} ({selectedShift.shiftType})
                    <br />
                    予定時間: {selectedShift.time}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm">実際の開始時刻 *</label>
              <Input
                type="time"
                value={actualStartTime}
                onChange={(e) => onActualStartTimeChange(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">実際の終了時刻 *</label>
              <Input
                type="time"
                value={actualEndTime}
                onChange={(e) => onActualEndTimeChange(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm">備考（任意）</label>
            <Textarea
              placeholder="例: 利用者様の緊急対応のため30分残業しました"
              value={reportNote}
              onChange={(e) => onReportNoteChange(e.target.value)}
              className="rounded-xl"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              予定と異なる場合は理由を記入してください
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
            className="rounded-xl bg-purple-600 hover:bg-purple-700"
          >
            報告する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
