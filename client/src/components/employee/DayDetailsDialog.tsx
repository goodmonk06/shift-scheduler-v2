import { Calendar, Clock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { getShiftEmoji } from "../../utils/employeeHomeUtils";
import type { DayDetailsDialogProps } from "../../types/employeeHomeTypes";

export function DayDetailsDialog({ open, onOpenChange, selectedDay }: DayDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-secondary/30" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            11月{selectedDay?.day}日の予定
            <Sparkles className="w-5 h-5 text-accent ml-auto" />
          </DialogTitle>
        </DialogHeader>

        {selectedDay && (
          <div className="space-y-4 py-4">
            {/* Shift Info */}
            {selectedDay.hasShift ? (
              <Card className="p-5 bg-gradient-to-br from-secondary/10 to-accent/5 border-2 border-secondary/30">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">
                    {getShiftEmoji(selectedDay.shiftType)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3>{selectedDay.shiftType}</h3>
                      <Badge className="bg-gradient-to-r from-primary to-primary/80">
                        出勤日
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{selectedDay.shiftTime}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🌸</div>
                  <div>
                    <h3>お休み</h3>
                    <p className="text-muted-foreground">ゆっくりお過ごしください</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Event Info */}
            {selectedDay.event && (
              <Card className="p-5 bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">🎉</div>
                    <h4>{selectedDay.event.title}</h4>
                  </div>
                  <p className="text-muted-foreground">
                    {selectedDay.event.description}
                  </p>
                  {selectedDay.event.time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{selectedDay.event.time}</span>
                    </div>
                  )}
                  <Badge className="bg-gradient-to-r from-warning to-warning/70">
                    施設イベント
                  </Badge>
                </div>
              </Card>
            )}

            {/* Holiday Info */}
            {selectedDay.isHoliday && selectedDay.holidayName && (
              <Card className="p-5 bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/30">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🎌</div>
                  <div>
                    <h4 className="text-destructive font-medium">{selectedDay.holidayName}</h4>
                    <p className="text-muted-foreground text-sm">祝日</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
