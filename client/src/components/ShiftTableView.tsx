import { useState, useEffect } from "react";
import { Users, AlertTriangle, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { useToast } from "../hooks/useToast";
import type { ShiftAssignment, Employee } from "../types/shiftTypes";
import {
  getDayOfWeek,
  getDayOfWeekNumber,
  getDaysInMonth,
  isHoliday,
} from "../utils/shiftHelpers";
import { trpcClient } from "../lib/trpc";

interface ShiftTableViewProps {
  viewYear: number;
  viewMonth: number;
  assignments: ShiftAssignment[];
  employees: Employee[];
  shiftId?: string;
}

interface WorkTimeSlot {
  id: number;
  name: string;
  displayLabel: string;
  startTime: string;
  endTime: string;
}

interface EditingCell {
  employeeId: string;
  day: number;
  shiftDetailId: number | null;
}

export function ShiftTableView({
  viewYear,
  viewMonth,
  assignments,
  employees,
  shiftId,
}: ShiftTableViewProps) {
  const toast = useToast();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Work time slots data
  const [workTimeSlots, setWorkTimeSlots] = useState<WorkTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [timeInput, setTimeInput] = useState<string>("9-18"); // Simple time input format
  const [isSaving, setIsSaving] = useState(false);

  // Warning dialog state
  const [showLeaveRequestWarning, setShowLeaveRequestWarning] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    employeeId: string;
    day: number;
    shiftDetailId: number | null;
  } | null>(null);

  // Fetch work time slots
  useEffect(() => {
    const fetchWorkTimeSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const slots = await trpcClient.workTimeSlots.list.query();
        setWorkTimeSlots(slots);
      } catch (error) {
        console.error("Failed to fetch work time slots:", error);
        toast.error("勤務時間枠の取得に失敗しました");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchWorkTimeSlots();
  }, [toast]);

  // 各職員の各日のシフトを取得
  const getAssignment = (employeeId: string, day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return assignments.find((a) => a.date === dateStr && a.employeeId === employeeId);
  };

  const handleCellClick = (employeeId: string, day: number, shiftDetailId: number | null, isVacationRequest: boolean) => {
    // Check if this is a vacation request - show warning
    if (isVacationRequest) {
      setPendingEdit({ employeeId, day, shiftDetailId });
      setShowLeaveRequestWarning(true);
    } else {
      startEditing(employeeId, day, shiftDetailId);
    }
  };

  const startEditing = (employeeId: string, day: number, shiftDetailId: number | null) => {
    setEditingCell({ employeeId, day, shiftDetailId });
    setSelectedOption("");
    setTimeInput("9-18");
  };

  const handleWarningConfirm = () => {
    if (pendingEdit) {
      startEditing(pendingEdit.employeeId, pendingEdit.day, pendingEdit.shiftDetailId);
    }
    setShowLeaveRequestWarning(false);
    setPendingEdit(null);
  };

  const handleWarningCancel = () => {
    setShowLeaveRequestWarning(false);
    setPendingEdit(null);
  };

  const handleSave = async () => {
    if (!editingCell || !shiftId) return;

    try {
      setIsSaving(true);

      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(editingCell.day).padStart(2, "0")}`;

      // Prepare data based on selected option
      let mutationData: any = {
        shiftId: Number(shiftId),
        employeeId: Number(editingCell.employeeId),
        date: dateStr,
      };

      if (selectedOption === "休") {
        // Set as day off
        mutationData.status = "off";
        mutationData.leaveType = "休";
        mutationData.timeSlotId = null;
        mutationData.startTime = null;
        mutationData.endTime = null;
      } else if (selectedOption === "時間指定") {
        // Parse time input (format: "9-18" or "09:00-18:00")
        const timeParts = timeInput.split("-").map(t => t.trim());
        if (timeParts.length !== 2) {
          toast.error("時間の形式が正しくありません（例: 9-18）");
          return;
        }

        // Convert to HH:MM format
        const formatTime = (time: string) => {
          // If already in HH:MM format, return as is
          if (time.includes(":")) return time;
          // Otherwise, assume it's just hours
          const hour = parseInt(time);
          if (isNaN(hour) || hour < 0 || hour > 23) {
            throw new Error("時間が正しくありません");
          }
          return `${String(hour).padStart(2, "0")}:00`;
        };

        try {
          const startTime = formatTime(timeParts[0]);
          const endTime = formatTime(timeParts[1]);

          mutationData.status = "working";
          mutationData.leaveType = "時間指定";
          mutationData.timeSlotId = null;
          mutationData.startTime = startTime;
          mutationData.endTime = endTime;
        } catch (error) {
          toast.error("時間の形式が正しくありません（例: 9-18 または 09:00-18:00）");
          return;
        }
      } else {
        toast.error("オプションを選択してください");
        return;
      }

      // Call API - create or update
      if (editingCell.shiftDetailId === null) {
        // Create new shift detail
        await trpcClient.shiftDetails.create.mutate(mutationData);
      } else {
        // Update existing shift detail
        await trpcClient.shiftDetails.update.mutate({
          id: editingCell.shiftDetailId,
          ...mutationData,
        });
      }

      toast.success("シフトを更新しました");

      // Close editor
      setEditingCell(null);

      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Failed to save shift detail:", error);
      toast.error(`シフトの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (value: string) => {
    setSelectedOption(value);
    // Don't auto-save, user will click save button
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-sm text-gray-900">テーブルビュー</h3>
              <p className="text-xs text-muted-foreground">
                職員 {employees.length}名 × {daysInMonth}日間のシフト
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            クリックで編集可能
          </Badge>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <div className="w-full h-[600px] overflow-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 bg-muted/50 min-w-[120px] border-r">
                  職員名
                </TableHead>
                {days.map((day) => {
                  const dayOfWeek = getDayOfWeek(viewYear, viewMonth, day);
                  const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
                  const isHolidayDay = isHoliday(viewYear, viewMonth, day);
                  const isSaturday = dayOfWeekNum === 6;
                  const isSunday = dayOfWeekNum === 0;
                  return (
                    <TableHead
                      key={day}
                      className={`text-center w-[100px] min-w-[100px] max-w-[100px] ${
                        isHolidayDay
                          ? "bg-red-50/50"
                          : isSunday
                          ? "bg-red-50/30"
                          : isSaturday
                          ? "bg-blue-50/50"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`text-xs ${
                          isHolidayDay || isSunday
                            ? "text-red-600"
                            : isSaturday
                            ? "text-blue-600"
                            : "text-muted-foreground"
                        }`}>
                          {dayOfWeek}
                          {isHolidayDay && " 🎌"}
                        </div>
                        <div className={
                          isHolidayDay || isSunday
                            ? "text-red-700"
                            : isSaturday
                            ? "text-blue-700"
                            : ""
                        }>{day}</div>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-background border-r">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="text-sm">{employee.name}</div>
                    </div>
                  </TableCell>
                  {days.map((day) => {
                    const assignment = getAssignment(employee.id, day);
                    const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
                    const isHolidayDay = isHoliday(viewYear, viewMonth, day);
                    const isSaturday = dayOfWeekNum === 6;
                    const isSunday = dayOfWeekNum === 0;
                    const isEditingThisCell = editingCell?.employeeId === employee.id && editingCell?.day === day;

                    return (
                      <TableCell
                        key={day}
                        className={`text-center p-2 w-[100px] min-w-[100px] max-w-[100px] ${!isEditingThisCell ? "cursor-pointer hover:bg-primary/5" : ""} transition-colors ${
                          isHolidayDay
                            ? "bg-red-50/30"
                            : isSunday
                            ? "bg-red-50/20"
                            : isSaturday
                            ? "bg-blue-50/30"
                            : ""
                        } ${
                          assignment?.hasWarning ? "bg-amber-50" : ""
                        } ${
                          assignment?.isVacationRequest ? "opacity-60" : ""
                        }`}
                        onClick={() => {
                          if (!isEditingThisCell) {
                            handleCellClick(
                              employee.id,
                              day,
                              assignment?.shiftDetailId ?? null,
                              assignment?.isVacationRequest ?? false
                            );
                          }
                        }}
                      >
                        {isEditingThisCell ? (
                          <div className="flex flex-col gap-2 p-2 w-[200px]" onClick={(e) => e.stopPropagation()}>
                            <Select value={selectedOption} onValueChange={handleOptionChange} disabled={isSaving}>
                              <SelectTrigger className="w-full text-xs h-8">
                                <SelectValue placeholder="選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="休">休</SelectItem>
                                <SelectItem value="時間指定">時間指定</SelectItem>
                              </SelectContent>
                            </Select>

                            {selectedOption === "時間指定" && (
                              <div className="flex flex-col gap-2 bg-muted p-2 rounded">
                                <div className="text-xs text-muted-foreground">例: 9-18</div>
                                <Input
                                  type="text"
                                  value={timeInput}
                                  onChange={(e) => setTimeInput(e.target.value)}
                                  placeholder="9-18"
                                  className="text-xs h-8"
                                  disabled={isSaving}
                                />
                              </div>
                            )}

                            {selectedOption && (
                              <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-7 text-xs"
                              >
                                {isSaving ? "保存中..." : "保存"}
                              </Button>
                            )}
                          </div>
                        ) : assignment ? (
                          <div className="flex flex-col items-center gap-1">
                            {assignment.isVacationRequest ? (
                              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                希望休
                              </Badge>
                            ) : assignment.timeSlotName ? (
                              <Badge
                                variant={assignment.timeSlotName === "休" || assignment.timeSlotName === "有休" ? "secondary" : "default"}
                                className="text-xs px-2 py-0.5 whitespace-nowrap"
                              >
                                {assignment.timeSlotName}
                              </Badge>
                            ) : (
                              <div className="text-xs text-muted-foreground">-</div>
                            )}
                            {assignment.hasWarning && (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">-</div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 凡例 */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs px-2 py-0.5">早番</Badge>
            <span>勤務</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs px-2 py-0.5">希望休</Badge>
            <span>希望休</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2 py-0.5">休</Badge>
            <span>休み</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
            <span>警告あり</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>祝日</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-100 rounded"></div>
            <span>日曜</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
            <span>土曜</span>
          </div>
        </div>
      </div>

      {/* Warning dialog for editing vacation requests */}
      <AlertDialog open={showLeaveRequestWarning} onOpenChange={setShowLeaveRequestWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>希望休の変更確認</AlertDialogTitle>
            <AlertDialogDescription>
              この日は希望休が出ています。本当に変更しますか?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWarningCancel}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningConfirm}>変更する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
