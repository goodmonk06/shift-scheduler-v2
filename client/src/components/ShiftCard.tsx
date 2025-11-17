import { Clock, MessageSquare, CheckCircle2, Edit3 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { getShiftColor, getShiftIcon } from "../utils/shiftUtils";
import type { ShiftCardProps } from "../types/shiftViewTypes";

const getReportStatusBadge = (status?: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-success text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          承認済
        </Badge>
      );
    case "reported":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          確認中
        </Badge>
      );
    case "not_reported":
      return (
        <Badge variant="outline" className="border-warning text-warning">
          未報告
        </Badge>
      );
    default:
      return null;
  }
};

export function ShiftCard({
  shift,
  showActions = false,
  showReport = false,
  canRequestAdditional = false,
  canReportActual = false,
  onRequestAdditional,
  onReportActual,
}: ShiftCardProps) {
  return (
    <Card className={`p-4 ${getShiftColor(shift.shiftType)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{getShiftIcon(shift.shiftType)}</div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4>{shift.date}</h4>
              <Badge variant="outline" className="bg-card/50">
                {shift.shiftType}
              </Badge>
              {showReport && getReportStatusBadge(shift.reportStatus)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>予定: {shift.time}</span>
            </div>
            {shift.actualTime && shift.actualTime !== shift.time && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-success">実績: {shift.actualTime}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {showActions && canRequestAdditional && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => onRequestAdditional?.(shift)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          {showReport &&
            shift.shiftType !== "休み" &&
            shift.reportStatus !== "approved" &&
            canReportActual && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => onReportActual?.(shift)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
        </div>
      </div>
    </Card>
  );
}
