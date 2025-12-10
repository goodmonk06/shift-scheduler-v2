import { Sparkles, Heart, CheckCircle, Clock, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { TimeWheelPicker } from "./TimeWheelPicker";
import type { VacationDayDialogProps, LeaveType, WorkType } from "../types/vacationTypes";

// よく使う時間プリセット
const TIME_PRESETS = [
  { label: "9～13", start: "09:00", end: "13:00" },
  { label: "9～15", start: "09:00", end: "15:00" },
  { label: "9～17", start: "09:00", end: "17:00" },
  { label: "13～17", start: "13:00", end: "17:00" },
];

export function VacationDayDialog({
  open,
  onOpenChange,
  selectedDay,
  nextMonthName,
  holidayName,
  category,
  setCategory,
  requestType,
  setRequestType,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  reason,
  setReason,
  onSave,
  onRemove,
  hasRequest,
}: VacationDayDialogProps) {
  // カテゴリ変更時のハンドラ
  const handleCategoryChange = (newCategory: "leave" | "work") => {
    setCategory(newCategory);
    // カテゴリに応じてデフォルトタイプを設定
    if (newCategory === "leave") {
      setRequestType("休" as LeaveType);
    } else {
      setRequestType("時間指定" as WorkType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl border-2 border-secondary/30 max-h-[80vh] flex flex-col p-0"
        aria-describedby={undefined}
      >
        {/* ヘッダー（固定） */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background rounded-t-3xl flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{holidayName ? "🎌" : "📅"}</span>
            <div className="flex flex-col">
              <span>{nextMonthName}{selectedDay}日の設定</span>
              {holidayName && (
                <span className="text-sm text-destructive font-medium">{holidayName}</span>
              )}
            </div>
            <Sparkles className="w-5 h-5 text-accent ml-auto" />
          </DialogTitle>
        </DialogHeader>

        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            {/* カテゴリ選択ボタン（タブ代替） */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange("leave")}
                className={`
                  relative p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-2
                  ${category === "leave"
                    ? "shadow-lg scale-[1.02] ring-4 ring-pink-300 border-2 border-pink-300"
                    : "bg-gray-50 text-gray-400 border-2 border-gray-200 hover:bg-gray-100 hover:text-gray-500 hover:border-gray-300"
                  }
                `}
                style={category === "leave" ? {
                  background: 'linear-gradient(to bottom right, #f472b6, #fb7185)',
                  color: 'white',
                } : undefined}
              >
                <Heart className="w-7 h-7" style={category === "leave" ? { color: 'white', fill: 'white' } : undefined} />
                <span className="font-bold text-base">休みたい</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange("work")}
                className={`
                  relative p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-2
                  ${category === "work"
                    ? "shadow-lg scale-[1.02] ring-4 ring-blue-300 border-2 border-blue-300"
                    : "bg-gray-50 text-gray-400 border-2 border-gray-200 hover:bg-gray-100 hover:text-gray-500 hover:border-gray-300"
                  }
                `}
                style={category === "work" ? {
                  background: 'linear-gradient(to bottom right, #60a5fa, #22d3ee)',
                  color: 'white',
                } : undefined}
              >
                <Briefcase className="w-7 h-7" style={category === "work" ? { color: 'white' } : undefined} />
                <span className="font-bold text-base">働きたい</span>
              </button>
            </div>

            {/* 休暇申請オプション */}
            {category === "leave" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  休みの種類を選択
                </Label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("休" as LeaveType)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left
                      ${requestType === "休"
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 shadow-sm"
                        : "bg-white border-2 border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌸</span>
                      <div className="flex-1">
                        <span className={`font-bold ${requestType === "休" ? "text-green-700" : "text-gray-700"}`}>
                          休
                        </span>
                        <p className="text-xs text-muted-foreground">通常の希望休</p>
                      </div>
                      {requestType === "休" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType("有休" as LeaveType)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left
                      ${requestType === "有休"
                        ? "bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-400 shadow-sm"
                        : "bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💐</span>
                      <div className="flex-1">
                        <span className={`font-bold ${requestType === "有休" ? "text-purple-700" : "text-gray-700"}`}>
                          有休
                        </span>
                        <p className="text-xs text-muted-foreground">有給休暇を使用</p>
                      </div>
                      {requestType === "有休" && (
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 勤務希望オプション */}
            {category === "work" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-blue-500" />
                  勤務希望の種類を選択
                </Label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("時間指定" as WorkType)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left
                      ${requestType === "時間指定"
                        ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-400 shadow-sm"
                        : "bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⏰</span>
                      <div className="flex-1">
                        <span className={`font-bold ${requestType === "時間指定" ? "text-blue-700" : "text-gray-700"}`}>
                          時間指定
                        </span>
                        <p className="text-xs text-muted-foreground">勤務可能時間を指定</p>
                      </div>
                      {requestType === "時間指定" && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType("早番希望" as WorkType)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left
                      ${requestType === "早番希望"
                        ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 shadow-sm"
                        : "bg-white border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌅</span>
                      <div className="flex-1">
                        <span className={`font-bold ${requestType === "早番希望" ? "text-amber-700" : "text-gray-700"}`}>
                          早番希望
                        </span>
                        <p className="text-xs text-muted-foreground">早番（7:00〜16:00）</p>
                      </div>
                      {requestType === "早番希望" && (
                        <CheckCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType("遅番希望" as WorkType)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left
                      ${requestType === "遅番希望"
                        ? "bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-400 shadow-sm"
                        : "bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌆</span>
                      <div className="flex-1">
                        <span className={`font-bold ${requestType === "遅番希望" ? "text-purple-700" : "text-gray-700"}`}>
                          遅番希望
                        </span>
                        <p className="text-xs text-muted-foreground">遅番（11:00〜20:00）</p>
                      </div>
                      {requestType === "遅番希望" && (
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  </button>
                </div>

                {/* 時間指定の場合のみホイールピッカーを表示 */}
                {requestType === "時間指定" && (
                  <div className="mt-4 space-y-3">
                    {/* プリセットボタン */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {TIME_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStartTime(preset.start);
                            setEndTime(preset.end);
                          }}
                          className={`rounded-full px-4 text-xs ${
                            startTime === preset.start && endTime === preset.end
                              ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                              : "hover:bg-blue-100 hover:border-blue-300"
                          }`}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* ホイールピッカー */}
                    <TimeWheelPicker
                      startTime={startTime}
                      endTime={endTime}
                      onStartTimeChange={setStartTime}
                      onEndTimeChange={setEndTime}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 理由（任意） */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-lg">💭</span>
                理由（任意）
              </Label>
              <Textarea
                id="reason"
                placeholder={category === "leave" ? "例：家族の用事、通院など" : "例：送迎の都合、午後は予定あり"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[60px] rounded-xl border-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* フッター（固定） */}
        <DialogFooter className="px-6 py-4 border-t bg-background rounded-b-3xl flex-shrink-0 gap-2 flex-col sm:flex-row">
          {hasRequest && (
            <Button
              variant="outline"
              onClick={onRemove}
              className="rounded-xl text-destructive hover:text-destructive border-2 w-full sm:w-auto"
            >
              🗑️ 削除
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-2 flex-1 sm:flex-none"
            >
              キャンセル
            </Button>
            <Button
              onClick={onSave}
              className="rounded-xl shadow-lg flex-1 sm:flex-none"
              style={{
                color: 'white',
                background: category === "leave"
                  ? 'linear-gradient(to right, #ec4899, #f43f5e)'
                  : 'linear-gradient(to right, #3b82f6, #06b6d4)',
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              設定する
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
