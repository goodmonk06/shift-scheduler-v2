import { Calendar, Edit } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import type { VacationCalendarProps } from "../types/vacationTypes";
import { getHolidaysForMonth } from "../constants/employeeHomeConstants";

export function VacationCalendar({
  year,
  month,
  monthDays,
  requests,
  submittedRequests,
  isBeforeDeadline,
  onDateClick,
  getRequestBadge,
}: VacationCalendarProps) {
  const nextMonthYear = year;
  const nextMonthNum = month;
  const nextMonth = new Date(year, month - 1, 1);
  const nextMonthName = nextMonth.toLocaleDateString("ja-JP", { month: "long" });

  // 祝日データを取得
  const holidays = getHolidaysForMonth(nextMonthYear, nextMonthNum);
  const holidaySet = new Set(holidays.map(h => h.day));

  // 各日付の曜日を正しく計算するヘルパー関数
  const getDayOfWeek = (day: number) => {
    const date = new Date(nextMonthYear, nextMonthNum - 1, day);
    return date.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
  };

  // 月の1日の曜日を取得（0=日曜, 1=月曜, ...）
  const firstDayOfWeek = getDayOfWeek(1);

  // 空白セルの配列を作成（1日の前に表示する空白）
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

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
              className={`text-center py-2 ${index === 0 ? 'text-destructive' : index === 6 ? 'text-blue-600' : 'text-muted-foreground'}`}
            >
              {day}
            </div>
          ))}
          {/* 月の1日の前の空白セル */}
          {emptyDays.map((i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {/* 実際の日付 */}
          {monthDays.map((day) => {
            const hasEditingRequest = requests.has(day);
            const hasSubmittedRequest = submittedRequests.has(day);
            const hasRequest = hasEditingRequest || hasSubmittedRequest;

            // 曜日を正しく計算（0=日曜, 6=土曜）
            const dayOfWeek = getDayOfWeek(day);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isHoliday = holidaySet.has(day);

            // 数字の色を決定
            let textColor = "";
            if (hasRequest) {
              textColor = hasEditingRequest ? "text-white" : "text-primary";
            } else if (isHoliday || isSunday) {
              textColor = "text-destructive";
            } else if (isSaturday) {
              textColor = "text-blue-600";
            } else {
              textColor = "text-foreground";
            }

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
                      ? "bg-gradient-to-br from-accent via-accent/80 to-secondary/60 shadow-xl ring-2 ring-accent/50 ring-offset-2"
                      : "bg-gradient-to-br from-success/30 via-success/20 to-secondary/10 shadow-md border-2 border-success/40"
                    : "bg-gradient-to-br from-card to-secondary/5 hover:from-secondary/20 hover:to-accent/10"}
                `}
              >
                <span className={textColor}>{day}</span>
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
