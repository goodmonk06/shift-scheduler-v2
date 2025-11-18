import { useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import type { WorkableDay } from "../types/staffManagementTypes";
import { generateTimeOptions, getDayName, isValidTimeRange } from "../utils/timeSlots";

interface WorkableDaysEditorProps {
  workableDays: WorkableDay[];
  onChange: (workableDays: WorkableDay[]) => void;
}

export function WorkableDaysEditor({ workableDays, onChange }: WorkableDaysEditorProps) {
  const timeOptions = generateTimeOptions(); // 00:00 ~ 23:30 (30分刻み)
  const allDays = [0, 1, 2, 3, 4, 5, 6]; // 日月火水木金土

  // 各曜日が設定されているかチェック
  const isDayEnabled = (dayOfWeek: number): boolean => {
    return workableDays.some(wd => wd.dayOfWeek === dayOfWeek);
  };

  // 曜日の設定を取得
  const getDayConfig = (dayOfWeek: number): WorkableDay | null => {
    return workableDays.find(wd => wd.dayOfWeek === dayOfWeek) || null;
  };

  // 曜日のON/OFFを切り替え
  const toggleDay = (dayOfWeek: number, enabled: boolean) => {
    if (enabled) {
      // 曜日を追加（デフォルト: 09:00-18:00）
      const newDay: WorkableDay = {
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      };
      onChange([...workableDays, newDay].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    } else {
      // 曜日を削除
      onChange(workableDays.filter(wd => wd.dayOfWeek !== dayOfWeek));
    }
  };

  // 時間を更新
  const updateDayTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = workableDays.map(wd => {
      if (wd.dayOfWeek === dayOfWeek) {
        const newDay = { ...wd, [field]: value };

        // バリデーション: 開始時刻 < 終了時刻
        if (!isValidTimeRange(newDay.startTime, newDay.endTime)) {
          // 無効な範囲の場合は更新しない
          return wd;
        }

        return newDay;
      }
      return wd;
    });
    onChange(updated);
  };

  // すべての曜日を同じ時間で設定
  const setAllDays = () => {
    const allDaysConfig: WorkableDay[] = allDays.map(day => ({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "18:00",
    }));
    onChange(allDaysConfig);
  };

  // すべてクリア
  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          <Calendar className="w-4 h-4 inline mr-2" />
          勤務可能曜日・時間帯
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setAllDays}
            className="rounded-lg text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            全曜日設定
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="rounded-lg text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            クリア
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        職員が勤務可能な曜日と時間帯を設定してください。設定されていない曜日は勤務不可となります。
      </p>

      <div className="space-y-3">
        {allDays.map(dayOfWeek => {
          const enabled = isDayEnabled(dayOfWeek);
          const config = getDayConfig(dayOfWeek);

          return (
            <Card key={dayOfWeek} className="p-4 rounded-xl">
              <div className="flex items-center gap-4">
                {/* 曜日ON/OFFスイッチ */}
                <div className="flex items-center space-x-2 min-w-[80px]">
                  <Switch
                    id={`day-${dayOfWeek}`}
                    checked={enabled}
                    onCheckedChange={(checked) => toggleDay(dayOfWeek, checked)}
                  />
                  <Label
                    htmlFor={`day-${dayOfWeek}`}
                    className="cursor-pointer font-semibold text-base"
                  >
                    {getDayName(dayOfWeek)}曜日
                  </Label>
                </div>

                {/* 時間選択（有効な場合のみ表示） */}
                {enabled && config && (
                  <div className="flex items-center gap-2 flex-1">
                    <Select
                      value={config.startTime}
                      onValueChange={(value) => updateDayTime(dayOfWeek, 'startTime', value)}
                    >
                      <SelectTrigger className="rounded-lg w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-muted-foreground">〜</span>

                    <Select
                      value={config.endTime}
                      onValueChange={(value) => updateDayTime(dayOfWeek, 'endTime', value)}
                    >
                      <SelectTrigger className="rounded-lg w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {workableDays.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl">
          曜日が設定されていません。全曜日で勤務可能として扱われます。
        </div>
      )}
    </div>
  );
}
