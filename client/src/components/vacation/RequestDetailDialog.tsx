import { User, Sparkles, Calendar, Clock, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { getTypeConfig, formatDate } from "../../utils/vacationManagementHelpers";
import type { VacationRequest } from "../../contexts/VacationContext";

interface RequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: VacationRequest | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function RequestDetailDialog({
  open,
  onOpenChange,
  request,
  onApprove,
  onReject
}: RequestDetailDialogProps) {
  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden rounded-3xl border-2 border-secondary/30"
        aria-describedby={undefined}
        style={{ height: '85vh' }}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {request.staffName}さんの希望休申請
              <Sparkles className="w-5 h-5 text-accent ml-auto" />
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <Avatar className="bg-gradient-to-br from-primary/20 to-secondary/20 w-12 h-12">
                  <AvatarFallback className="text-primary">
                    {request.staffName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4>{request.staffName}</h4>
                  <p className="text-muted-foreground">{request.month}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">申請日時</p>
                <span>{formatDate(request.submittedAt)}</span>
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                申請内容 ({request.requests.length}件)
              </h4>
              <div className="space-y-2">
                {request.requests.map((req, index) => {
                  const typeConfig = getTypeConfig(req.type);
                  const monthPart = request.month.split("年")[1]?.replace("月", "/") || "";
                  return (
                    <Card key={index} className="p-4 bg-gradient-to-br from-card to-secondary/5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{typeConfig.emoji}</div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>
                                {monthPart}
                                {req.day}日
                              </span>
                              <Badge variant="outline" className={`${typeConfig.color} border-2`}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            {req.type === "時間指定" && req.startTime && req.endTime && (
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {req.startTime} - {req.endTime}
                              </p>
                            )}
                            {req.reason && (
                              <p className="text-muted-foreground">
                                💭 {req.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t">
          <DialogFooter className="gap-2">
            {request.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onReject(String(request.id))}
                  className="rounded-xl border-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  却下する
                </Button>
                <Button
                  onClick={() => onApprove(String(request.id))}
                  className="rounded-xl bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  承認する
                </Button>
              </>
            )}
            {request.status !== "pending" && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-2"
              >
                閉じる
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
