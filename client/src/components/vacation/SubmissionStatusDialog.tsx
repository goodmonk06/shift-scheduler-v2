import { Users, Sparkles, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import type { SubmissionStatus } from "../../services/leaveRequestService";

interface SubmissionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: SubmissionStatus | null;
}

export function SubmissionStatusDialog({
  open,
  onOpenChange,
  status
}: SubmissionStatusDialogProps) {
  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col max-w-2xl max-h-[85vh] rounded-3xl border-2 border-secondary/30 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            希望休提出状況
            <Sparkles className="w-5 h-5 text-accent ml-auto" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">提出済</p>
                <h3 className="text-success">
                  {status.submitted} / {status.total}名
                </h3>
                <p className="text-xs text-muted-foreground">
                  ({Math.round((status.submitted / status.total) * 100)}%)
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">未提出</p>
                <h3 className="text-warning">
                  {status.notSubmitted.length}名
                </h3>
                <p className="text-xs text-muted-foreground">
                  ({Math.round((status.notSubmitted.length / status.total) * 100)}%)
                </p>
              </div>
            </Card>
          </div>

          {/* Not Submitted List */}
          {status.notSubmitted.length > 0 ? (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                未提出の職員 ({status.notSubmitted.length}名)
              </h4>
              <div className="space-y-2">
                {status.notSubmitted.map((employee) => (
                  <Card key={employee.id} className="p-4 bg-gradient-to-br from-warning/5 to-warning/5 border-warning/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="bg-gradient-to-br from-warning/20 to-warning/30">
                        <AvatarFallback className="text-warning">
                          {employee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="text-sm">{employee.name}</h4>
                        <p className="text-xs text-muted-foreground">{employee.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        未提出
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-muted-foreground">全員提出済みです!</h3>
            </Card>
          )}

          {/* Approval Status */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">承認待ち</p>
                <h3 className="text-blue-700">{status.pendingApproval}件</h3>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">承認済</p>
                <h3 className="text-success">{status.approved}件</h3>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-2"
          >
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
