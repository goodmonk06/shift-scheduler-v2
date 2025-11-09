import { useState } from "react";
import { BarChart3, Users, Calendar, Clock, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  positionGroupId: string;
  workDays: number;
}

interface TimeSlotStats {
  timeSlotName: string;
  startTime: string;
  endTime: string;
  shiftCount: number;
}

export function Statistics() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // モックデータ（後でAPI連携）
  const mockEmployeeStats: EmployeeStats[] = [
    { employeeId: "EMP001", employeeName: "山田 太郎", positionGroupId: "POS001", workDays: 22 },
    { employeeId: "EMP002", employeeName: "佐藤 花子", positionGroupId: "POS001", workDays: 20 },
    { employeeId: "EMP003", employeeName: "鈴木 一郎", positionGroupId: "POS002", workDays: 15 },
    { employeeId: "EMP004", employeeName: "田中 美咲", positionGroupId: "POS002", workDays: 18 },
  ];

  const mockTimeSlotStats: TimeSlotStats[] = [
    { timeSlotName: "早番", startTime: "08:00", endTime: "16:00", shiftCount: 45 },
    { timeSlotName: "遅番", startTime: "11:00", endTime: "19:00", shiftCount: 38 },
    { timeSlotName: "夜勤", startTime: "16:00", endTime: "09:00", shiftCount: 25 },
  ];

  // サマリー計算
  const totalEmployees = mockEmployeeStats.length;
  const totalShifts = mockTimeSlotStats.reduce((sum, ts) => sum + ts.shiftCount, 0);
  const totalTimeSlots = mockTimeSlotStats.length;
  const avgWorkDays =
    mockEmployeeStats.reduce((sum, e) => sum + e.workDays, 0) / totalEmployees;

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">統計・レポート</h1>
            <p className="text-sm text-muted-foreground">
              シフトの統計情報を表示します
            </p>
          </div>
        </div>

        {/* 期間選択 */}
        <div className="flex gap-3">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(
                (year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-28 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {month}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総職員数</p>
              <p className="text-2xl text-gray-900">{totalEmployees}名</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総シフト数</p>
              <p className="text-2xl text-gray-900">{totalShifts}件</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">勤務時間枠数</p>
              <p className="text-2xl text-gray-900">{totalTimeSlots}種類</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平均勤務日数</p>
              <p className="text-2xl text-gray-900">{avgWorkDays.toFixed(1)}日</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 職員別勤務統計 */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg text-gray-900">職員別勤務統計</h2>
          <p className="text-sm text-muted-foreground">
            選択した期間の職員ごとの勤務日数
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>職員名</TableHead>
              <TableHead>職員ID</TableHead>
              <TableHead>役職グループ</TableHead>
              <TableHead className="text-right">勤務日数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockEmployeeStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              mockEmployeeStats.map((stat) => (
                <TableRow key={stat.employeeId}>
                  <TableCell>{stat.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{stat.employeeId}</TableCell>
                  <TableCell className="text-muted-foreground">{stat.positionGroupId}</TableCell>
                  <TableCell className="text-right">{stat.workDays}日</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 勤務時間枠別統計 */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg text-gray-900">勤務時間枠別統計</h2>
          <p className="text-sm text-muted-foreground">
            選択した期間の勤務時間枠ごとのシフト数
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>勤務時間枠</TableHead>
              <TableHead>開始時刻</TableHead>
              <TableHead>終了時刻</TableHead>
              <TableHead className="text-right">シフト数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTimeSlotStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              mockTimeSlotStats.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell>{stat.timeSlotName}</TableCell>
                  <TableCell className="text-muted-foreground">{stat.startTime}</TableCell>
                  <TableCell className="text-muted-foreground">{stat.endTime}</TableCell>
                  <TableCell className="text-right">{stat.shiftCount}回</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
