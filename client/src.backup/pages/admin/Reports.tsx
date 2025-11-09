import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Calendar, Clock, Users } from "lucide-react";

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: shift } = trpc.shifts.getCurrentMonth.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  const { data: shiftDetails } = trpc.shiftDetails.getByShift.useQuery(
    { shiftId: shift?.id || 0 },
    { enabled: !!shift }
  );

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: workTimeSlots } = trpc.workTimeSlots.list.useQuery();

  // 職員別の勤務日数を集計
  const employeeStats = employees?.map((employee) => {
    const employeeShifts = shiftDetails?.filter((sd: any) => sd.employeeId === employee.id) || [];
    const workDays = employeeShifts.length;
    
    // 勤務時間枠別の集計
    const timeSlotCounts: Record<number, number> = {};
    employeeShifts.forEach((sd: any) => {
      timeSlotCounts[sd.timeSlotId] = (timeSlotCounts[sd.timeSlotId] || 0) + 1;
    });

    return {
      employee,
      workDays,
      timeSlotCounts,
    };
  }) || [];

  // 勤務時間枠別の集計
  const timeSlotStats = workTimeSlots?.map((slot) => {
    const slotShifts = shiftDetails?.filter((sd: any) => sd.timeSlotId === slot.id) || [];
    return {
      slot,
      count: slotShifts.length,
    };
  }) || [];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">統計・レポート</h1>
          <p className="text-muted-foreground">シフトの統計情報を確認します</p>
        </div>

        {/* 期間選択 */}
        <Card>
          <CardHeader>
            <CardTitle>期間選択</CardTitle>
            <CardDescription>統計を表示する年月を選択してください</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">年:</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">月:</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">総職員数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees?.length || 0}名</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">総シフト数</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shiftDetails?.length || 0}件</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">勤務時間枠数</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workTimeSlots?.length || 0}種類</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">平均勤務日数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employees && employees.length > 0
                  ? (employeeStats.reduce((sum, stat) => sum + stat.workDays, 0) / employees.length).toFixed(1)
                  : 0}
                日
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 職員別勤務統計 */}
        <Card>
          <CardHeader>
            <CardTitle>職員別勤務統計</CardTitle>
            <CardDescription>{selectedYear}年{selectedMonth}月の職員別勤務日数</CardDescription>
          </CardHeader>
          <CardContent>
            {employeeStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                データがありません
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>職員名</TableHead>
                    <TableHead>役職グループID</TableHead>
                    <TableHead className="text-right">勤務日数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeStats.map((stat) => (
                    <TableRow key={stat.employee.id}>
                      <TableCell className="font-medium">{stat.employee.name}</TableCell>
                      <TableCell>{stat.employee.positionGroupId}</TableCell>
                      <TableCell className="text-right">{stat.workDays}日</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 勤務時間枠別統計 */}
        <Card>
          <CardHeader>
            <CardTitle>勤務時間枠別統計</CardTitle>
            <CardDescription>{selectedYear}年{selectedMonth}月の勤務時間枠別シフト数</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSlotStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                データがありません
              </div>
            ) : (
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
                  {timeSlotStats.map((stat) => (
                    <TableRow key={stat.slot.id}>
                      <TableCell className="font-medium">{stat.slot.name}</TableCell>
                      <TableCell>{stat.slot.startTime}</TableCell>
                      <TableCell>{stat.slot.endTime}</TableCell>
                      <TableCell className="text-right">{stat.count}件</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
