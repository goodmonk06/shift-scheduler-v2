import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, FileText, Bell, LogOut } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function EmployeeHome() {
  const [, setLocation] = useLocation();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 簡易ログイン認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/simple-auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            // simpleAuth APIは{user: {...}}を返す
            setEmployee(data.user);
          } else {
            setLocation("/employee/login");
          }
        } else {
          setLocation("/employee/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setLocation("/employee/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  // 今月のシフトを取得
  const currentDate = new Date();
  const { data: currentShift } = trpc.shifts.getCurrentMonth.useQuery({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  // 自分のシフト詳細を取得
  const { data: myShiftDetails } = trpc.shiftDetails.getByEmployee.useQuery(
    {
      employeeId: employee?.id!,
      shiftId: currentShift?.id!,
    },
    { enabled: !!employee?.id && !!currentShift?.id }
  );

  // 希望休申請を取得
  const { data: leaveRequests } = trpc.leaveRequests.getByEmployee.useQuery(
    { employeeId: employee?.id! },
    { enabled: !!employee?.id }
  );

  // 緊急通知を取得
  const { data: notifications } = trpc.emergencyNotifications.list.useQuery();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/simple-auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("ログアウトしました");
        setLocation("/employee/login");
      } else {
        toast.error("ログアウトに失敗しました");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("ログアウトに失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    );
  }

  if (!employee) {
    return null; // リダイレクト中
  }

  const pendingLeaveRequests = leaveRequests?.filter(lr => lr.status === "pending").length || 0;
  const unreadNotifications = notifications?.length || 0;
  const upcomingShifts = myShiftDetails?.filter(sd => {
    const shiftDate = new Date(sd.date);
    const today = new Date();
    return shiftDate >= today && sd.status === "working";
  }).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
            <p className="text-sm opacity-90">{employee.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 通知バナー */}
        {unreadNotifications > 0 && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-destructive" />
                <span className="font-semibold">
                  {unreadNotifications}件の未読通知があります
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{upcomingShifts}</div>
              <div className="text-sm text-muted-foreground">今月の勤務</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{pendingLeaveRequests}</div>
              <div className="text-sm text-muted-foreground">申請中</div>
            </CardContent>
          </Card>
        </div>

        {/* メニュー */}
        <div className="space-y-3">
          <Button
            className="w-full h-auto py-4 justify-start"
            variant="outline"
            onClick={() => setLocation("/employee/shifts")}
          >
            <Calendar className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">シフト確認</div>
              <div className="text-sm text-muted-foreground">今月のシフトを確認</div>
            </div>
          </Button>

          <Button
            className="w-full h-auto py-4 justify-start"
            variant="outline"
            onClick={() => setLocation("/employee/leave-requests")}
          >
            <Clock className="h-6 w-6 mr-3" />
            <div className="text-left flex-1">
              <div className="font-semibold">希望休申請</div>
              <div className="text-sm text-muted-foreground">希望休を申請・確認</div>
            </div>
            {pendingLeaveRequests > 0 && (
              <Badge variant="secondary">{pendingLeaveRequests}</Badge>
            )}
          </Button>

          <Button
            className="w-full h-auto py-4 justify-start"
            variant="outline"
            onClick={() => setLocation("/employee/change-proposals")}
          >
            <FileText className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">変更提案</div>
              <div className="text-sm text-muted-foreground">シフト変更を提案</div>
            </div>
          </Button>

          <Button
            className="w-full h-auto py-4 justify-start"
            variant="outline"
            onClick={() => setLocation("/employee/notifications")}
          >
            <Bell className="h-6 w-6 mr-3" />
            <div className="text-left flex-1">
              <div className="font-semibold">緊急通知</div>
              <div className="text-sm text-muted-foreground">重要なお知らせ</div>
            </div>
            {unreadNotifications > 0 && (
              <Badge variant="destructive">{unreadNotifications}</Badge>
            )}
          </Button>
        </div>

        {/* 今日のシフト */}
        {myShiftDetails && myShiftDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>今日のシフト</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const todayShift = myShiftDetails.find(sd => sd.date === today && sd.status === "working");
                if (todayShift) {
                  return (
                    <div className="flex items-center gap-4">
                      <Clock className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-semibold">勤務あり</div>
                        <div className="text-sm text-muted-foreground">
                          時間枠ID: {todayShift.timeSlotId}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center text-muted-foreground py-4">
                      今日は休みです
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
