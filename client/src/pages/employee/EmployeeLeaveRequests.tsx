import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export default function EmployeeLeaveRequests() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const utils = trpc.useUtils();

  // 職員情報を取得
  const { data: employee } = trpc.employees.getByUserId.useQuery(
    { userId: user?.id! },
    { enabled: !!user?.id }
  );

  // 希望休申請を取得
  const { data: leaveRequests, isLoading } = trpc.leaveRequests.getByEmployee.useQuery(
    { employeeId: employee?.id! },
    { enabled: !!employee?.id }
  );

  // 希望休申請を作成
  const createMutation = trpc.leaveRequests.create.useMutation({
    onSuccess: () => {
      toast.success("希望休を申請しました");
      utils.leaveRequests.getByEmployee.invalidate();
      setIsDialogOpen(false);
      setFormData({ startDate: "", endDate: "", reason: "" });
    },
    onError: (error: any) => {
      toast.error("申請に失敗しました: " + error.message);
    },
  });

  // 現在の月のシフトを取得
  const currentDate = new Date();
  const { data: currentShift } = trpc.shifts.getCurrentMonth.useQuery({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  const handleSubmit = () => {
    if (!employee) {
      toast.error("職員情報が見つかりません");
      return;
    }
    if (!currentShift) {
      toast.error("現在の月のシフトが作成されていません");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error("日付を入力してください");
      return;
    }

    createMutation.mutate({
      employeeId: employee.id,
      shiftId: currentShift.id,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />申請中</Badge>;
      case "approved":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />承認済</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />却下</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const pendingRequests = leaveRequests?.filter(lr => lr.status === "pending") || [];
  const processedRequests = leaveRequests?.filter(lr => lr.status !== "pending") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/employee")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">希望休申請</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  新規申請
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>希望休を申請</DialogTitle>
                  <DialogDescription>
                    希望休の期間と理由を入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="startDate">開始日</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">終了日</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">理由（任意）</Label>
                    <Textarea
                      id="reason"
                      placeholder="希望休の理由を入力してください"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                    申請する
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container py-4 space-y-4">
        {/* 申請中の希望休 */}
        <Card>
          <CardHeader>
            <CardTitle>申請中 ({pendingRequests.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                申請中の希望休はありません
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {request.startDate} 〜 {request.endDate}
                        </div>
                        {request.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {request.reason}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      申請日時: {new Date(request.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 処理済みの希望休 */}
        <Card>
          <CardHeader>
            <CardTitle>処理済み ({processedRequests.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {processedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                処理済みの希望休はありません
              </div>
            ) : (
              <div className="space-y-3">
                {processedRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">
                          {request.startDate} 〜 {request.endDate}
                        </div>
                        {request.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {request.reason}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      申請日時: {new Date(request.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
