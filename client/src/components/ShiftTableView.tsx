import { Users, AlertTriangle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useToast } from "../hooks/useToast";
import type { ShiftAssignment, Employee } from "../types/shiftTypes";
import {
  getDayOfWeek,
  getDayOfWeekNumber,
  getDaysInMonth,
  isHoliday,
} from "../utils/shiftHelpers";

interface ShiftTableViewProps {
  viewYear: number;
  viewMonth: number;
  assignments: ShiftAssignment[];
  employees: Employee[];
}

export function ShiftTableView({
  viewYear,
  viewMonth,
  assignments,
  employees,
}: ShiftTableViewProps) {
  const toast = useToast();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 各職員の各日のシフトを取得
  const getAssignment = (employeeId: string, day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return assignments.find((a) => a.date === dateStr && a.employeeId === employeeId);
  };

  const handleCellClick = (employeeId: string, employeeName: string, day: number) => {
    toast.info(`${employeeName} - ${day}日のシフト編集（実装予定）`);
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
            クリックで編集（実装予定）
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
                      className={`text-center min-w-[80px] ${
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

                    return (
                      <TableCell
                        key={day}
                        className={`text-center p-2 cursor-pointer hover:bg-primary/5 transition-colors ${
                          isHolidayDay
                            ? "bg-red-50/30"
                            : isSunday
                            ? "bg-red-50/20"
                            : isSaturday
                            ? "bg-blue-50/30"
                            : ""
                        } ${
                          assignment?.hasWarning ? "bg-amber-50" : ""
                        }`}
                        onClick={() => handleCellClick(employee.id, employee.name, day)}
                      >
                        {assignment ? (
                          <div className="flex flex-col items-center gap-1">
                            {assignment.timeSlotName ? (
                              <Badge
                                variant="default"
                                className="text-xs px-2 py-0.5"
                              >
                                {assignment.timeSlotName}
                              </Badge>
                            ) : (
                              <Badge
                                variant={assignment.isVacationRequest ? "destructive" : "secondary"}
                                className="text-xs px-2 py-0.5"
                              >
                                {assignment.isVacationRequest ? "希望休" : "休"}
                              </Badge>
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
    </div>
  );
}
