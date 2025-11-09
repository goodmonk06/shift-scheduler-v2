import { Calendar, Clock, Check, X, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getTypeConfig, formatDate } from "../utils/vacationManagementHelpers";

interface VacationRequest {
  id: string;
  staffName: string;
  staffId: string;
  month: string;
  requests: Array<{
    day: number;
    type: "休" | "有休" | "時間指定";
    startTime?: string;
    endTime?: string;
    reason?: string;
  }>;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
}

interface VacationRequestCardProps {
  request: VacationRequest;
  onClick: (id: string) => void;
}

export function VacationRequestCard({ request, onClick }: VacationRequestCardProps) {
  const statusConfig = {
    pending: { label: "未承認", color: "bg-warning", icon: Clock },
    approved: { label: "承認済", color: "bg-success", icon: Check },
    rejected: { label: "却下", color: "bg-destructive", icon: X },
  };

  const config = statusConfig[request.status];
  const StatusIcon = config.icon;

  return (
    <Card
      className="p-5 hover:shadow-lg transition-all cursor-pointer border-2"
      onClick={() => onClick(request.id)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="bg-gradient-to-br from-primary/20 to-secondary/20">
              <AvatarFallback className="text-primary">
                {request.staffName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4>{request.staffName}</h4>
              <p className="text-muted-foreground">{request.month}</p>
            </div>
          </div>
          <Badge className={`${config.color} flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>

        {/* Request Summary */}
        <div className="flex flex-wrap gap-2">
          {request.requests.slice(0, 3).map((req, index) => {
            const typeConfig = getTypeConfig(req.type);
            const monthPart = request.month.split("年")[1]?.replace("月", "/") || "";
            return (
              <Badge
                key={index}
                variant="outline"
                className={`${typeConfig.color} border-2`}
              >
                <span className="mr-1">{typeConfig.emoji}</span>
                {monthPart}
                {req.day}
                {req.type === "時間指定" && ` ${req.startTime}~`}
              </Badge>
            );
          })}
          {request.requests.length > 3 && (
            <Badge variant="outline" className="border-2">
              他 {request.requests.length - 3}件
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(request.submittedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-accent" />
            {request.requests.length}件の申請
          </span>
        </div>
      </div>
    </Card>
  );
}
