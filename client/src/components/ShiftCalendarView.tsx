import { useState, useEffect } from "react";
import {
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Users,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import type { ShiftAssignment } from "../types/shiftTypes";
import {
  getDayOfWeek,
  getDayOfWeekNumber,
  getDaysInMonth,
  isHoliday,
} from "../utils/shiftHelpers";
import { trpcClient } from "../lib/trpc";

interface WorkTimeSlot {
  id: number;
  name: string;
  displayLabel: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
}

interface ShiftCalendarViewProps {
  viewYear: number;
  viewMonth: number;
  assignments: ShiftAssignment[];
}

export function ShiftCalendarView({
  viewYear,
  viewMonth,
  assignments,
}: ShiftCalendarViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [workTimeSlots, setWorkTimeSlots] = useState<WorkTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // WorkTimeSlots（時間枠）をDBから取得
  useEffect(() => {
    const loadWorkTimeSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const slots = await trpcClient.workTimeSlots.list.query();
        setWorkTimeSlots(slots);
      } catch (error) {
        console.error('Failed to load work time slots:', error);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    loadWorkTimeSlots();
  }, []);

  // 特定の時刻における必要人数を計算
  const getRequiredStaffAtTime = (hour: number): number => {
    let maxRequired = 0;

    workTimeSlots.forEach((slot) => {
      const startHour = parseInt(slot.startTime.split(":")[0]);
      const endHour = parseInt(slot.endTime.split(":")[0]);

      let isInSlot = false;
      if (endHour < startHour) {
        // 日をまたぐ夜勤
        if (hour >= startHour || hour < endHour) isInSlot = true;
      } else {
        if (hour >= startHour && hour < endHour) isInSlot = true;
      }

      if (isInSlot && slot.requiredStaff > maxRequired) {
        maxRequired = slot.requiredStaff;
      }
    });

    return maxRequired;
  };

  // 各時間帯の人員数をカウント
  const getStaffCountAtTime = (dateStr: string, hour: number): number => {
    const dayAssignments = assignments.filter(
      (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
    );

    let count = 0;
    dayAssignments.forEach((assignment) => {
      const timeSlot = workTimeSlots.find((ts) => ts.id === Number(assignment.timeSlotId));
      if (!timeSlot) return;

      const startHour = parseInt(timeSlot.startTime.split(":")[0]);
      const endHour = parseInt(timeSlot.endTime.split(":")[0]);

      if (endHour < startHour) {
        // 日をまたぐ夜勤
        if (hour >= startHour || hour < endHour) count++;
      } else {
        if (hour >= startHour && hour < endHour) count++;
      }
    });

    return count;
  };

  // 各時間帯の勤務職員リストを取得
  const getStaffListAtTime = (dateStr: string, hour: number): Array<{name: string; timeSlot: string}> => {
    const dayAssignments = assignments.filter(
      (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
    );

    const staffList: Array<{name: string; timeSlot: string}> = [];
    dayAssignments.forEach((assignment) => {
      const timeSlot = workTimeSlots.find((ts) => ts.id === Number(assignment.timeSlotId));
      if (!timeSlot) return;

      const startHour = parseInt(timeSlot.startTime.split(":")[0]);
      const endHour = parseInt(timeSlot.endTime.split(":")[0]);

      let isWorking = false;
      if (endHour < startHour) {
        // 日をまたぐ夜勤
        if (hour >= startHour || hour < endHour) isWorking = true;
      } else {
        if (hour >= startHour && hour < endHour) isWorking = true;
      }

      if (isWorking) {
        staffList.push({
          name: assignment.employeeName,
          timeSlot: `${timeSlot.name} (${timeSlot.startTime}-${timeSlot.endTime})`
        });
      }
    });

    return staffList;
  };

  return (
    <Card className="rounded-2xl overflow-hidden shadow-lg">
      {/* ヘッダー */}
      <div className="p-6 border-b bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-gray-900">24時間タイムライン</h3>
            <p className="text-xs text-muted-foreground">
              人員配置を時間軸で視覚的に確認 · 空白時間を即座に発見
            </p>
          </div>
        </div>

        {/* 時刻の目盛り（改善版） */}
        <div className="flex items-start gap-2">
          <div className="w-24 flex-shrink-0 pt-6"></div>
          <div className="flex-1">
            <div className="relative h-12 border-b-2 border-gray-300">
              {/* メジャーな時刻（3時間ごと） */}
              {Array.from({ length: 9 }, (_, i) => i * 3).map((hour) => (
                <div
                  key={hour}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                >
                  <div className="h-3 w-0.5 bg-gray-400 mb-1"></div>
                  <div className="text-sm text-gray-900 px-2 py-0.5 bg-white rounded shadow-sm">
                    {hour}:00
                  </div>
                </div>
              ))}

              {/* マイナーな時刻（1時間ごと） */}
              {Array.from({ length: 24 }, (_, i) => i).filter(h => h % 3 !== 0).map((hour) => (
                <div
                  key={hour}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                >
                  <div className="h-2 w-0.5 bg-gray-300 mb-1"></div>
                  <div className="text-xs text-muted-foreground">
                    {hour}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* タイムライン本体 */}
      <ScrollArea className="h-[650px]">
        <div className="p-4 space-y-2">
          {days.map((day) => {
            const dayOfWeek = getDayOfWeek(viewYear, viewMonth, day);
            const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayAssignments = assignments.filter(
              (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
            );
            const hasWarnings = dayAssignments.some((a) => a.hasWarning);
            const isHolidayDay = isHoliday(viewYear, viewMonth, day);
            const isSaturday = dayOfWeekNum === 6;
            const isSunday = dayOfWeekNum === 0;

            const isExpanded = expandedDates.has(dateStr);

            return (
              <div
                key={day}
                className={`rounded-xl transition-all ${
                  hasWarnings
                    ? "bg-amber-50/70 border-2 border-amber-200"
                    : isHolidayDay
                    ? "bg-red-50/70 border-2 border-red-200"
                    : isSunday
                    ? "bg-red-50/50 border-2 border-red-100"
                    : isSaturday
                    ? "bg-blue-50/70 border-2 border-blue-200"
                    : "border-2 border-gray-100"
                }`}
              >
                {/* 日付ヘッダー（クリックで展開） */}
                <div className="flex items-stretch gap-2">
                  {/* 日付表示（展開ボタン付き） */}
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedDates);
                      if (newExpanded.has(dateStr)) {
                        newExpanded.delete(dateStr);
                      } else {
                        newExpanded.add(dateStr);
                      }
                      setExpandedDates(newExpanded);
                    }}
                    className={`w-20 flex-shrink-0 p-2 flex flex-col items-center justify-center border-r-2 bg-white/50 rounded-l-xl transition-all hover:bg-white/80 ${
                      isHolidayDay
                        ? "border-red-200"
                        : isSunday
                        ? "border-red-100"
                        : isSaturday
                        ? "border-blue-200"
                        : "border-gray-200"
                    }`}
                  >
                    <div className={`text-xs mb-0.5 ${
                      isHolidayDay || isSunday
                        ? "text-red-600"
                        : isSaturday
                        ? "text-blue-600"
                        : "text-muted-foreground"
                    }`}>
                      {dayOfWeek}
                      {isHolidayDay && " 🎌"}
                    </div>
                    <div className={`text-xl ${
                      isHolidayDay || isSunday
                        ? "text-red-700"
                        : isSaturday
                        ? "text-blue-700"
                        : "text-gray-900"
                    }`}>
                      {day}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <span>{dayAssignments.length}名</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </button>

                  {/* 24時間タイムライン（コンパクト/展開切り替え） */}
                  <div
                    className="flex-1 relative py-2 pr-2"
                    style={{ minHeight: isExpanded ? "auto" : "3.5rem" }}
                  >
                    {/* 背景グリッド（改善版 - 3時間ごと） */}
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 ${
                          i === 0 ? "border-l-2 border-gray-300" : "border-l border-gray-200"
                        }`}
                        style={{ left: `${(i / 8) * 100}%` }}
                      ></div>
                    ))}

                    {/* 時間帯ごとの背景色（夜間を暗く） */}
                    <div
                      className="absolute top-0 bottom-0 bg-slate-100/40"
                      style={{
                        left: `${(0 / 24) * 100}%`,
                        width: `${(6 / 24) * 100}%`
                      }}
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 bg-slate-100/40"
                      style={{
                        left: `${(21 / 24) * 100}%`,
                        width: `${(3 / 24) * 100}%`
                      }}
                    ></div>

                    {/* 勤務割り当ての帯（改善版 - 縦に積み上げ） */}
                    {dayAssignments.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 px-4 py-2 rounded-xl shadow-sm border border-red-200">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">人員未配置</span>
                        </div>
                      </div>
                    ) : (
                      dayAssignments.map((assignment, index) => {
                        const timeSlot = workTimeSlots.find((ts) => ts.id === Number(assignment.timeSlotId));
                        if (!timeSlot) return null;

                        // タイムライン位置を直接計算
                        const startHour = parseInt(timeSlot.startTime.split(":")[0]);
                        const startMin = parseInt(timeSlot.startTime.split(":")[1]);
                        const endHour = parseInt(timeSlot.endTime.split(":")[0]);
                        const endMin = parseInt(timeSlot.endTime.split(":")[1]);

                        const startPos = (startHour + startMin / 60) / 24 * 100;
                        let endPos = (endHour + endMin / 60) / 24 * 100;
                        if (endPos < startPos) endPos += 100; // 日をまたぐ場合

                        const left = startPos;
                        const width = endPos - startPos;

                        // 縦方向の位置を計算
                        const topOffset = isExpanded ? index * 2.2 : 0.5; // rem単位
                        const barHeight = isExpanded ? 1.8 : 0.8; // rem単位

                        // 職種グループごとの色分け
                        const positionColors: Record<string, string> = {
                          fulltime: 'from-blue-500 to-blue-600',
                          part: 'from-green-500 to-green-600',
                          admin: 'from-purple-500 to-purple-600',
                        };
                        const positionColor = positionColors[assignment.positionGroup] || 'from-gray-500 to-gray-600';

                        return (
                          <div
                            key={index}
                            className={`absolute rounded-lg bg-gradient-to-r ${positionColor} shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-white group`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              top: `${topOffset}rem`,
                              height: `${barHeight}rem`,
                              zIndex: 10 + index,
                            }}
                            title={`${assignment.employeeName} - ${timeSlot.name} (${timeSlot.startTime}-${timeSlot.endTime})`}
                          >
                            <div className="h-full flex items-center justify-between px-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1 h-1 rounded-full bg-white shadow-sm flex-shrink-0"></div>
                                {isExpanded && (
                                  <span className="text-white text-xs truncate font-medium">
                                    {assignment.employeeName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isExpanded && (
                                  <span className="text-white/90 text-xs">
                                    {timeSlot.name}
                                  </span>
                                )}
                                {assignment.hasWarning && (
                                  <AlertTriangle className="w-3 h-3 text-amber-300 animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* 人員数のオーバーレイ表示（3時間ごと） - 不足を強調 */}
                    {!isExpanded && Array.from({ length: 8 }, (_, i) => i * 3).map((hour) => {
                      const count = getStaffCountAtTime(dateStr, hour);
                      const required = getRequiredStaffAtTime(hour);
                      const shortage = required - count;

                      // 不足状況に応じた色分け
                      let bgColor = 'bg-green-100';
                      let textColor = 'text-green-700';
                      let borderColor = 'border-green-300';
                      let displayText = `${count}`;

                      if (shortage > 0) {
                        // 不足あり - 赤色で強調
                        bgColor = 'bg-red-100';
                        textColor = 'text-red-700';
                        borderColor = 'border-red-400';
                        displayText = `${count}/${required}`;
                      } else if (required > 0) {
                        // 充足 - 緑色
                        displayText = `${count}`;
                      } else {
                        // 必要人数が設定されていない - グレー
                        bgColor = 'bg-gray-100';
                        textColor = 'text-gray-600';
                        borderColor = 'border-gray-300';
                      }

                      return (
                        <div
                          key={hour}
                          className={`absolute -bottom-1 px-1.5 py-0.5 rounded ${bgColor} ${textColor} border ${borderColor} shadow-sm text-xs font-bold z-20`}
                          style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                          title={shortage > 0 ? `不足: ${shortage}人` : required > 0 ? '充足' : '未設定'}
                        >
                          {shortage > 0 && <Users className="w-3 h-3 inline mr-0.5" />}
                          {displayText}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 展開時の詳細表示 */}
                {isExpanded && (
                  <div className="p-4 border-t bg-white/30">
                    <div className="grid grid-cols-8 gap-2">
                      {Array.from({ length: 8 }, (_, i) => i * 3).map((hour) => {
                        const count = getStaffCountAtTime(dateStr, hour);
                        const staffList = getStaffListAtTime(dateStr, hour);
                        const required = getRequiredStaffAtTime(hour);
                        const shortage = required - count;
                        const endHour = (hour + 3) % 24;

                        // 不足状況に応じた色分け
                        let bgColor = 'bg-green-100';
                        let textColor = 'text-green-700';
                        let borderColor = 'border-green-300';

                        if (shortage > 0) {
                          bgColor = 'bg-red-100';
                          textColor = 'text-red-700';
                          borderColor = 'border-red-400';
                        } else if (required === 0) {
                          bgColor = 'bg-gray-100';
                          textColor = 'text-gray-600';
                          borderColor = 'border-gray-300';
                        }

                        return (
                          <div
                            key={hour}
                            className={`bg-white rounded-lg p-2 border-2 ${shortage > 0 ? borderColor : 'border-gray-100'} hover:border-gray-200 transition-colors`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-muted-foreground">
                                {hour}:00-{endHour}:00
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`px-1.5 py-0.5 rounded text-xs font-bold ${bgColor} ${textColor}`}>
                                  {count}人
                                </div>
                                {shortage > 0 && (
                                  <div className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                                    -{shortage}
                                  </div>
                                )}
                              </div>
                            </div>

                            {staffList.length > 0 ? (
                              <div className="space-y-1">
                                {staffList.map((staff, index) => (
                                  <div
                                    key={index}
                                    className="text-xs p-1 rounded bg-muted/50"
                                  >
                                    <div className="font-medium truncate">
                                      {staff.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {staff.timeSlot.split(" ")[0]}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                <span>なし</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-2">この日の全勤務者</div>
                      <div className="flex flex-wrap gap-2">
                        {dayAssignments.map((assignment, index) => {
                          const positionBadge = assignment.positionGroup === "fulltime" ? "正社員" : "パート";
                          const positionColor = assignment.positionGroup === "fulltime" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700";

                          return (
                            <div
                              key={index}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              <span className="text-sm font-medium">{assignment.employeeName}</span>
                              <Badge variant="outline" className={`text-xs ${positionColor} border-0`}>
                                {positionBadge}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* 凡例（改善版） */}
      <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="space-y-2">
          {/* 役職グループと人員数 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* 役職グループ */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground font-medium">役職:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-4 rounded bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm"></div>
                <span>正社員</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-4 rounded bg-gradient-to-r from-teal-400 to-teal-600 shadow-sm"></div>
                <span>パート</span>
              </div>
            </div>

            {/* 人員数 */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground font-medium">人員数:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 bg-red-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">0</div>
                <span>緊急</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 bg-yellow-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">1-2</div>
                <span>注意</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 bg-green-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">3+</div>
                <span>充足</span>
              </div>
            </div>
          </div>

          {/* 日付タイプ */}
          <div className="flex items-center flex-wrap gap-3 text-xs pt-2 border-t">
            <span className="text-muted-foreground font-medium">日付:</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-50 border-2 border-amber-200 rounded"></div>
              <span>警告あり</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-50 border-2 border-red-200 rounded"></div>
              <span>祝日🎌</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-50 border-2 border-red-100 rounded"></div>
              <span>日曜</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-50 border-2 border-blue-200 rounded"></div>
              <span>土曜</span>
            </div>
            <div className="flex items-center gap-1 ml-auto text-muted-foreground">
              <Info className="w-3 h-3" />
              <span>日付をクリックで詳細表示</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
