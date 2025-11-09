import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export default function EmployeeChangeProposals() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    proposalDate: "",
    currentTimeSlotId: "",
    proposedTimeSlotId: "",
    reason: "",
  });

  const utils = trpc.useUtils();

  // 職員情報を取得
  const { data: employee } = trpc.employees.getByUserId.useQuery(
    { userId: user?.id! },
    { enabled: !!user?.id }
  );

  // 現在の月のシフトを取得
  const currentDate = new Date();
  const { data: currentShift } = trpc.shifts.getCurrentMonth.useQuery({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  // 変更提案を取得
  const { data: changeProposals, isLoading } = trpc.changeProposals.getByEmployee.useQuery(
    { employeeId: employee?.id! },
    { enabled: !!employee?.id }
  );

  // 勤務時間枠を取得
  const { data: workTimeSlots } = trpc.workTimeSlots.list.useQuery();

  // 変更提案を作成
  const createMutation = trpc.changeProposals.create.useMutation({
    onSuccess: () => {
      toast.success("変更提案を送信しました");
      utils.changeProposals.getByEmployee.invalidate();
      setIsDialogOpen(false);
      setFormData({ proposalDate: "", currentTimeSlotId: "", proposedTimeSlotId: "", reason: "" });
    },
    onError: (error: any) => {
      toast.error("送信に失敗しました: " + error.message);
    },
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
    if (!formData.proposalDate) {
      toast.error("日付を入力してください");
      return;
    }

    createMutation.mutate({
      employeeId: employee.id,
      shiftId: currentShift.id,
      proposalDate: formData.proposalDate,
      currentTimeSlotId: formData.currentTimeSlotId && formData.currentTimeSlotId !== "null" ? parseInt(formData.currentTimeSlotId) : undefined,
      proposedTimeSlotId: formData.proposedTimeSlotId && formData.proposedTimeSlotId !== "null" ? parseInt(formData.proposedTimeSlotId) : undefined,
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

  const getTimeSlotName = (timeSlotId: number | null) => {
    if (timeSlotId === null) return "休み";
    const slot = workTimeSlots?.find(ts => ts.id === timeSlotId);
    return slot ? `${slot.name} (${slot.startTime}-${slot.endTime})` : `時間枠${timeSlotId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const pendingProposals = changeProposals?.filter((cp: any) => cp.status === "pending") || [];
  const processedProposals = changeProposals?.filter((cp: any) => cp.status !== "pending") || [];

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
              <h1 className="text-xl font-bold">変更提案</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  新規提案
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>シフト変更を提案</DialogTitle>
                  <DialogDescription>
                    変更したい日付とシフト内容を入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="proposalDate">日付</Label>
                    <Input
                      id="proposalDate"
                      type="date"
                      value={formData.proposalDate}
                      onChange={(e) => setFormData({ ...formData, proposalDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentTimeSlotId">現在のシフト</Label>
                    <Select
                      value={formData.currentTimeSlotId}
                      onValueChange={(value) => setFormData({ ...formData, currentTimeSlotId: value })}
                    >
                      <SelectTrigger id="currentTimeSlotId">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">休み</SelectItem>
                        {workTimeSlots?.map((slot: any) => (
                          <SelectItem key={slot.id} value={slot.id.toString()}>
                            {slot.name} ({slot.startTime}-{slot.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="proposedTimeSlotId">変更後のシフト</Label>
                    <Select
                      value={formData.proposedTimeSlotId}
                      onValueChange={(value) => setFormData({ ...formData, proposedTimeSlotId: value })}
                    >
                      <SelectTrigger id="proposedTimeSlotId">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">休み</SelectItem>
                        {workTimeSlots?.map((slot: any) => (
                          <SelectItem key={slot.id} value={slot.id.toString()}>
                            {slot.name} ({slot.startTime}-{slot.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reason">理由（任意）</Label>
                    <Textarea
                      id="reason"
                      placeholder="変更の理由を入力してください"
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
                    提案する
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container py-4 space-y-4">
        {/* 申請中の変更提案 */}
        <Card>
          <CardHeader>
            <CardTitle>申請中 ({pendingProposals.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                申請中の変更提案はありません
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProposals.map((proposal: any) => (
                  <div
                    key={proposal.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{proposal.proposalDate}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getTimeSlotName(proposal.currentTimeSlotId)} → {getTimeSlotName(proposal.proposedTimeSlotId)}
                        </div>
                        {proposal.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            理由: {proposal.reason}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      提案日時: {new Date(proposal.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 処理済みの変更提案 */}
        <Card>
          <CardHeader>
            <CardTitle>処理済み ({processedProposals.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            {processedProposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                処理済みの変更提案はありません
              </div>
            ) : (
              <div className="space-y-3">
                {processedProposals.map((proposal: any) => (
                  <div
                    key={proposal.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{proposal.proposalDate}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getTimeSlotName(proposal.currentTimeSlotId)} → {getTimeSlotName(proposal.proposedTimeSlotId)}
                        </div>
                        {proposal.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            理由: {proposal.reason}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      提案日時: {new Date(proposal.createdAt).toLocaleString("ja-JP")}
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
