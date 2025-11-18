import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Save, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { workPreferenceService } from "../services/workPreferenceService";
import { useToast } from "../hooks/useToast";
import { generateTimeOptions } from "../utils/timeSlots";

interface DayPreference {
  day: number;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface WorkPreferenceRequestProps {
  employeeId: number;
  employeeName: string;
  shiftId: number;
  year: number;
  month: number;
  onClose?: () => void;
}

export function WorkPreferenceRequest({
  employeeId,
  employeeName,
  shiftId,
  year,
  month,
  onClose,
}: WorkPreferenceRequestProps) {
  const toast = useToast();
  const [dayPreferences, setDayPreferences] = useState<Record<number, DayPreference>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const timeOptions = generateTimeOptions(); // 30分刻みの時間選択肢

  // カレンダーデータの生成
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=日曜
  const calendarDays: (number | null)[] = [];

  // 前月の空白
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // 当月の日付
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 日付をクリック
  const handleDayClick = (day: number) => {
    const key = `${year}-${month}-${day}`;
    setSelectedDay(day);
    setSelectedDayKey(key);

    // 既存の設定があれば読み込む
    if (dayPreferences[day]) {
      setStartTime(dayPreferences[day].startTime);
      setEndTime(dayPreferences[day].endTime);
      setReason(dayPreferences[day].reason || "");
    } else {
      setStartTime("09:00");
      setEndTime("18:00");
      setReason("");
    }

    setIsDialogOpen(true);
  };

  // 日付の設定を保存
  const handleSaveDay = () => {
    if (selectedDay === null || selectedDayKey === null) return;

    // 時間の妥当性チェック
    if (startTime >= endTime) {
      toast.error("終了時刻は開始時刻より後にしてください");
      return;
    }

    const newPreference: DayPreference = {
      day: selectedDay,
      startTime,
      endTime,
      reason: reason || undefined,
    };

    setDayPreferences(prev => ({
      ...prev,
      [selectedDay]: newPreference,
    }));

    setIsDialogOpen(false);
    toast.success(`${month}月${selectedDay}日の時間指定を設定しました`);
  };

  // 日付の設定を削除
  const handleRemoveDay = () => {
    if (selectedDay === null) return;

    setDayPreferences(prev => {
      const newPreferences = { ...prev };
      delete newPreferences[selectedDay];
      return newPreferences;
    });

    setIsDialogOpen(false);
    toast.success(`${month}月${selectedDay}日の時間指定を削除しました`);
  };

  // すべて保存
  const handleSaveAll = async () => {
    const preferenceArray = Object.values(dayPreferences);
    if (preferenceArray.length === 0) {
      toast.error("時間指定勤務希望がありません");
      return;
    }

    setIsSaving(true);
    try {
      for (const pref of preferenceArray) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(pref.day).padStart(2, '0')}`;

        await workPreferenceService.create({
          employeeId,
          shiftId,
          startDate: date,
          endDate: date,
          startTime: pref.startTime,
          endTime: pref.endTime,
          isAdditional: false,
          reason: pref.reason,
        });
      }

      toast.success(`${preferenceArray.length}件の時間指定勤務希望を保存しました`);
      setDayPreferences({});
      if (onClose) onClose();
    } catch (error: any) {
      console.error("保存エラー:", error);
      toast.error(error.message || "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">時間指定勤務希望</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {year}年{month}月 - {employeeName}
          </p>
        </div>
        <div className="flex gap-2">
          {Object.keys(dayPreferences).length > 0 && (
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              すべて保存
            </Button>
          )}
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              閉じる
            </Button>
          )}
        </div>
      </div>

      {/* 説明 */}
      <Card className="p-4 rounded-xl bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">時間指定勤務希望とは？</p>
            <p>特定の日に、指定した時間帯のみ勤務可能な場合に使用します。</p>
            <p className="mt-1">例: 「12/3は8:30-13:00のみ勤務可能」</p>
          </div>
        </div>
      </Card>

      {/* カレンダー */}
      <Card className="p-6 rounded-2xl">
        <div className="mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">
            {year}年{month}月カレンダー
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
            <div
              key={i}
              className={`text-center text-sm font-semibold py-2 ${
                i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} />;
            }

            const hasPreference = dayPreferences[day];
            const dayOfWeek = (index % 7);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  relative aspect-square rounded-lg p-2 text-sm transition-all
                  hover:shadow-md hover:scale-105
                  ${hasPreference
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg"
                    : isWeekend
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                  }
                `}
              >
                <span className="font-semibold">{day}</span>
                {hasPreference && (
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-white/20">
                      ⏰
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {Object.keys(dayPreferences).length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              設定済み時間指定（{Object.keys(dayPreferences).length}件）
            </h4>
            <div className="space-y-2">
              {Object.values(dayPreferences)
                .sort((a, b) => a.day - b.day)
                .map((pref) => (
                  <div
                    key={pref.day}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {month}/{pref.day}
                      </span>
                      <Badge variant="outline" className="rounded-lg">
                        {pref.startTime} - {pref.endTime}
                      </Badge>
                      {pref.reason && (
                        <span className="text-sm text-gray-600">
                          {pref.reason}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDayClick(pref.day)}
                      className="rounded-lg"
                    >
                      編集
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* 日付設定ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {month}月{selectedDay}日の時間指定
            </DialogTitle>
            <DialogDescription>
              この日に勤務可能な時間帯を設定してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">開始時刻</Label>
                <select
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">終了時刻</Label>
                <select
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">理由（任意）</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 子供の送迎があるため"
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {dayPreferences[selectedDay || 0] && (
              <Button
                variant="outline"
                onClick={handleRemoveDay}
                className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
              >
                削除
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button onClick={handleSaveDay} className="rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              設定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
