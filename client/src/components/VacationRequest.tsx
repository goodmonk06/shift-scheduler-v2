import { useState, useEffect, useMemo } from "react";
import { Sparkles, Heart, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SparkleIcon } from "./DecorativeElements";
import { VacationCalendar } from "./VacationCalendar";
import { VacationDayDialog } from "./VacationDayDialog";
import { VacationTimePicker } from "./VacationTimePicker";
import { useVacation } from "../contexts/VacationContext";
import { toast } from "sonner";
import type { VacationRequestProps, DayRequest } from "../types/vacationTypes";
import { loadFromStorage, formatTimeText, getRequestTypeConfig } from "../utils/vacationHelpers";

export function VacationRequest({
  onUnsavedChangesChange,
  headerImageUrl = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080"
}: VacationRequestProps) {
  const { addVacationRequest, deadline } = useVacation();

  // 編集中の希望休（未提出）
  const [requests, setRequests] = useState<Map<number, DayRequest>>(() => loadFromStorage('vacation_editing_requests'));
  // 提出済みの希望休
  const [submittedRequests, setSubmittedRequests] = useState<Map<number, DayRequest>>(() => loadFromStorage('vacation_submitted_requests'));

  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<"休" | "有休" | "時間指定">("休");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("12");
  const [endMinute, setEndMinute] = useState("00");
  const [reason, setReason] = useState("");

  // 来月のカレンダーを表示
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthName = nextMonth.toLocaleDateString("ja-JP", { month: "long" });
  const daysInNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

  const isBeforeDeadline = useMemo(() => today < deadline, [today, deadline]);

  // localStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vacation_editing_requests', JSON.stringify(Array.from(requests.entries())));
    }
  }, [requests]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vacation_submitted_requests', JSON.stringify(Array.from(submittedRequests.entries())));
    }
  }, [submittedRequests]);

  // 未保存の変更を親に通知
  useEffect(() => {
    onUnsavedChangesChange(requests.size > 0, requests.size);
  }, [requests, onUnsavedChangesChange]);

  const handleDateClick = (day: number) => {
    if (!isBeforeDeadline) {
      toast.error("締め切りを過ぎています", {
        description: "希望休の申請・変更期限が過ぎました。",
      });
      return;
    }

    setSelectedDay(day);

    const existing = requests.get(day) || submittedRequests.get(day);
    if (existing) {
      setRequestType(existing.type);
      if (existing.startTime) {
        const [h, m] = existing.startTime.split(":");
        setStartHour(h);
        setStartMinute(m);
      } else {
        setStartHour("09");
        setStartMinute("00");
      }
      if (existing.endTime) {
        const [h, m] = existing.endTime.split(":");
        setEndHour(h);
        setEndMinute(m);
      } else {
        setEndHour("12");
        setEndMinute("00");
      }
      setReason(existing.reason || "");
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
    if (selectedDay === null) return;

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
      updated.set(selectedDay, newRequest);
      return updated;
    });

    if (submittedRequests.has(selectedDay)) {
      setSubmittedRequests(prev => {
        const updated = new Map(prev);
        updated.delete(selectedDay);
        return updated;
      });
    }

    setShowDayDialog(false);
    setSelectedDay(null);
  };

  const handleRemoveDay = () => {
    if (selectedDay === null) return;

    setRequests(prev => {
      const updated = new Map(prev);
      updated.delete(selectedDay);
      return updated;
    });

    setSubmittedRequests(prev => {
      const updated = new Map(prev);
      updated.delete(selectedDay);
      return updated;
    });

    setShowDayDialog(false);
    setSelectedDay(null);
  };

  const handleSubmit = () => {
    if (requests.size === 0) return;

    addVacationRequest({
      staffName: "山田花子",
      staffId: "staff-demo",
      month: nextMonthName,
      requests: Array.from(requests.values()),
    });

    toast.success("希望休申請を送信しました！", {
      description: `${requests.size}件の申請が管理者に送信されました。`,
    });

    setSubmittedRequests(prev => {
      const updated = new Map(prev);
      requests.forEach((request, day) => {
        updated.set(day, request);
      });
      return updated;
    });

    setRequests(new Map());
    onUnsavedChangesChange(false, 0);
  };

  const getRequestBadge = (day: number) => {
    const editingRequest = requests.get(day);
    const submittedRequest = submittedRequests.get(day);
    const request = editingRequest || submittedRequest;

    if (!request) return null;

    const isSubmitted = !editingRequest && submittedRequest;

    let timeText = "";
    if (request.type === "時間指定" && request.startTime && request.endTime) {
      timeText = formatTimeText(request.startTime, request.endTime);
    }

    const config = getRequestTypeConfig(request.type, isSubmitted, timeText);
    const isMultiLine = timeText.includes("\n");

    return (
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-1/4 px-1.5 py-0.5 rounded-full text-white ${config.color} shadow-md flex items-center gap-0.5`}>
        <span className="text-[0.5rem]">{config.emoji}</span>
        {config.text && (
          <span
            className="leading-tight whitespace-pre-line text-center"
            style={{ fontSize: isMultiLine ? '0.5rem' : '0.55rem' }}
          >
            {config.text}
          </span>
        )}
        {isSubmitted && <CheckCircle className="w-2.5 h-2.5" />}
      </div>
    );
  };

  const handleTimeConfirm = (hours: { startHour: string; startMinute: string; endHour: string; endMinute: string }) => {
    setStartHour(hours.startHour);
    setStartMinute(hours.startMinute);
    setEndHour(hours.endHour);
    setEndMinute(hours.endMinute);
  };

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
                <p className="text-muted-foreground">{nextMonthName}の希望する休日を選択してください</p>
              </div>
            </div>

            {/* 状態表示バッジ */}
            <div className="flex flex-wrap gap-2">
              {requests.size > 0 && (
                <Badge className="bg-gradient-to-r from-warning to-warning/70 animate-pulse shadow-lg">
                  ⚠️ 未送信 {requests.size}件
                </Badge>
              )}
              {submittedRequests.size > 0 && (
                <Badge className="bg-gradient-to-r from-success/60 to-success/50 shadow-lg">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  申請済み {submittedRequests.size}件
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
          {submittedRequests.size > 0 && isBeforeDeadline && (
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30">
              <div className="flex gap-3">
                <div className="text-2xl">✨</div>
                <div className="space-y-1">
                  <h4 className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    申請済み
                  </h4>
                  <p className="text-muted-foreground">
                    現在{submittedRequests.size}件の希望休を申請中です。仮確定後に追加申請できます。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💡 締切日までは日付をタップして変更できます
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Calendar */}
          <VacationCalendar
            monthDays={monthDays}
            requests={requests}
            submittedRequests={submittedRequests}
            isBeforeDeadline={isBeforeDeadline}
            onDateClick={handleDateClick}
            getRequestBadge={getRequestBadge}
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
                disabled={requests.size === 0}
                className="relative w-full py-7 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {submittedRequests.size > 0 ? '追加の希望休を申請する' : '希望休を申請する'}
                {requests.size > 0 && `(${requests.size}日)`}
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
        hasRequest={requests.has(selectedDay || 0) || submittedRequests.has(selectedDay || 0)}
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
