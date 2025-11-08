import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function EmployeeShifts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // 職員情報を取得
  const { data: employee } = trpc.employees.getByUserId.useQuery(
    { userId: user?.id! },
    { enabled: !!user?.id }
  );

  // 選択した月のシフトを取得
  const { data: shift, isLoading: shiftLoading } = trpc.shifts.getCurrentMonth.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  // 自分のシフト詳細を取得
  const { data: myShiftDetails, isLoading: detailsLoading } = trpc.shiftDetails.getByEmployee.useQuery(
    {
      employeeId: employee?.id!,
      shiftId: shift?.id!,
    },
    { enabled: !!employee?.id && !!shift?.id }
  );

  // 勤務時間枠を取得
  const { data: workTimeSlots } = trpc.workTimeSlots.list.useQuery();

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // カレンダーを生成
  const generateCalendar = () => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const calendar: (number | null)[] = [];
    
    // 月初の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // 日付
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }

    return calendar;
  };

  const calendar = generateCalendar();
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  const getShiftForDate = (day: number) => {
    if (!myShiftDetails) return null;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return myShiftDetails.find(sd => sd.date === dateStr && sd.status === "working");
  };

  const getTimeSlotName = (timeSlotId: number | null) => {
    if (timeSlotId === null) return "休み";
    const slot = workTimeSlots?.find(ts => ts.id === timeSlotId);
    return slot ? `${slot.name} (${slot.startTime}-${slot.endTime})` : `時間枠${timeSlotId}`;
  };

  if (shiftLoading || detailsLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/employee")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h1 className="text-xl font-bold">シフト確認</h1>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container py-4 space-y-4">
        {/* 期間選択 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">年</label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">月</label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* カレンダー */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedYear}年{selectedMonth}月のシフト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* 曜日ヘッダー */}
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center font-semibold text-sm py-2 ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
                  }`}
                >
                  {day}
                </div>
              ))}
              
              {/* カレンダー日付 */}
              {calendar.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const shift = day ? getShiftForDate(day) : null;
                const isToday = 
                  day === currentDate.getDate() &&
                  selectedMonth === currentDate.getMonth() + 1 &&
                  selectedYear === currentDate.getFullYear();
                const dayOfWeek = index % 7;

                return (
                  <div
                    key={day}
                    className={`
                      aspect-square border rounded-lg p-1 flex flex-col items-center justify-center
                      ${isToday ? "border-primary border-2 bg-primary/5" : "border-border"}
                      ${shift ? "bg-blue-50 dark:bg-blue-950" : ""}
                      ${dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""}
                    `}
                  >
                    <div className="text-sm font-semibold">{day}</div>
                    {shift && (
                      <div className="text-xs text-center mt-1 leading-tight">
                        {workTimeSlots?.find(ts => ts.id === shift.timeSlotId)?.name || "勤務"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 凡例 */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="text-sm font-semibold">凡例</div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary bg-primary/5 rounded" />
                  <span>今日</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 dark:bg-blue-950 border rounded" />
                  <span>勤務日</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* シフト詳細リスト */}
        {myShiftDetails && myShiftDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>勤務詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myShiftDetails
                  .filter(sd => sd.status === "working")
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((sd) => (
                    <div
                      key={sd.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-semibold">{sd.date}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTimeSlotName(sd.timeSlotId)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(!myShiftDetails || myShiftDetails.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              この月のシフトはまだ作成されていません
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
