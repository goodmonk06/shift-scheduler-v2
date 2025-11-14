import { useState, useEffect, useMemo } from "react";
import { Sparkles, Heart, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SparkleIcon } from "./DecorativeElements";
import { VacationCalendar } from "./VacationCalendar";
import { VacationDayDialog } from "./VacationDayDialog";
import { VacationTimePicker } from "./VacationTimePicker";
import { useToast } from "../hooks/useToast";
import { useAsync } from "../hooks/useAsync";
import { leaveRequestService, type LeaveRequest } from "../services/leaveRequestService";
import { trpcClient } from "../lib/trpc";
import { CalendarSkeleton } from "./ui/loading-skeleton";
import { ErrorState } from "./ui/error-state";
import { getHolidaysForMonth } from "../constants/employeeHomeConstants";

interface VacationRequestProps {
  employeeId?: number;
  onUnsavedChangesChange: (hasChanges: boolean, count: number) => void;
  headerImageUrl?: string;
}

interface DayRequest {
  day: number;
  type: "休" | "有休" | "時間指定";
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export function VacationRequest({
  employeeId = 1,
  onUnsavedChangesChange,
  headerImageUrl = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080"
}: VacationRequestProps) {
  const toast = useToast();

  // タブで選択中の月（month1=来月、month2=再来月）
  const [selectedMonth, setSelectedMonth] = useState<"month1" | "month2">("month1");

  // 編集中の希望休（未提出）- キー: `${year}-${month}-${day}`
  const [requests, setRequests] = useState<Map<string, DayRequest>>(new Map());
  // データベースから取得した既存の希望休
  const [existingRequests, setExistingRequests] = useState<LeaveRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null); // 選択中の日付キー
  const [requestType, setRequestType] = useState<"休" | "有休" | "時間指定">("休");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("12");
  const [endMinute, setEndMinute] = useState("00");
  const [reason, setReason] = useState("");

  // 月の計算（来月と再来月）
  const today = new Date();
  const month1 = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const month2 = new Date(today.getFullYear(), today.getMonth() + 2, 1);

  // 各月の日数を計算
  const month1Year = month1.getFullYear();
  const month1Num = month1.getMonth() + 1;
  const daysInMonth1 = new Date(month1Year, month1Num, 0).getDate();
  const month1Days = Array.from({ length: daysInMonth1 }, (_, i) => i + 1);

  const month2Year = month2.getFullYear();
  const month2Num = month2.getMonth() + 1;
  const daysInMonth2 = new Date(month2Year, month2Num, 0).getDate();
  const month2Days = Array.from({ length: daysInMonth2 }, (_, i) => i + 1);

  // 選択中の月の情報
  const currentMonthData = selectedMonth === "month1" ? month1 : month2;
  const nextMonthYear = currentMonthData.getFullYear();
  const nextMonthNum = currentMonthData.getMonth() + 1;
  const nextMonthName = currentMonthData.toLocaleDateString("ja-JP", { month: "long" });

  // 来月の祝日を取得
  const holidays = useMemo(() => {
    return getHolidaysForMonth(nextMonthYear, nextMonthNum);
  }, [nextMonthYear, nextMonthNum]);

  // 祝日マップ（日付 → 祝日名）
  const holidayMap = useMemo(() => {
    return new Map(holidays.map(h => [h.day, h.name]));
  }, [holidays]);

  // 現在のシフト情報と締切を取得
  const {
    data: currentShift,
    isLoading: isLoadingShift,
    isError: isShiftError,
    error: shiftError,
    refetch: refetchShift,
  } = useAsync(
    async () => {
      return await trpcClient.shifts.getCurrentMonth.query({
        year: nextMonthYear,
        month: nextMonthNum
      });
    },
    {
      onError: (error) => {
        console.error("シフト情報の取得に失敗:", error);
        // シフトが存在しない場合はエラーにしない
      },
    }
  );

  // 既存の希望休を取得
  const {
    data: leaveRequestsData,
    isLoading: isLoadingRequests,
    isError: isRequestsError,
    error: requestsError,
    refetch: refetchRequests,
  } = useAsync(
    async () => {
      return await leaveRequestService.getByEmployee(employeeId);
    },
    {
      onError: () => toast.error("希望休データの取得に失敗しました"),
    }
  );

  // データ取得後、existingRequestsに保存（来月と再来月の2ヶ月分）
  useEffect(() => {
    if (leaveRequestsData) {
      // 来月と再来月分の希望休をフィルタリング
      const month1Year = month1.getFullYear();
      const month1Num = month1.getMonth() + 1;
      const month2Year = month2.getFullYear();
      const month2Num = month2.getMonth() + 1;

      const twoMonthsRequests = leaveRequestsData.filter(req => {
        const startDate = new Date(req.startDate);
        const reqYear = startDate.getFullYear();
        const reqMonth = startDate.getMonth() + 1;
        return (reqYear === month1Year && reqMonth === month1Num) ||
               (reqYear === month2Year && reqMonth === month2Num);
      });
      setExistingRequests(twoMonthsRequests);
    }
  }, [leaveRequestsData, month1, month2]);

  const deadline = currentShift?.leaveRequestDeadline
    ? new Date(currentShift.leaveRequestDeadline)
    : new Date(nextMonthYear, nextMonthNum - 1, 20, 23, 59); // デフォルト: 前月20日

  const isBeforeDeadline = useMemo(() => today < deadline, [today, deadline]);

  // 未保存の変更を親に通知
  useEffect(() => {
    onUnsavedChangesChange(requests.size > 0, requests.size);
  }, [requests, onUnsavedChangesChange]);

  // 日付キーを生成するヘルパー関数
  const makeDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    if (!isBeforeDeadline) {
      toast.error("締め切りを過ぎています", {
        description: "希望休の申請・変更期限が過ぎました。",
      });
      return;
    }

    setSelectedDay(day);
    const dateKey = makeDateKey(nextMonthYear, nextMonthNum, day);
    setSelectedDayKey(dateKey);

    // 編集中のリクエストまたは既存のリクエストを取得
    const editingRequest = requests.get(dateKey);
    const existingRequest = existingRequests.find(req => {
      const startDate = new Date(req.startDate);
      return startDate.getFullYear() === nextMonthYear &&
             startDate.getMonth() + 1 === nextMonthNum &&
             startDate.getDate() === day;
    });

    const request = editingRequest || (existingRequest ? {
      day,
      type: existingRequest.leaveType,
      startTime: existingRequest.startTime,
      endTime: existingRequest.endTime,
      reason: existingRequest.reason,
    } : null);

    if (request) {
      setRequestType(request.type);
      if (request.startTime) {
        const [h, m] = request.startTime.split(":");
        setStartHour(h);
        setStartMinute(m);
      } else {
        setStartHour("09");
        setStartMinute("00");
      }
      if (request.endTime) {
        const [h, m] = request.endTime.split(":");
        setEndHour(h);
        setEndMinute(m);
      } else {
        setEndHour("12");
        setEndMinute("00");
      }
      setReason(request.reason || "");
    } else {
      setRequestType("休");
      setStartHour("09");
      setStartMinute("00");
      setEndHour("12");
      setEndMinute("00");
      setReason("");
    }

    setShowDayDialog(true);
  };

  const handleSaveDay = () => {
    if (selectedDay === null || selectedDayKey === null) return;

    if (requestType === "時間指定") {
      if (!startHour || !startMinute || !endHour || !endMinute) {
        toast.error("時間を設定してください", {
          description: "開始時刻と終了時刻の両方を選択してください。",
        });
        return;
      }
    }

    const startTime = requestType === "時間指定" && startHour && startMinute
      ? `${startHour}:${startMinute}`
      : undefined;
    const endTime = requestType === "時間指定" && endHour && endMinute
      ? `${endHour}:${endMinute}`
      : undefined;

    const newRequest: DayRequest = {
      day: selectedDay,
      type: requestType,
      startTime,
      endTime,
      reason: reason || undefined,
    };

    setRequests(prev => {
      const updated = new Map(prev);
      updated.set(selectedDayKey, newRequest);
      return updated;
    });

    setShowDayDialog(false);
    setSelectedDay(null);
    setSelectedDayKey(null);
  };

  const handleRemoveDay = () => {
    if (selectedDay === null || selectedDayKey === null) return;

    // 編集中のリクエストから削除
    setRequests(prev => {
      const updated = new Map(prev);
      updated.delete(selectedDayKey);
      return updated;
    });

    // 既存のリクエストがあれば、それも削除マークをつける（実際の削除は submit 時）
    const existingRequest = existingRequests.find(req => {
      const startDate = new Date(req.startDate);
      return startDate.getFullYear() === nextMonthYear &&
             startDate.getMonth() + 1 === nextMonthNum &&
             startDate.getDate() === selectedDay;
    });

    if (existingRequest) {
      // 既存のリクエストを削除リストに追加
      setRequests(prev => {
        const updated = new Map(prev);
        // 削除マーカーとして null を設定
        updated.set(selectedDayKey, null as any);
        return updated;
      });
    }

    setShowDayDialog(false);
    setSelectedDay(null);
    setSelectedDayKey(null);
  };

  const handleSubmit = async () => {
    if (requests.size === 0) return;

    setIsSubmitting(true);

    try {
      const promises: Promise<any>[] = [];

      for (const [dateKey, request] of requests.entries()) {
        const dateStr = dateKey; // dateKeyは既に "YYYY-MM-DD" 形式

        // 既存のリクエストがあるか確認
        const existingRequest = existingRequests.find(req => {
          return req.startDate === dateStr;
        });

        // 該当する年月のシフトを取得（来月または再来月）
        const [year, month] = dateStr.split('-').map(Number);
        const targetShift = await trpcClient.shifts.getCurrentMonth.query({
          year,
          month
        }).catch(() => null);

        if (request === null) {
          // 削除マーカー: 既存のリクエストを削除
          if (existingRequest) {
            promises.push(leaveRequestService.delete(existingRequest.id));
          }
        } else if (existingRequest) {
          // 更新
          promises.push(
            leaveRequestService.update(existingRequest.id, {
              employeeId,
              shiftId: targetShift?.id || existingRequest.shiftId,
              startDate: dateStr,
              endDate: dateStr,
              leaveType: request.type,
              startTime: request.startTime,
              endTime: request.endTime,
              reason: request.reason,
            })
          );
        } else {
          // 新規作成
          promises.push(
            leaveRequestService.create({
              employeeId,
              shiftId: targetShift?.id,
              startDate: dateStr,
              endDate: dateStr,
              leaveType: request.type,
              startTime: request.startTime,
              endTime: request.endTime,
              reason: request.reason,
            })
          );
        }
      }

      await Promise.all(promises);

      toast.success("希望休申請を送信しました!", {
        description: `${requests.size}件の申請が送信されました。`,
      });

      // データを再取得
      await refetchRequests();

      // 編集中のリクエストをクリア
      setRequests(new Map());
      onUnsavedChangesChange(false, 0);
    } catch (error: any) {
      console.error("希望休申請エラー:", error);
      toast.error("申請に失敗しました", {
        description: error.message || "もう一度お試しください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 指定された年月のバッジを取得する関数を生成
  const createGetRequestBadge = (year: number, month: number) => (day: number) => {
    const dateKey = makeDateKey(year, month, day);

    // 編集中のリクエストを優先
    const editingRequest = requests.get(dateKey);
    if (editingRequest === null) {
      // 削除マーカー
      return null;
    }

    if (editingRequest) {
      // 編集中（未送信）
      const timeText = editingRequest.type === "時間指定" && editingRequest.startTime && editingRequest.endTime
        ? `${String(editingRequest.startTime)}\n〜${String(editingRequest.endTime)}`
        : "";
      const isMultiLine = timeText.includes("\n");
      const emoji = editingRequest.type === "休" ? "🌸" : editingRequest.type === "有休" ? "💐" : "⏰";
      const text = editingRequest.type === "時間指定" ? timeText : String(editingRequest.type);
      const color = "bg-warning";

      return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/4 px-1.5 py-0.5 rounded-full text-white ${color} shadow-md flex items-center gap-0.5`}>
          <span className="text-[0.5rem]">{String(emoji)}</span>
          {text && typeof text === 'string' && text.length > 0 && (
            <span
              className="leading-tight whitespace-pre-line text-center"
              style={{ fontSize: isMultiLine ? '0.5rem' : '0.55rem' }}
            >
              {String(text)}
            </span>
          )}
        </div>
      );
    }

    // 既存のリクエスト（送信済み）
    const existingRequest = existingRequests.find(req => {
      return req.startDate === dateKey;
    });

    if (existingRequest) {
      const timeText = existingRequest.leaveType === "時間指定" && existingRequest.startTime && existingRequest.endTime
        ? `${String(existingRequest.startTime)}\n〜${String(existingRequest.endTime)}`
        : "";
      const isMultiLine = timeText.includes("\n");
      const emoji = existingRequest.leaveType === "休" ? "🌸" : existingRequest.leaveType === "有休" ? "💐" : "⏰";
      const text = existingRequest.leaveType === "時間指定" ? timeText : String(existingRequest.leaveType);

      // ステータスに応じた色
      const color = existingRequest.status === "approved"
        ? "bg-success"
        : existingRequest.status === "rejected"
        ? "bg-destructive"
        : "bg-success/60";

      return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/4 px-1.5 py-0.5 rounded-full text-white ${color} shadow-md flex items-center gap-0.5`}>
          <span className="text-[0.5rem]">{String(emoji)}</span>
          {text && typeof text === 'string' && text.length > 0 && (
            <span
              className="leading-tight whitespace-pre-line text-center"
              style={{ fontSize: isMultiLine ? '0.5rem' : '0.55rem' }}
            >
              {String(text)}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  const handleTimeConfirm = (hours: { startHour: string; startMinute: string; endHour: string; endMinute: string }) => {
    setStartHour(hours.startHour);
    setStartMinute(hours.startMinute);
    setEndHour(hours.endHour);
    setEndMinute(hours.endMinute);
  };

  // ローディング中
  if (isLoadingShift || isLoadingRequests) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-xl">希望休入力</h2>
              <p className="text-sm text-muted-foreground">{nextMonthName}の希望する休日</p>
            </div>
          </div>
          <CalendarSkeleton />
        </div>
      </div>
    );
  }

  // エラー状態
  if (isRequestsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-20">
          <ErrorState
            type="network"
            error={requestsError}
            onRetry={refetchRequests}
          />
        </div>
      </div>
    );
  }

  // 申請済み希望休のカウント
  const submittedCount = existingRequests.filter(req => req.status === "pending" || req.status === "approved").length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent" />
      <div className="absolute top-20 right-10 text-4xl opacity-20 animate-float">🌼</div>
      <div className="absolute bottom-40 left-10 text-3xl opacity-20 animate-float-delayed">🌸</div>

      <div className="relative p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <h2 className="flex items-center gap-2">
                  希望休入力
                  <Sparkles className="w-5 h-5 text-accent" />
                </h2>
                <p className="text-muted-foreground">来月・再来月の希望する休日を選択してください</p>
              </div>
            </div>

            {/* 状態表示バッジ */}
            <div className="flex flex-wrap gap-2">
              {requests.size > 0 && (
                <Badge className="bg-gradient-to-r from-warning to-warning/70 animate-pulse shadow-lg">
                  ⚠️ 未送信 {requests.size}件
                </Badge>
              )}
              {submittedCount > 0 && (
                <Badge className="bg-gradient-to-r from-success/60 to-success/50 shadow-lg">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  申請済み {submittedCount}件
                </Badge>
              )}
              {!isBeforeDeadline && (
                <Badge className="bg-gradient-to-r from-destructive to-destructive/70 shadow-lg">
                  🔒 締切済み
                </Badge>
              )}
            </div>
          </div>

          {/* Image Header */}
          <Card className="overflow-hidden border-2 border-secondary/30 shadow-xl">
            <div className="h-24 relative">
              <ImageWithFallback
                src={headerImageUrl}
                alt="Header"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="text-white drop-shadow-lg">リラックスできる休日を選びましょう</span>
              </div>
            </div>
          </Card>

          {/* Deadline Notice */}
          <Card className={`p-5 bg-gradient-to-br ${isBeforeDeadline ? 'from-warning/20 via-warning/10 to-accent/10 border-warning/40' : 'from-muted/20 via-muted/10 to-muted/5 border-muted'} border-2 shadow-lg`}>
            <div className="flex gap-4">
              <div className={`text-4xl ${isBeforeDeadline ? 'animate-bounce' : ''}`}>
                {isBeforeDeadline ? '⏰' : '🔒'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4>{isBeforeDeadline ? '締切日' : '締切済み'}</h4>
                  <SparkleIcon className={`w-4 h-4 ${isBeforeDeadline ? 'text-warning' : 'text-muted-foreground'}`} />
                </div>
                <p className="text-muted-foreground">
                  {nextMonthName}分は{deadline.toLocaleString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}まで
                </p>
                {!isBeforeDeadline && (
                  <p className="text-sm text-destructive">
                    締切を過ぎたため、編集・申請はできません
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* 申請済み状態の説明 */}
          {submittedCount > 0 && isBeforeDeadline && (
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30">
              <div className="flex gap-3">
                <div className="text-2xl">✨</div>
                <div className="space-y-1">
                  <h4 className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    申請済み
                  </h4>
                  <p className="text-muted-foreground">
                    現在{submittedCount}件の希望休を申請中です。締切日までは変更できます。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💡 日付をタップして変更・削除できます
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Calendar with Month Tabs */}
          <Tabs value={selectedMonth} onValueChange={(value) => setSelectedMonth(value as "month1" | "month2")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="month1" className="flex items-center gap-2">
                {month1.toLocaleDateString("ja-JP", { month: "long" })}
              </TabsTrigger>
              <TabsTrigger value="month2" className="flex items-center gap-2">
                {month2.toLocaleDateString("ja-JP", { month: "long" })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="month1">
              <VacationCalendar
                key={`calendar-${month1Year}-${month1Num}`}
                year={month1.getFullYear()}
                month={month1.getMonth() + 1}
                monthDays={month1Days}
                requests={new Map(
                  Array.from(requests.entries())
                    .filter(([dateKey, request]) => {
                      // null値（削除マーカー）を除外
                      if (request === null) return false;
                      const [year, month] = dateKey.split('-').map(Number);
                      return year === month1.getFullYear() && month === month1.getMonth() + 1;
                    })
                    .map(([dateKey, request]) => {
                      const day = parseInt(dateKey.split('-')[2]);
                      return [day, request];
                    })
                )}
                submittedRequests={new Map(existingRequests
                  .filter(req => {
                    const startDate = new Date(req.startDate);
                    return startDate.getFullYear() === month1.getFullYear() &&
                           startDate.getMonth() === month1.getMonth();
                  })
                  .map(req => {
                    const startDate = new Date(req.startDate);
                    return [startDate.getDate(), {
                      day: startDate.getDate(),
                      type: req.leaveType,
                      startTime: req.startTime || undefined,
                      endTime: req.endTime || undefined,
                      reason: req.reason || undefined,
                    }];
                  })
                )}
                isBeforeDeadline={isBeforeDeadline}
                onDateClick={handleDateClick}
                getRequestBadge={createGetRequestBadge(month1Year, month1Num)}
              />
            </TabsContent>

            <TabsContent value="month2">
              <VacationCalendar
                key={`calendar-${month2Year}-${month2Num}`}
                year={month2.getFullYear()}
                month={month2.getMonth() + 1}
                monthDays={month2Days}
                requests={new Map(
                  Array.from(requests.entries())
                    .filter(([dateKey, request]) => {
                      // null値（削除マーカー）を除外
                      if (request === null) return false;
                      const [year, month] = dateKey.split('-').map(Number);
                      return year === month2.getFullYear() && month === month2.getMonth() + 1;
                    })
                    .map(([dateKey, request]) => {
                      const day = parseInt(dateKey.split('-')[2]);
                      return [day, request];
                    })
                )}
                submittedRequests={new Map(existingRequests
                  .filter(req => {
                    const startDate = new Date(req.startDate);
                    return startDate.getFullYear() === month2.getFullYear() &&
                           startDate.getMonth() === month2.getMonth();
                  })
                  .map(req => {
                    const startDate = new Date(req.startDate);
                    return [startDate.getDate(), {
                      day: startDate.getDate(),
                      type: req.leaveType,
                      startTime: req.startTime || undefined,
                      endTime: req.endTime || undefined,
                      reason: req.reason || undefined,
                    }];
                  })
                )}
                isBeforeDeadline={isBeforeDeadline}
                onDateClick={handleDateClick}
                getRequestBadge={createGetRequestBadge(month2Year, month2Num)}
              />
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <Card className="p-5 bg-gradient-to-br from-secondary/10 to-accent/5 border-2 border-secondary/30">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="space-y-1">
                <h4>ご注意</h4>
                <p className="text-muted-foreground">確定後の変更は管理者へご相談ください</p>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          {isBeforeDeadline && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-xl" />
              <Button
                onClick={handleSubmit}
                disabled={requests.size === 0 || isSubmitting}
                className="relative w-full py-7 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isSubmitting ? "送信中..." : submittedCount > 0 ? '変更を保存する' : '希望休を申請する'}
                {requests.size > 0 && !isSubmitting && `(${requests.size}日)`}
                <Heart className="w-5 h-5 ml-2 fill-white" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Day Configuration Dialog */}
      <VacationDayDialog
        open={showDayDialog}
        onOpenChange={setShowDayDialog}
        selectedDay={selectedDay}
        nextMonthName={nextMonthName}
        holidayName={selectedDay ? holidayMap.get(selectedDay) : undefined}
        requestType={requestType}
        setRequestType={setRequestType}
        startHour={startHour}
        startMinute={startMinute}
        endHour={endHour}
        endMinute={endMinute}
        reason={reason}
        setReason={setReason}
        onSave={handleSaveDay}
        onRemove={handleRemoveDay}
        hasRequest={
          (selectedDayKey !== null && requests.has(selectedDayKey)) ||
          existingRequests.some(req => {
            const startDate = new Date(req.startDate);
            return startDate.getFullYear() === nextMonthYear &&
                   startDate.getMonth() + 1 === nextMonthNum &&
                   startDate.getDate() === selectedDay;
          })
        }
        onTimePickerOpen={() => setShowTimeModal(true)}
      />

      {/* Time Selection Modal */}
      <VacationTimePicker
        open={showTimeModal}
        onOpenChange={setShowTimeModal}
        startHour={startHour}
        startMinute={startMinute}
        endHour={endHour}
        endMinute={endMinute}
        onConfirm={handleTimeConfirm}
      />
    </div>
  );
}
