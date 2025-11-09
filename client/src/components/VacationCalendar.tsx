import { Calendar, Edit } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import type { VacationCalendarProps } from "../types/vacationTypes";

export function VacationCalendar({
  monthDays,
  requests,
  submittedRequests,
  isBeforeDeadline,
  onDateClick,
  getRequestBadge,
}: VacationCalendarProps) {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthName = nextMonth.toLocaleDateString("ja-JP", { month: "long" });

  return (
    <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {nextMonthName}
          </h3>
          {isBeforeDeadline && (
            <Badge className="bg-gradient-to-r from-secondary/80 to-accent/80">
              タップして選択 ✨
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <div
              key={day}
              className={`text-center py-2 ${index === 0 ? 'text-destructive' : index === 6 ? 'text-accent' : 'text-muted-foreground'}`}
            >
              {day}
            </div>
          ))}
          {monthDays.map((day) => {
            const hasEditingRequest = requests.has(day);
            const hasSubmittedRequest = submittedRequests.has(day);
            const hasRequest = hasEditingRequest || hasSubmittedRequest;

            return (
              <button
                key={day}
                onClick={() => onDateClick(day)}
                disabled={!isBeforeDeadline}
                className={`
                  aspect-square rounded-2xl p-2 flex items-center justify-center transition-all relative
                  ${isBeforeDeadline ? 'hover:scale-110 hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                  ${hasRequest
                    ? hasEditingRequest
                      ? "bg-gradient-to-br from-accent via-accent/80 to-secondary/60 text-white shadow-xl ring-2 ring-accent/50 ring-offset-2"
                      : "bg-gradient-to-br from-success/30 via-success/20 to-secondary/10 text-primary shadow-md border-2 border-success/40"
                    : "bg-gradient-to-br from-card to-secondary/5 hover:from-secondary/20 hover:to-accent/10"}
                `}
              >
                <span className={hasRequest ? "" : ""}>{day}</span>
                {getRequestBadge(day)}
                {hasSubmittedRequest && !hasEditingRequest && (
                  <Edit className="absolute top-1 right-1 w-3 h-3 text-success opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
