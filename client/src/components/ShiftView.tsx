import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "../hooks/useToast";
import { useAsync } from "../hooks/useAsync";
import { shiftDetailService, type EmployeeShiftData } from "../services/shiftDetailService";
import { CalendarSkeleton } from "./ui/loading-skeleton";
import { ErrorState } from "./ui/error-state";

interface ShiftViewProps {
  employeeId?: number;
}

export function ShiftView({ employeeId = 1 }: ShiftViewProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("current");

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // 今月のシフトデータを取得
  const {
    data: shiftData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAsync(
    async () => {
      return await shiftDetailService.getEmployeeMonthlyShift(employeeId, currentYear, currentMonth);
    },
    {
      onError: () => toast.error("シフトデータの取得に失敗しました"),
    }
  );

  const shifts = shiftData || [];

  // 今日以降のシフト（確定シフト）
  const upcomingShifts = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= todayDate && shift.status === 'working';
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [shifts]);

  // 過去のシフト（実績報告用）
  const pastShifts = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate < todayDate && shift.status === 'working';
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl">シフト確認</h2>
              <p className="text-sm text-muted-foreground">今月のシフト表</p>
            </div>
          </div>
          <CalendarSkeleton />
        </div>
      </div>
    );
  }

  // エラー状態
  if (isError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-20">
          <ErrorState
            type="network"
            error={error}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[date.getDay()];
  };

  const getDayOfWeekColor = (dateStr: string) => {
    const dayOfWeek = getDayOfWeek(dateStr);
    if (dayOfWeek === "日") return "text-red-600";
    if (dayOfWeek === "土") return "text-blue-600";
    return "text-gray-700";
  };

  const renderShiftCard = (shift: EmployeeShiftData, showActualReport = false) => {
    const dayOfWeekColor = getDayOfWeekColor(shift.date);

    return (
      <Card key={shift.date} className="p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${dayOfWeekColor}`}>
                {formatDate(shift.date)}
              </span>
            </div>
            <Badge variant="default" className="rounded-lg">
              {shift.timeSlot?.displayLabel || shift.timeSlot?.name || "勤務"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>⏰</span>
            <span>
              {shift.timeSlot?.startTime || "09:00"} 〜 {shift.timeSlot?.endTime || "17:00"}
            </span>
          </div>

          {shift.note && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
              📝 {shift.note}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl">シフト確認</h2>
            <p className="text-sm text-muted-foreground">
              {currentYear}年{currentMonth}月のシフト表
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex gap-3">
            <div className="text-2xl">📅</div>
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold">シフトについて</h4>
              <p className="text-xs text-muted-foreground">
                管理者が作成した確定シフトです。表示されている日時に勤務してください。
              </p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="current" className="rounded-xl">
              今月のシフト ({upcomingShifts.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-xl">
              過去のシフト ({pastShifts.length})
            </TabsTrigger>
          </TabsList>

          {/* 今月のシフト */}
          <TabsContent value="current" className="space-y-4 mt-6">
            {upcomingShifts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-muted-foreground">
                  今月の勤務予定はありません
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => renderShiftCard(shift))}
              </div>
            )}
          </TabsContent>

          {/* 過去のシフト */}
          <TabsContent value="past" className="space-y-4 mt-6">
            {pastShifts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-muted-foreground">
                  過去の勤務実績はありません
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastShifts.map((shift) => renderShiftCard(shift, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
