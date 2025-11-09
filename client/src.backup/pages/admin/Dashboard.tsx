import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Calendar, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const { data: shifts, isLoading: shiftsLoading } = trpc.shifts.list.useQuery();
  const { data: emergencyNotifications, isLoading: notificationsLoading } = trpc.emergencyNotifications.list.useQuery();

  const unreadNotifications = emergencyNotifications?.length || 0;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentShift = shifts?.find(s => s.month === currentMonth && s.year === currentYear);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <p className="text-muted-foreground mt-2">シフト管理システムの概要</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">登録職員数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{employees?.length || 0}名</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今月のシフト</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {currentYear}年{currentMonth}月
                  </div>
                  {currentShift && (
                    <Badge variant={
                      currentShift.status === "confirmed" ? "default" :
                      currentShift.status === "tentative" ? "secondary" :
                      "outline"
                    }>
                      {currentShift.status === "confirmed" ? "確定" :
                       currentShift.status === "tentative" ? "仮確定" :
                       currentShift.status === "draft" ? "下書き" : "アーカイブ"}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">緊急通知</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {unreadNotifications > 0 ? (
                    <span className="text-destructive">{unreadNotifications}件</span>
                  ) : (
                    <span className="text-muted-foreground">0件</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">アーカイブ</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {shifts?.filter(s => s.status === "archived").length || 0}件
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近の活動</CardTitle>
              <CardDescription>システムの最近の更新</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notificationsLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : emergencyNotifications && emergencyNotifications.length > 0 ? (
                  emergencyNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-4">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">通知はありません</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
              <CardDescription>よく使う機能へのショートカット</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <a href="/shifts" className="flex items-center p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Calendar className="h-5 w-5 mr-3" />
                  <span className="font-medium">新しいシフトを作成</span>
                </a>
                <a href="/employees" className="flex items-center p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Users className="h-5 w-5 mr-3" />
                  <span className="font-medium">職員を追加</span>
                </a>
                <a href="/leave-requests" className="flex items-center p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Clock className="h-5 w-5 mr-3" />
                  <span className="font-medium">希望休を確認</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
