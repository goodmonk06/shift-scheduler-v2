import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Sparkles, Heart, CheckCircle, Edit } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SparkleIcon } from "./DecorativeElements";
import { useVacation } from "../contexts/VacationContext";
import { toast } from "sonner";
import Picker from "react-mobile-picker";

interface VacationRequestProps {
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

export function VacationRequest({ onUnsavedChangesChange, headerImageUrl = "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080" }: VacationRequestProps) {
  const { addVacationRequest } = useVacation();
  
  // localStorageから初期データを読み込む関数
  const loadFromStorage = (key: string): Map<number, DayRequest> => {
    if (typeof window === 'undefined') return new Map();
    const saved = localStorage.getItem(key);
    if (!saved) return new Map();
    try {
      const array = JSON.parse(saved);
      return new Map(array);
    } catch {
      return new Map();
    }
  };

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

  // ホイールピッカー用のstate
  const [pickerValue, setPickerValue] = useState({
    startHour: "09",
    startMinute: "00",
    endHour: "12",
    endMinute: "00",
  });

  // ホイールピッカーの選択肢を生成
  const pickerSelections = {
    startHour: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    startMinute: ["00", "15", "30", "45"],
    endHour: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    endMinute: ["00", "15", "30", "45"],
  };

  // 来月（12月）のカレンダーを表示
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthName = nextMonth.toLocaleDateString("ja-JP", { month: "long" });
  const daysInNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  
  const monthDays = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

  // Contextから締め切り日を取得
  const { deadline } = useVacation();
  const isBeforeDeadline = useMemo(() => today < deadline, [today, deadline]);

  // requestsをlocalStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vacation_editing_requests', JSON.stringify(Array.from(requests.entries())));
    }
  }, [requests]);

  // submittedRequestsをlocalStorageに保存
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
    // 締め切り後は編集不可
    if (!isBeforeDeadline) {
      toast.error("締め切りを過ぎています", {
        description: "希望休の申請・変更期限が過ぎました。",
      });
      return;
    }
    
    setSelectedDay(day);
    
    // 編集中のデータか提出済みデータを取得
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

    // 時間指定の場合のバリデーション
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

    // 編集中の希望休として保存（既に提出済みの場合は提出済みから削除して編集中に移動）
    setRequests(prev => {
      const updated = new Map(prev);
      updated.set(selectedDay, newRequest);
      return updated;
    });

    // 提出済みから削除（再編集する場合）
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
    
    // 編集中から削除
    setRequests(prev => {
      const updated = new Map(prev);
      updated.delete(selectedDay);
      return updated;
    });

    // 提出済みからも削除
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

    // VacationContextに申請を追加
    addVacationRequest({
      staffName: "山田花子", // デモ用 - 実際はログインユーザー情報から取得
      staffId: "staff-demo",
      month: nextMonthName,
      requests: Array.from(requests.values()),
    });
    
    toast.success("希望休申請を送信しました！", {
      description: `${requests.size}件の申請が管理者に送信されました。`,
    });
    
    // 編集中のデータを提出済みに移動
    setSubmittedRequests(prev => {
      const updated = new Map(prev);
      requests.forEach((request, day) => {
        updated.set(day, request);
      });
      return updated;
    });

    // 編集中のデータをクリア
    setRequests(new Map());
    onUnsavedChangesChange(false, 0);
  };

  const getRequestBadge = (day: number) => {
    const editingRequest = requests.get(day);
    const submittedRequest = submittedRequests.get(day);
    const request = editingRequest || submittedRequest;
    
    if (!request) return null;

    const isSubmitted = !editingRequest && submittedRequest;

    // 時間指定の場合のテキスト生成
    let timeText = "";
    if (request.type === "時間指定" && request.startTime && request.endTime) {
      const [startH, startM] = request.startTime.split(":");
      const [endH, endM] = request.endTime.split(":");
      
      const startDisplay = startM === "00" ? startH : `${startH}:${startM}`;
      const endDisplay = endM === "00" ? endH : `${endH}:${endM}`;
      
      // 両方とも分がある場合は二段表示
      if (startM !== "00" || endM !== "00") {
        timeText = `${startDisplay}\n-${endDisplay}`;
      } else {
        timeText = `${startDisplay}-${endDisplay}`;
      }
    }

    const configs = {
      "休": { 
        color: isSubmitted 
          ? "bg-gradient-to-r from-success/40 to-success/30" 
          : "bg-gradient-to-r from-success to-success/70", 
        emoji: "🌸", 
        text: "休" 
      },
      "有休": { 
        color: isSubmitted 
          ? "bg-gradient-to-r from-secondary/40 to-secondary/30" 
          : "bg-gradient-to-r from-secondary to-secondary/70", 
        emoji: "💐", 
        text: "有" 
      },
      "時間指定": { 
        color: isSubmitted 
          ? "bg-gradient-to-r from-warning/40 to-warning/30" 
          : "bg-gradient-to-r from-warning to-warning/70", 
        emoji: "⏰", 
        text: timeText
      }
    };

    const config = configs[request.type];
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

  const hasAnyRequests = requests.size > 0 || submittedRequests.size > 0;

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
                      onClick={() => handleDateClick(day)}
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
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="rounded-3xl border-2 border-secondary/30 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              {nextMonthName}{selectedDay}日の設定
              <Sparkles className="w-5 h-5 text-accent ml-auto" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            {/* Request Type */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-base">
                <Heart className="w-5 h-5 text-accent fill-accent" />
                休みの種類
              </Label>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setRequestType("休")}
                  className={`
                    relative p-6 rounded-2xl transition-all duration-300 text-left
                    ${requestType === "休"
                      ? "bg-gradient-to-br from-success/30 to-success/15 border-4 border-success shadow-lg scale-[1.02]"
                      : "bg-white border-2 border-muted hover:border-success/50 hover:bg-success/5"
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🌸</span>
                    <span className={`text-2xl font-bold ${requestType === "休" ? "text-[#2B3A55]" : "text-foreground"}`}>
                      休
                    </span>
                    {requestType === "休" && (
                      <CheckCircle className="w-8 h-8 text-success ml-auto" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType("有休")}
                  className={`
                    relative p-6 rounded-2xl transition-all duration-300 text-left
                    ${requestType === "有休"
                      ? "bg-gradient-to-br from-secondary/40 to-secondary/20 border-4 border-secondary shadow-lg scale-[1.02]"
                      : "bg-white border-2 border-muted hover:border-secondary/50 hover:bg-secondary/5"
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">💐</span>
                    <span className={`text-2xl font-bold ${requestType === "有休" ? "text-[#2B3A55]" : "text-foreground"}`}>
                      有休
                    </span>
                    {requestType === "有休" && (
                      <CheckCircle className="w-8 h-8 text-[#2B3A55] ml-auto" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequestType("時間指定");
                    setShowTimeModal(true);
                  }}
                  className={`
                    relative p-6 rounded-2xl transition-all duration-300 text-left
                    ${requestType === "時間指定"
                      ? "bg-gradient-to-br from-accent/40 to-accent/20 border-4 border-accent shadow-lg scale-[1.02]"
                      : "bg-white border-2 border-muted hover:border-accent/50 hover:bg-accent/5"
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">⏰</span>
                    <div className="flex-1">
                      <span className={`text-2xl font-bold ${requestType === "時間指定" ? "text-[#2B3A55]" : "text-foreground"}`}>
                        時間指定
                      </span>
                      {requestType === "時間指定" && startHour && endHour && (
                        <div className="mt-2 text-lg font-medium text-[#2B3A55]">
                          {startHour}:{startMinute} - {endHour}:{endMinute}
                        </div>
                      )}
                    </div>
                    {requestType === "時間指定" && (
                      <CheckCircle className="w-8 h-8 text-[#2B3A55] ml-auto" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <Label htmlFor="reason" className="flex items-center gap-2">
                <span className="text-xl">💭</span>
                理由（任意）
              </Label>
              <Textarea
                id="reason"
                placeholder="例：家族の用事、通院など"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] rounded-2xl border-2"
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background border-t pt-4 gap-2 flex-col sm:flex-row">
            {(requests.has(selectedDay || 0) || submittedRequests.has(selectedDay || 0)) && (
              <Button
                variant="outline"
                onClick={handleRemoveDay}
                className="rounded-xl text-destructive hover:text-destructive border-2 w-full sm:w-auto"
              >
                🗑️ 削除
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowDayDialog(false)}
                className="rounded-xl border-2 flex-1 sm:flex-none"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveDay}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg flex-1 sm:flex-none"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                設定する
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Selection Modal */}
      <Dialog open={showTimeModal} onOpenChange={(open) => {
        if (open) {
          // モーダルを開く時、現在の値をpickerValueに同期
          setPickerValue({
            startHour,
            startMinute,
            endHour,
            endMinute,
          });
        }
        setShowTimeModal(open);
      }}>
        <DialogContent className="rounded-3xl border-2 border-accent/50 max-w-sm bg-gradient-to-br from-white to-accent/5 shadow-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-7 h-7 text-accent" />
              時間帯を選択
              <span className="text-2xl ml-auto">⏰</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* ホイールピッカー */}
            <div className="relative">
              <div className="mb-4 text-center">
                <Label className="text-lg font-semibold text-[#2B3A55]">
                  時間をスクロールして選択 ⏰
                </Label>
              </div>

              {/* ホイールピッカーコンテナ */}
              <div className="relative rounded-3xl border-2 border-accent/30 bg-gradient-to-br from-white to-accent/5 p-4 shadow-xl overflow-hidden">
                {/* 中央のハイライトバー */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-14 bg-gradient-to-r from-accent/20 via-secondary/20 to-accent/20 border-y-2 border-accent/40 pointer-events-none z-10" />

                <Picker
                  value={pickerValue}
                  onChange={setPickerValue}
                  wheelMode="natural"
                  height={200}
                  itemHeight={50}
                >
                  {Object.keys(pickerSelections).map((name) => (
                    <Picker.Column key={name} name={name}>
                      {pickerSelections[name as keyof typeof pickerSelections].map((option) => (
                        <Picker.Item key={option} value={option}>
                          {({ selected }) => (
                            <div className={`flex items-center justify-center h-[50px] transition-all ${
                              selected
                                ? 'text-[#2B3A55] font-bold text-3xl scale-110'
                                : 'text-muted-foreground text-xl opacity-60'
                            }`}>
                              {name.includes('Hour') ? `${option}時` : `${option}分`}
                            </div>
                          )}
                        </Picker.Item>
                      ))}
                    </Picker.Column>
                  ))}
                </Picker>
              </div>

              {/* ラベル表示 */}
              <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm font-medium text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg">🌅</span>
                  <span>開始</span>
                </div>
                <div></div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg">🌙</span>
                  <span>終了</span>
                </div>
                <div></div>
              </div>
            </div>

            {/* プレビュー */}
            <div className="relative overflow-hidden p-5 bg-gradient-to-br from-accent/30 via-secondary/20 to-accent/20 rounded-2xl border-2 border-accent/50 shadow-lg">
              <div className="absolute top-0 right-0 text-6xl opacity-10">⏰</div>
              <div className="relative text-center">
                <p className="text-sm text-muted-foreground mb-3 font-medium">選択中の時間</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                    <span className="text-2xl font-bold text-[#2B3A55]">{pickerValue.startHour}:{pickerValue.startMinute}</span>
                  </div>
                  <span className="text-xl text-muted-foreground">→</span>
                  <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                    <span className="text-2xl font-bold text-[#2B3A55]">{pickerValue.endHour}:{pickerValue.endMinute}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTimeModal(false)}
              className="rounded-2xl border-2 text-base h-12 hover:bg-muted/50 transition-all"
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                setStartHour(pickerValue.startHour);
                setStartMinute(pickerValue.startMinute);
                setEndHour(pickerValue.endHour);
                setEndMinute(pickerValue.endMinute);
                setShowTimeModal(false);
              }}
              className="rounded-2xl bg-gradient-to-r from-accent via-accent/90 to-secondary/80 hover:from-accent/90 hover:via-accent/80 hover:to-secondary/70 shadow-lg text-base h-12 font-semibold transition-all"
            >
              <Clock className="w-5 h-5 mr-2" />
              決定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
