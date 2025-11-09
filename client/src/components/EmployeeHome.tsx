import { useState, useMemo, useEffect } from "react";
import { Calendar, Clock, Bell, Sparkles, Heart, Sun, Moon, Coffee, X, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { FloatingFlowers, SparkleIcon } from "./DecorativeElements";
import { employeeNotificationService, type EmployeeNotification, type NotificationStats } from "../services/employeeNotificationService";

interface EmployeeHomeProps {
  employeeName: string;
  hasNotifications?: boolean;
  headerImageUrl?: string;
  employeeId?: number;
}

interface DayData {
  day: number;
  hasShift: boolean;
  shiftType: "早番" | "遅番" | "夜勤";
  shiftTime?: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isHoliday?: boolean;
  event?: {
    title: string;
    description: string;
    time?: string;
  };
}

// 2025年11月の祝日
const holidays2025Nov = [3, 23, 24]; // 文化の日、勤労感謝の日、振替休日

export function EmployeeHome({ employeeName, hasNotifications = false, headerImageUrl = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080", employeeId = 1 }: EmployeeHomeProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // 通知データを取得
  useEffect(() => {
    async function loadNotifications() {
      try {
        setIsLoadingNotifications(true);
        const [notificationsData, statsData] = await Promise.all([
          employeeNotificationService.getNotifications(employeeId, 5),
          employeeNotificationService.getStats(employeeId),
        ]);
        setNotifications(notificationsData);
        setStats(statsData);
      } catch (error) {
        console.error("通知の取得に失敗しました:", error);
      } finally {
        setIsLoadingNotifications(false);
      }
    }

    loadNotifications();
  }, [employeeId]);

  const today = new Date();
  const currentMonth = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  const currentDay = today.getDate();
  
  // Mock data
  const nextShift = {
    date: "11月10日",
    type: "早番",
    time: "8:00 - 17:00"
  };

  // Mock events (管理側で設定可能)
  const facilityEvents = new Map<number, { title: string; description: string; time?: string }>([
    [12, { title: "全体会議", description: "月次全体会議を開催します", time: "10:00 - 11:30" }],
    [20, { title: "避難訓練", description: "消防訓練を実施します", time: "14:00 - 15:00" }],
    [25, { title: "クリスマスイベント", description: "入居者様とのクリスマス会", time: "15:00 - 17:00" }],
  ]);

  // 当月のシフト表示（曜日情報付き）
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const shiftTimes = {
    "早番": "8:00 - 17:00",
    "遅番": "10:00 - 19:00",
    "夜勤": "17:00 - 翌9:00"
  };

  // useMemoでシフトデータを固定し、再レンダリング時に変化しないようにする
  const monthDays: DayData[] = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayOfWeek = (firstDayOfWeek + i) % 7;
      const shiftType = (["早番", "遅番", "夜勤"] as const)[Math.floor(Math.random() * 3)];
      const hasShift = Math.random() > 0.3;
      const isHoliday = holidays2025Nov.includes(day);
      
      return {
        day,
        hasShift,
        shiftType,
        shiftTime: hasShift ? shiftTimes[shiftType] : undefined,
        dayOfWeek,
        isHoliday,
        event: facilityEvents.get(day),
      };
    });
  }, [daysInMonth, firstDayOfWeek]);

  const getShiftEmoji = (type: string) => {
    switch (type) {
      case "早番": return "🌅";
      case "遅番": return "☀️";
      case "夜勤": return "🌙";
      default: return null;
    }
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
    setShowDayDialog(true);
  };

  const getDayNumberColor = (dayData: DayData) => {
    if (dayData.isHoliday || dayData.dayOfWeek === 0) {
      return "text-destructive"; // Sunday and holidays - red
    }
    if (dayData.dayOfWeek === 6) {
      return "text-blue-600"; // Saturday - blue
    }
    return ""; // Weekdays - default
  };

  const getNotificationIcon = (type: EmployeeNotification['type']) => {
    switch (type) {
      case 'deadline':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'reminder':
        return <Bell className="w-5 h-5 text-blue-600" />;
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejection':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'shift_published':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationBgColor = (priority: EmployeeNotification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-br from-warning/20 to-warning/10 border-warning/40';
      case 'medium':
        return 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30';
      case 'low':
        return 'bg-gradient-to-br from-muted/30 to-muted/10 border-muted/30';
      default:
        return 'bg-card border-border';
    }
  };

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

          {/* Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                {currentMonth}
              </h2>
              <Badge variant="outline" className="bg-gradient-to-r from-secondary/20 to-accent/20">
                今月のシフト
              </Badge>
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
                
                {monthDays.map((dayData) => (
                  <button
                    key={dayData.day}
                    onClick={() => handleDayClick(dayData)}
                    className={`
                      aspect-square rounded-2xl p-1 flex flex-col items-center justify-center
                      transition-all duration-300 hover:scale-110 hover:shadow-xl relative
                      ${dayData.hasShift 
                        ? "bg-gradient-to-br from-secondary/40 via-secondary/30 to-accent/30 border-2 border-secondary/50 shadow-lg" 
                        : "bg-card hover:bg-secondary/10"}
                      ${dayData.day === currentDay ? "ring-2 ring-primary ring-offset-2 shadow-xl" : ""}
                    `}
                  >
                    <span className={`${dayData.day === currentDay ? "text-primary" : getDayNumberColor(dayData)} mb-1`}>
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
                ))}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2">
                <Bell className="w-6 h-6 text-primary" />
                お知らせ
              </h2>
              {stats && (stats.pendingRequests > 0 || stats.upcomingDeadline) && (
                <Badge variant="destructive" className="animate-pulse">
                  {stats.pendingRequests > 0 ? `未承認${stats.pendingRequests}件` : '締切接近'}
                </Badge>
              )}
            </div>

            {isLoadingNotifications ? (
              <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30">
                <p className="text-center text-muted-foreground">読み込み中...</p>
              </Card>
            ) : notifications.length === 0 ? (
              <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30">
                <div className="text-center py-4">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">新しいお知らせはありません</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-4 border-2 shadow-md ${getNotificationBgColor(notification.priority)}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm leading-tight">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {notification.priority === 'high' && (
                        <div className="flex-shrink-0">
                          <Badge variant="destructive" className="text-xs">重要</Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

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
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
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
              {selectedDay.isHoliday && (
                <Card className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/30">
                  <div className="flex items-center gap-2">
                    <div className="text-xl">🎌</div>
                    <span className="text-destructive">祝日</span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
