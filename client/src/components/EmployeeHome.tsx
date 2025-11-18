import { useState, useMemo, useEffect } from "react";
import { Calendar, Clock, Bell, Sparkles, Heart, ChevronLeft, ChevronRight, Edit, MessageSquare, FileText, Eye } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { FloatingFlowers, SparkleIcon } from "./DecorativeElements";
import { employeeNotificationService, type EmployeeNotification, type NotificationStats } from "../services/employeeNotificationService";
import { shiftDetailService, type EmployeeShiftData } from "../services/shiftDetailService";
import { NotificationListCard } from "./employee/NotificationListCard";
import { DayDetailsDialog } from "./employee/DayDetailsDialog";
import { WorkflowStatusBadge } from "./employee/WorkflowStatusBadge";
import { ModificationRequestForm } from "./employee/ModificationRequestForm";
import { TentativeShiftViewer } from "./employee/TentativeShiftViewer";
import { holidays2025Nov, shiftTimes, DEFAULT_HEADER_IMAGE_URL, getHolidaysForMonth } from "../constants/employeeHomeConstants";
import { facilityEventService } from "../services/facilityEventService";
import { getDayNumberColor } from "../utils/employeeHomeUtils";
import type { DayData, EmployeeHomeProps } from "../types/employeeHomeTypes";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { CalendarSkeleton } from "./ui/loading-skeleton";
import { ErrorState } from "./ui/error-state";

export function EmployeeHome({ employeeName, hasNotifications = false, headerImageUrl = DEFAULT_HEADER_IMAGE_URL, employeeId = 1 }: EmployeeHomeProps) {
  const toast = useToast();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showModificationForm, setShowModificationForm] = useState(false);
  const [showTentativeViewer, setShowTentativeViewer] = useState(false);
  const [modificationFormData, setModificationFormData] = useState<{
    date?: string;
    currentAssignment?: string;
  }>({});

  const today = new Date();
  const currentDay = today.getDate();

  // 表示する月を管理する状態
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const viewMonthString = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  // 通知データを取得
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    isError: hasNotificationError,
    error: notificationError,
    refetch: refetchNotifications,
  } = useAsync(
    async () => {
      const [notifications, stats] = await Promise.all([
        employeeNotificationService.getNotifications(employeeId, 5),
        employeeNotificationService.getStats(employeeId),
      ]);
      return { notifications, stats };
    },
    {
      onError: () => toast.error("通知データの取得に失敗しました"),
    }
  );

  // シフトデータを取得（表示中の月のデータを取得）
  const {
    data: shiftData,
    isLoading: isLoadingShift,
    isError: hasShiftError,
    error: shiftError,
    refetch: refetchShift,
  } = useAsync(
    async () => {
      const data = await shiftDetailService.getEmployeeMonthlyShift(employeeId, viewYear, viewMonth);
      // シフトのステータスも取得（仮確定、確定など）
      // TODO: APIから取得したステータス情報を含める
      return data;
    },
    {
      onError: () => toast.error("シフトデータの取得に失敗しました"),
    },
    [viewYear, viewMonth] // 月が変わったら再取得
  );

  // 施設イベントデータを取得（表示中の月のデータを取得）
  const {
    data: facilityEventsData,
    isLoading: isLoadingEvents,
    isError: hasEventsError,
    error: eventsError,
    refetch: refetchEvents,
  } = useAsync(
    async () => {
      return await facilityEventService.getEventsByMonth(viewYear, viewMonth);
    },
    {
      onError: () => console.warn("施設イベントの取得に失敗しました"), // エラーでも継続
    },
    [viewYear, viewMonth] // 月が変わったら再取得
  );

  // 施設イベントを5分ごとに自動更新
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchEvents();
    }, 5 * 60 * 1000); // 5分

    return () => clearInterval(intervalId);
  }, [refetchEvents]);

  // ページがアクティブになったときに施設イベントを再取得
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchEvents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetchEvents]);

  const notifications = notificationsData?.notifications || [];
  const stats = notificationsData?.stats || null;
  const employeeShiftData = shiftData || [];
  const facilityEvents = facilityEventsData || [];

  // 表示中の月のカレンダー情報を計算
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

  // シフトデータをMapに変換（日付でアクセス）
  const shiftDataMap = useMemo(() => {
    const map = new Map<string, EmployeeShiftData>();
    employeeShiftData.forEach(shift => {
      map.set(shift.date, shift);
    });
    return map;
  }, [employeeShiftData]);

  // 月の日付データを生成
  const monthDays: DayData[] = useMemo(() => {
    const monthHolidays = getHolidaysForMonth(viewYear, viewMonth);
    const holidayMap = new Map(monthHolidays.map(h => [h.day, h.name]));

    // 施設イベントをMapに変換（日付でアクセス可能に）
    const eventsMap = new Map(
      facilityEvents.map(event => [
        event.day,
        {
          title: event.title,
          description: event.description || '',
          time: event.time || undefined,
        }
      ])
    );

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = (firstDayOfWeek + i) % 7;
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const shiftInfo = shiftDataMap.get(dateStr);

      const hasShift = shiftInfo?.status === 'working';
      const shiftType = shiftInfo?.timeSlot?.name || '早番';
      const shiftTime = shiftInfo?.timeSlot
        ? `${shiftInfo.timeSlot.startTime}〜${shiftInfo.timeSlot.endTime}`
        : undefined;
      const holidayName = holidayMap.get(day);
      const isHoliday = !!holidayName;

      return {
        day,
        hasShift,
        shiftType: shiftType as '早番' | '遅番' | '夜勤',
        shiftTime,
        dayOfWeek,
        isHoliday,
        holidayName,
        event: eventsMap.get(day),
      };
    });
  }, [daysInMonth, firstDayOfWeek, viewYear, viewMonth, shiftDataMap, facilityEvents]);

  // 次の出勤予定を計算（今日以降の最初のシフト）
  const nextShift = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureShifts = monthDays.filter(dayData => {
      if (!dayData.hasShift) return false;
      const shiftDate = new Date(viewYear, viewMonth - 1, dayData.day);
      return shiftDate >= today;
    });

    if (futureShifts.length === 0) {
      return {
        date: "予定なし",
        type: "",
        time: "",
      };
    }

    const nextShiftDay = futureShifts[0];
    return {
      date: `${viewMonth}月${nextShiftDay.day}日`,
      type: nextShiftDay.shiftType,
      time: nextShiftDay.shiftTime || "",
    };
  }, [monthDays, viewYear, viewMonth]);

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
    setShowDayDialog(true);
  };

  // 月の移動処理
  const handlePreviousMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // 現在の月を表示しているかチェック
  const isViewingCurrentMonth = viewYear === today.getFullYear() && viewMonth === (today.getMonth() + 1);

  // エラー状態の表示
  if (hasNotificationError || hasShiftError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-20">
          <ErrorState
            type="network"
            error={notificationError || shiftError}
            onRetry={() => {
              refetchNotifications();
              refetchShift();
            }}
            showDetails={true}
          />
        </div>
      </div>
    );
  }

  // ローディング状態（イベントはオプショナルなのでロード待ちしない）
  if (isLoadingNotifications || isLoadingShift) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-20">
          <CalendarSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent" />
      <FloatingFlowers />
      
      <div className="relative p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header with Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10 rounded-3xl blur-xl" />
            <Card className="relative overflow-hidden border-2 border-secondary/30 shadow-xl">
              <div className="h-32 relative overflow-hidden">
                <ImageWithFallback
                  src={headerImageUrl}
                  alt="Header"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              <div className="p-6 -mt-8 relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white shadow-lg">
                    <Heart className="w-8 h-8 fill-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground flex items-center gap-1">
                      こんにちは <Sparkles className="w-4 h-4 text-accent" />
                    </p>
                    <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {employeeName}さん
                    </h1>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Next Shift Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-accent/30 rounded-3xl blur-2xl" />
            <Card className="relative p-6 bg-gradient-to-br from-white via-secondary/5 to-accent/10 border-2 border-secondary/40 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl shadow-lg">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <SparkleIcon className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    次の出勤予定
                  </p>
                  <h3 className="flex items-center gap-2">
                    {nextShift.date}
                    <span className="text-2xl">📅</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-md">
                      {nextShift.type}
                    </Badge>
                    <span className="text-muted-foreground">{nextShift.time}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ワークフローステータスバッジ（shiftDataが取得できている場合） */}
          {shiftData && shiftData[0]?.shiftId && (
            <WorkflowStatusBadge
              shiftId={shiftData[0].shiftId}
              employeeId={employeeId}
              onModificationRequest={() => {
                setModificationFormData({});
                setShowModificationForm(true);
              }}
            />
          )}

          {/* 仮確定シフトへのアクションボタン */}
          {shiftData?.some(d => d.status === "tentative") && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <button
                  onClick={() => setShowTentativeViewer(true)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900">仮確定シフト詳細</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    月間の詳細なシフト表を確認
                  </p>
                </button>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
                <button
                  onClick={() => {
                    setModificationFormData({});
                    setShowModificationForm(true);
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-900">修正希望を提出</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    変更希望を送信できます
                  </p>
                </button>
              </Card>
            </div>
          )}

          {/* Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 rounded-xl hover:bg-secondary/20 transition-all hover:scale-110"
                  aria-label="前の月"
                >
                  <ChevronLeft className="w-5 h-5 text-primary" />
                </button>
                <h2 className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  {viewMonthString}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-secondary/20 transition-all hover:scale-110"
                  aria-label="次の月"
                >
                  <ChevronRight className="w-5 h-5 text-primary" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* TODO: シフト全体のステータスをAPIから取得して表示 */}
                {shiftData?.some(d => d.status === "tentative") && (
                  <Badge className="bg-purple-600 text-white">
                    仮確定
                  </Badge>
                )}
                {shiftData?.some(d => d.status === "working" || d.status === "off") && (
                  <Badge className="bg-green-600 text-white">
                    確定
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`${
                    isViewingCurrentMonth
                      ? "bg-gradient-to-r from-primary/20 to-accent/20 border-primary/40"
                      : "bg-gradient-to-r from-secondary/20 to-accent/20"
                  }`}
                >
                  {isViewingCurrentMonth ? "今月のシフト" : "シフト表"}
                </Badge>
              </div>
            </div>
            
            <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: "日", color: "text-destructive" },
                  { label: "月", color: "text-muted-foreground" },
                  { label: "火", color: "text-muted-foreground" },
                  { label: "水", color: "text-muted-foreground" },
                  { label: "木", color: "text-muted-foreground" },
                  { label: "金", color: "text-muted-foreground" },
                  { label: "土", color: "text-blue-600" }
                ].map((day) => (
                  <div 
                    key={day.label} 
                    className={`text-center py-2 ${day.color}`}
                  >
                    {day.label}
                  </div>
                ))}
                
                {/* Empty cells for days before the month starts */}
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {monthDays.map((dayData) => {
                  const isToday = isViewingCurrentMonth && dayData.day === currentDay;
                  return (
                    <button
                      key={dayData.day}
                      onClick={() => handleDayClick(dayData)}
                      className={`
                        aspect-square rounded-2xl p-1 flex flex-col items-center justify-center
                        transition-all duration-300 hover:scale-110 hover:shadow-xl relative
                        ${dayData.hasShift
                          ? "bg-gradient-to-br from-secondary/40 via-secondary/30 to-accent/30 border-2 border-secondary/50 shadow-lg"
                          : "bg-card hover:bg-secondary/10"}
                        ${isToday ? "ring-2 ring-primary ring-offset-2 shadow-xl" : ""}
                      `}
                    >
                      <span className={`${isToday ? "text-primary" : getDayNumberColor(dayData)} mb-1`}>
                        {dayData.day}
                      </span>
                      {dayData.hasShift && (
                        <div className="flex items-center justify-center">
                          <Badge className="px-1.5 py-0 bg-gradient-to-r from-primary/80 to-primary/60" style={{ fontSize: '0.5625rem' }}>
                            {dayData.shiftType === "早番" ? "早" : dayData.shiftType === "遅番" ? "遅" : "夜"}
                          </Badge>
                        </div>
                      )}
                      {dayData.event && (
                        <div className="absolute -top-1 -right-1">
                          <Badge className="w-4 h-4 p-0 flex items-center justify-center bg-gradient-to-r from-warning to-warning/70 text-xs">
                            🎉
                          </Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-white to-secondary/10 border-2 border-secondary/40">
              <div className="space-y-3">
                <div className="relative">
                  <div className="bg-gradient-to-br from-secondary/30 to-accent/20 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <SparkleIcon className="absolute -top-1 -right-1 w-4 h-4 text-accent" />
                </div>
                <div>
                  <h4>希望休を入力</h4>
                  <p className="text-muted-foreground">📝</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-white to-accent/10 border-2 border-accent/40">
              <div className="space-y-3">
                <div className="relative">
                  <div className="bg-gradient-to-br from-accent/30 to-accent/20 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  {hasNotifications && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h4>お知らせ</h4>
                  <p className="text-muted-foreground">💌</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 通知フィード */}
          <NotificationListCard
            notifications={notifications}
            stats={stats}
            isLoading={isLoadingNotifications}
          />

          {/* Deadline Notice - Enhanced with real data */}
          {stats?.upcomingDeadline && stats.upcomingDeadline.daysRemaining <= 7 && (
            <Card className="p-5 bg-gradient-to-br from-warning/20 via-warning/10 to-accent/10 border-2 border-warning/40 shadow-lg">
              <div className="flex gap-4">
                <div className="text-4xl animate-bounce">⏰</div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4>締切のお知らせ</h4>
                    <Sparkles className="w-4 h-4 text-warning" />
                    {stats.upcomingDeadline.daysRemaining <= 3 && (
                      <Badge variant="destructive" className="animate-pulse">
                        あと{stats.upcomingDeadline.daysRemaining}日
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {stats.upcomingDeadline.year}年{stats.upcomingDeadline.month}月分の希望休は
                    {new Date(stats.upcomingDeadline.deadline).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                    })}
                    まで
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Day Details Dialog */}
      <DayDetailsDialog
        open={showDayDialog}
        onOpenChange={setShowDayDialog}
        selectedDay={selectedDay}
      />

      {/* Modification Request Form */}
      {shiftData && shiftData[0]?.shiftId && (
        <ModificationRequestForm
          open={showModificationForm}
          onOpenChange={setShowModificationForm}
          shiftId={shiftData[0].shiftId}
          employeeId={employeeId}
          employeeName={employeeName}
          date={modificationFormData.date}
          currentAssignment={modificationFormData.currentAssignment}
          onSuccess={() => {
            refetchShift();
            toast.success('修正希望を提出しました');
          }}
        />
      )}

      {/* Tentative Shift Viewer Dialog */}
      {showTentativeViewer && shiftData && shiftData[0]?.shiftId && (
        <Dialog open={showTentativeViewer} onOpenChange={setShowTentativeViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                仮確定シフト詳細
              </DialogTitle>
            </DialogHeader>
            <TentativeShiftViewer
              shiftId={shiftData[0].shiftId}
              employeeId={employeeId}
              employeeName={employeeName}
              onModificationRequest={(date, currentAssignment) => {
                setModificationFormData({ date, currentAssignment });
                setShowModificationForm(true);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
