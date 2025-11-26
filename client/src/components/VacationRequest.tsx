import { useState, useEffect, useMemo } from "react";
import { Sparkles, Heart, CheckCircle, Clock, Lock, XCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SparkleIcon } from "./DecorativeElements";
import { VacationCalendar } from "./VacationCalendar";
import { VacationDayDialog } from "./VacationDayDialog";
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
  type: "休" | "有休";
  reason?: string;
}

export function VacationRequest({
  employeeId = 1,
  onUnsavedChangesChange,
  headerImageUrl = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080"
}: VacationRequestProps) {
  const toast = useToast();

  // 編集中の希望休（未提出）- キー: `${year}-${month}-${day}`
  const [requests, setRequests] = useState<Map<string, DayRequest>>(new Map());
  // データベースから取得した既存の希望休
  const [existingRequests, setExistingRequests] = useState<LeaveRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDayDialog, setShowDayDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null); // 選択中の日付キー
  const [requestType, setRequestType] = useState<"休" | "有休">("休");
  const [reason, setReason] = useState("");

  // 月の計算（来月のみ）
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // 来月の日数を計算
  const nextMonthYear = nextMonth.getFullYear();
  const nextMonthNum = nextMonth.getMonth() + 1;
  const daysInNextMonth = new Date(nextMonthYear, nextMonthNum, 0).getDate();
  const monthDays = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);
  const nextMonthName = nextMonth.toLocaleDateString("ja-JP", { month: "long" });

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

  // データ取得後、existingRequestsに保存（来月分のみ）
  useEffect(() => {
    if (leaveRequestsData) {
      // 来月分の希望休をフィルタリング
      const nextMonthRequests = leaveRequestsData.filter(req => {
        const startDate = new Date(req.startDate);
        const reqYear = startDate.getFullYear();
        const reqMonth = startDate.getMonth() + 1;
        return reqYear === nextMonthYear && reqMonth === nextMonthNum;
      });
      setExistingRequests(nextMonthRequests);
    }
  }, [leaveRequestsData, nextMonthYear, nextMonthNum]);

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
      reason: existingRequest.reason,
    } : null);

    if (request) {
      setRequestType(request.type);
      setReason(request.reason || "");
    } else {
      setRequestType("休");
      setReason("");
    }

    setShowDayDialog(true);
  };

  const handleSaveDay = () => {
    if (selectedDay === null || selectedDayKey === null) return;

    const newRequest: DayRequest = {
      day: selectedDay,
      type: requestType,
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
              shiftId: targetShift?.id || existingRequest.shiftId || undefined,
              startDate: dateStr,
              endDate: dateStr,
              leaveType: request.type,
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
    console.log('[createGetRequestBadge]', { dateKey, editingRequest: editingRequest ? 'exists' : 'null/undefined' });

    if (editingRequest === null) {
      // 削除マーカー
      return null;
    }

    if (editingRequest) {
      // 編集中（未送信）
      const reqType = String(editingRequest.type || '');
      const emoji = reqType === "休" ? "🌸" : reqType === "有休" ? "💐" : "🌸";
      const text = reqType;
      const color = "bg-warning";

      console.log('[Badge editingRequest]', { emojiType: typeof emoji, textType: typeof text, emojiValue: emoji, textValue: text });

      return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/4 px-1.5 py-0.5 rounded-full text-white ${color} shadow-md flex items-center gap-0.5`}>
          <span className="text-[0.5rem]">{String(emoji)}</span>
          {text && typeof text === 'string' && text.length > 0 && (
            <span className="leading-tight whitespace-pre-line text-center text-[0.55rem]">
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
      const reqType = String(existingRequest.leaveType || '');
      const emoji = reqType === "休" ? "🌸" : reqType === "有休" ? "💐" : "🌸";
      const text = reqType;
      const isApproved = existingRequest.status === "approved";
      const isPending = existingRequest.status === "pending";
      const isRejected = existingRequest.status === "rejected";

      console.log('[Badge existingRequest]', { emojiType: typeof emoji, textType: typeof text, emojiValue: emoji, textValue: text, status: existingRequest.status });

      // ステータスに応じた色
      const color = isApproved
        ? "bg-success"
        : isRejected
        ? "bg-destructive"
        : "bg-yellow-500/80";

      return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/4 px-1.5 py-0.5 rounded-full text-white ${color} shadow-md flex items-center gap-0.5`}>
          {isApproved && <Lock className="w-2.5 h-2.5" />}
          {isPending && <Clock className="w-2.5 h-2.5" />}
          {isRejected && <XCircle className="w-2.5 h-2.5" />}
          <span className="text-[0.5rem]">{String(emoji)}</span>
          {text && typeof text === 'string' && text.length > 0 && (
            <span className="leading-tight whitespace-pre-line text-center text-[0.55rem]">
              {String(text)}
            </span>
          )}
        </div>
      );
    }

    return null;
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

  // 申請状態別のカウント
  const pendingCount = existingRequests.filter(req => req.status === "pending").length;
  const approvedCount = existingRequests.filter(req => req.status === "approved").length;
  const rejectedCount = existingRequests.filter(req => req.status === "rejected").length;
  const submittedCount = pendingCount + approvedCount;

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
                <p className="text-muted-foreground">来月の希望する休日を選択してください</p>
              </div>
            </div>

            {/* 状態表示バッジ */}
            <div className="flex flex-wrap gap-2">
              {requests.size > 0 && (
                <Badge className="bg-gradient-to-r from-warning to-warning/70 animate-pulse shadow-lg">
                  ⚠️ 未送信 {requests.size}件
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge className="bg-gradient-to-r from-yellow-500/70 to-yellow-400/60 shadow-lg">
                  <Clock className="w-3 h-3 mr-1" />
                  申請中 {pendingCount}件
                </Badge>
              )}
              {approvedCount > 0 && (
                <Badge className="bg-gradient-to-r from-success to-success/80 shadow-lg">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  承認済み {approvedCount}件
                </Badge>
              )}
              {rejectedCount > 0 && (
                <Badge className="bg-gradient-to-r from-destructive to-destructive/80 shadow-lg">
                  <XCircle className="w-3 h-3 mr-1" />
                  却下 {rejectedCount}件
                </Badge>
              )}
              {!isBeforeDeadline && (
                <Badge className="bg-gradient-to-r from-muted-foreground to-muted-foreground/70 shadow-lg">
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

          {/* 申請状態の詳細説明 */}
          {submittedCount > 0 && isBeforeDeadline && (
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30">
              <div className="flex gap-3">
                <div className="text-2xl">✨</div>
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    申請状況
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {pendingCount > 0 && (
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-yellow-500" />
                        申請中: {pendingCount}件（管理者の承認待ち）
                      </p>
                    )}
                    {approvedCount > 0 && (
                      <p className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-success" />
                        承認済み: {approvedCount}件（シフトに確定反映）
                      </p>
                    )}
                    {rejectedCount > 0 && (
                      <p className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                        却下: {rejectedCount}件（再申請可能）
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    💡 日付をタップして変更・削除できます（締切日まで）
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Calendar */}
          <VacationCalendar
            key={`calendar-${nextMonthYear}-${nextMonthNum}`}
            year={nextMonthYear}
            month={nextMonthNum}
            monthDays={monthDays}
            requests={new Map(
              Array.from(requests.entries())
                .filter(([dateKey, request]) => {
                  // null値（削除マーカー）を除外
                  if (request === null) return false;
                  const [year, month] = dateKey.split('-').map(Number);
                  return year === nextMonthYear && month === nextMonthNum;
                })
                .map(([dateKey, request]) => {
                  const day = parseInt(dateKey.split('-')[2]);
                  return [day, request];
                })
            )}
            submittedRequests={new Map(existingRequests
              .filter(req => {
                const startDate = new Date(req.startDate);
                return startDate.getFullYear() === nextMonthYear &&
                       startDate.getMonth() === nextMonthNum - 1;
              })
              .map(req => {
                const startDate = new Date(req.startDate);
                return [startDate.getDate(), {
                  day: startDate.getDate(),
                  type: req.leaveType,
                  reason: req.reason || undefined,
                }];
              })
            )}
            isBeforeDeadline={isBeforeDeadline}
            onDateClick={handleDateClick}
            getRequestBadge={createGetRequestBadge(nextMonthYear, nextMonthNum)}
          />

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
      />
    </div>
  );
}
