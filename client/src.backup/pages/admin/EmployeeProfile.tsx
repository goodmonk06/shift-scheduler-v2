import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Clock, AlertCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeProfile() {
  const [, params] = useRoute("/employees/:id");
  const [, setLocation] = useLocation();
  const employeeId = params?.id ? parseInt(params.id) : null;

  const { data: employee, isLoading: employeeLoading } = trpc.employees.getById.useQuery(
    { id: employeeId! },
    { enabled: !!employeeId }
  );

  const { data: positionGroup } = trpc.positionGroups.list.useQuery();
  const { data: constraints } = trpc.employeeConstraints.getByEmployee.useQuery(
    { employeeId: employeeId! },
    { enabled: !!employeeId }
  );

  const { data: leaveRequests } = trpc.leaveRequests.getByEmployee.useQuery(
    { employeeId: employeeId! },
    { enabled: !!employeeId }
  );

  const { data: workTimeSlots } = trpc.workTimeSlots.list.useQuery();

  if (!employeeId) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">職員IDが指定されていません</p>
          <Button onClick={() => setLocation("/employees")} className="mt-4">
            職員一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (employeeLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">職員が見つかりません</p>
          <Button onClick={() => setLocation("/employees")} className="mt-4">
            職員一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getPositionGroupName = (id: number) => {
    return positionGroup?.find(pg => pg.id === id)?.name || "不明";
  };

  const getTimeSlotName = (id: number | null) => {
    if (!id) return "未設定";
    return workTimeSlots?.find(ts => ts.id === id)?.name || "不明";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/employees")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{employee.name}</h1>
            <p className="text-muted-foreground mt-2">
              {getPositionGroupName(employee.positionGroupId)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>職員の基本的な情報</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">名前</p>
                  <p className="font-medium">{employee.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">役職グループ</p>
                  <p className="font-medium">{getPositionGroupName(employee.positionGroupId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">スキルレベル</p>
                  <p className="font-medium">{employee.skillLevel}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">夜勤可否</p>
                  <Badge variant={employee.canWorkNightShift ? "default" : "secondary"}>
                    {employee.canWorkNightShift ? "可能" : "不可"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">表示順序</p>
                  <p className="font-medium">{employee.displayOrder}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 個人制約 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                個人制約
              </CardTitle>
              <CardDescription>勤務に関する制約条件</CardDescription>
            </CardHeader>
            <CardContent>
              {constraints && constraints.length > 0 ? (
                <div className="space-y-4">
                  {constraints.map((constraint) => (
                    <div key={constraint.id} className="border-b pb-4 last:border-b-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">制約タイプ</p>
                          <Badge variant="outline">
                            {constraint.constraintType === "available_day" ? "勤務可能日" :
                             constraint.constraintType === "available_time" ? "勤務可能時間" :
                             constraint.constraintType === "max_consecutive_days" ? "最大連続勤務日数" :
                             "最大週間勤務時間"}
                          </Badge>
                        </div>
                        {constraint.dayOfWeek !== null && (
                          <div>
                            <p className="text-muted-foreground">曜日</p>
                            <p className="font-medium">
                              {["日", "月", "火", "水", "木", "金", "土"][constraint.dayOfWeek]}
                            </p>
                          </div>
                        )}
                        {constraint.startTime && constraint.endTime && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">時間帯</p>
                            <p className="font-medium">{constraint.startTime} 〜 {constraint.endTime}</p>
                          </div>
                        )}
                        {constraint.maxValue !== null && (
                          <div>
                            <p className="text-muted-foreground">最大値</p>
                            <p className="font-medium">{constraint.maxValue}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">制約条件が設定されていません</p>
              )}
            </CardContent>
          </Card>

          {/* 希望休一覧 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                希望休一覧
              </CardTitle>
              <CardDescription>申請済みの希望休</CardDescription>
            </CardHeader>
            <CardContent>
              {leaveRequests && leaveRequests.length > 0 ? (
                <div className="space-y-2">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {request.startDate} 〜 {request.endDate}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.reason || "理由なし"}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {request.status === "approved"
                          ? "承認済"
                          : request.status === "rejected"
                          ? "却下"
                          : "申請中"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">希望休の申請はありません</p>
              )}
            </CardContent>
          </Card>

          {/* 勤務時間統計（将来的な拡張用） */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                勤務時間統計
              </CardTitle>
              <CardDescription>今月の勤務実績</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                勤務時間の統計機能は今後実装予定です
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
