import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ChangeProposals() {
  const utils = trpc.useUtils();

  // 変更提案一覧を取得
  const { data: changeProposals, isLoading } = trpc.changeProposals.list.useQuery();

  // 承認
  const approveMutation = trpc.changeProposals.approve.useMutation({
    onSuccess: () => {
      toast.success("変更提案を承認しました");
      utils.changeProposals.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("承認に失敗しました: " + error.message);
    },
  });

  // 却下
  const rejectMutation = trpc.changeProposals.reject.useMutation({
    onSuccess: () => {
      toast.success("変更提案を却下しました");
      utils.changeProposals.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("却下に失敗しました: " + error.message);
    },
  });

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
      <DashboardLayout>
        <div>読み込み中...</div>
      </DashboardLayout>
    );
  }

  const pendingProposals = changeProposals?.filter((cp: any) => cp.status === "pending") || [];
  const processedProposals = changeProposals?.filter((cp: any) => cp.status !== "pending") || [];

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">変更提案管理</h1>
        <p className="text-muted-foreground">職員からのシフト変更提案を管理します</p>
      </div>

      {/* 申請中の変更提案 */}
      <Card>
        <CardHeader>
          <CardTitle>申請中の変更提案 ({pendingProposals.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              申請中の変更提案はありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>職員ID</TableHead>
                  <TableHead>提案日</TableHead>
                  <TableHead>現在の勤務</TableHead>
                  <TableHead>提案する勤務</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingProposals.map((proposal: any) => (
                  <TableRow key={proposal.id}>
                    <TableCell>{proposal.employeeId}</TableCell>
                    <TableCell>{proposal.proposalDate}</TableCell>
                    <TableCell>{proposal.currentTimeSlotId || "休み"}</TableCell>
                    <TableCell>{proposal.proposedTimeSlotId || "休み"}</TableCell>
                    <TableCell>{proposal.reason}</TableCell>
                    <TableCell>{new Date(proposal.createdAt).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveMutation.mutate({ id: proposal.id })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: proposal.id })}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        却下
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 処理済みの変更提案 */}
      <Card>
        <CardHeader>
          <CardTitle>処理済みの変更提案 ({processedProposals.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {processedProposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              処理済みの変更提案はありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>職員ID</TableHead>
                  <TableHead>提案日</TableHead>
                  <TableHead>現在の勤務</TableHead>
                  <TableHead>提案する勤務</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>処理日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedProposals.map((proposal: any) => (
                  <TableRow key={proposal.id}>
                    <TableCell>{proposal.employeeId}</TableCell>
                    <TableCell>{proposal.proposalDate}</TableCell>
                    <TableCell>{proposal.currentTimeSlotId || "休み"}</TableCell>
                    <TableCell>{proposal.proposedTimeSlotId || "提案する勤務"}</TableCell>
                    <TableCell>{proposal.reason}</TableCell>
                    <TableCell>{new Date(proposal.createdAt).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell>{proposal.reviewedAt ? new Date(proposal.reviewedAt).toLocaleString("ja-JP") : "-"}</TableCell>
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
