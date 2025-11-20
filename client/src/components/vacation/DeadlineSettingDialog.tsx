import { Settings, Sparkles, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface DeadlineSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempDate: string;
  tempTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSave: () => void;
}

export function DeadlineSettingDialog({
  open,
  onOpenChange,
  tempDate,
  tempTime,
  onDateChange,
  onTimeChange,
  onSave
}: DeadlineSettingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] rounded-3xl border-2 border-secondary/30 flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            希望休申請の締切設定
            <Sparkles className="w-5 h-5 text-accent ml-auto" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="space-y-1">
                <h4>締切日について</h4>
                <p className="text-muted-foreground">
                  この日時を過ぎると、職員は希望休の申請・変更ができなくなります。
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="deadline-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                締切日
              </Label>
              <Input
                id="deadline-date"
                type="date"
                value={tempDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="rounded-xl border-2 h-12"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="deadline-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                締切時刻
              </Label>
              <Input
                id="deadline-time"
                type="time"
                value={tempTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="rounded-xl border-2 h-12"
              />
            </div>
          </div>

          {/* Preview */}
          {tempDate && tempTime && (
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/5 border-2 border-primary/20">
              <div className="space-y-2">
                <p className="text-muted-foreground">設定後の締切日時</p>
                <h4>
                  {new Date(`${tempDate}T${tempTime}`).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </h4>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-2"
          >
            キャンセル
          </Button>
          <Button
            onClick={onSave}
            className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg"
            disabled={!tempDate || !tempTime}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            設定する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
