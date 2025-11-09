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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<"休" | "有休" | "時間指定">("休");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [reason, setReason] = useState("");

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
        setStartHour("");
        setStartMinute("");
      }
      if (existing.endTime) {
        const [h, m] = existing.endTime.split(":");
        setEndHour(h);
        setEndMinute(m);
      } else {
        setEndHour("");
        setEndMinute("");
      }
      setReason(existing.reason || "");
    } else {
      setRequestType("休");
      setStartHour("");
      setStartMinute("");
      setEndHour("");
      setEndMinute("");
      setReason("");
    }
    
    setShowDayDialog(true);
  };

  const handleSaveDay = () => {
    if (selectedDay === null) return;

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
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-accent fill-accent" />
                休みの種類
              </Label>
              <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as typeof requestType)}>
                <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 hover:border-success hover:bg-success/5 cursor-pointer transition-all">
                  <RadioGroupItem value="休" id="type-休" />
                  <Label htmlFor="type-休" className="flex-1 cursor-pointer flex items-center gap-2">
                    <span className="text-xl">🌸</span>
                    休
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-all">
                  <RadioGroupItem value="有休" id="type-有休" />
                  <Label htmlFor="type-有休" className="flex-1 cursor-pointer flex items-center gap-2">
                    <span className="text-xl">💐</span>
                    有休
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-2xl border-2 hover:border-warning hover:bg-warning/5 cursor-pointer transition-all">
                  <RadioGroupItem value="時間指定" id="type-時間指定" />
                  <Label htmlFor="type-時間指定" className="flex-1 cursor-pointer flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    時間指定
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Time Selection */}
            {requestType === "時間指定" && (
              <div className="space-y-4 p-4 bg-gradient-to-br from-warning/10 to-accent/5 rounded-2xl border-2 border-warning/30">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  時間帯
                </Label>
                
                {/* 開始時刻 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-xl">🌅</span>
                    開始時刻
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={startHour} onValueChange={(v) => {
                      setStartHour(v);
                      if (!startMinute) setStartMinute("00");
                    }}>
                      <SelectTrigger className="rounded-xl border-2 h-14 bg-white shadow-sm">
                        <SelectValue placeholder="時" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                            {i.toString().padStart(2, "0")}時
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={startMinute} onValueChange={setStartMinute}>
                      <SelectTrigger className="rounded-xl border-2 h-14 bg-white shadow-sm">
                        <SelectValue placeholder="分" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00">00分</SelectItem>
                        <SelectItem value="15">15分</SelectItem>
                        <SelectItem value="30">30分</SelectItem>
                        <SelectItem value="45">45分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 終了時刻 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-xl">🌙</span>
                    終了時刻
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={endHour} onValueChange={(v) => {
                      setEndHour(v);
                      if (!endMinute) setEndMinute("00");
                    }}>
                      <SelectTrigger className="rounded-xl border-2 h-14 bg-white shadow-sm">
                        <SelectValue placeholder="時" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                            {i.toString().padStart(2, "0")}時
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={endMinute} onValueChange={setEndMinute}>
                      <SelectTrigger className="rounded-xl border-2 h-14 bg-white shadow-sm">
                        <SelectValue placeholder="分" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00">00分</SelectItem>
                        <SelectItem value="15">15分</SelectItem>
                        <SelectItem value="30">30分</SelectItem>
                        <SelectItem value="45">45分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

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
    </div>
  );
}
