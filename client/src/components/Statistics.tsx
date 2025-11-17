import { useState, useEffect } from "react";
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
import { useToast } from "../hooks/useToast";

interface EmployeeStats {
  employeeId: number;
  employeeName: string;
  positionGroupId: number | null;
  workDays: number;
}

interface TimeSlotStats {
  timeSlotId: number;
  timeSlotName: string;
  startTime: string;
  endTime: string;
  shiftCount: number;
}

interface StatsSummary {
  totalEmployees: number;
  totalShifts: number;
  totalTimeSlots: number;
  avgWorkDays: number;
}

export function Statistics() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [timeSlotStats, setTimeSlotStats] = useState<TimeSlotStats[]>([]);
  const [summary, setSummary] = useState<StatsSummary>({
    totalEmployees: 0,
    totalShifts: 0,
    totalTimeSlots: 0,
    avgWorkDays: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // APIから統計データを取得
  useEffect(() => {
    async function loadStatistics() {
      try {
        setIsLoading(true);

        // tRPC経由でAPIを呼び出し
        const response = await fetch(
          `/api/trpc/statistics.getMonthlyStats?input=${encodeURIComponent(
            JSON.stringify({ year: selectedYear, month: selectedMonth })
          )}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('統計データの取得に失敗しました');
        }

        const result = await response.json();
        const data = result.result.data;

        setEmployeeStats(data.employeeStats);
        setTimeSlotStats(data.timeSlotStats);
        setSummary(data.summary);
      } catch (error) {
        console.error("統計データの取得に失敗しました:", error);
        toast.error("統計データの読み込みエラー", {
          description: "統計データの取得に失敗しました。",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStatistics();
  }, [selectedYear, selectedMonth]);

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
            onValueChange={(value: string) => setSelectedYear(parseInt(value))}
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
            onValueChange={(value: string) => setSelectedMonth(parseInt(value))}
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
              <p className="text-2xl text-gray-900">
                {isLoading ? "..." : `${summary.totalEmployees}名`}
              </p>
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
              <p className="text-2xl text-gray-900">
                {isLoading ? "..." : `${summary.totalShifts}件`}
              </p>
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
              <p className="text-2xl text-gray-900">
                {isLoading ? "..." : `${summary.totalTimeSlots}種類`}
              </p>
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
              <p className="text-2xl text-gray-900">
                {isLoading ? "..." : `${summary.avgWorkDays.toFixed(1)}日`}
              </p>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : employeeStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              employeeStats.map((stat) => (
                <TableRow key={stat.employeeId}>
                  <TableCell>{stat.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{stat.employeeId}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {stat.positionGroupId || "-"}
                  </TableCell>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : timeSlotStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              timeSlotStats.map((stat) => (
                <TableRow key={stat.timeSlotId}>
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
