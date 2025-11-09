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

export default function LeaveRequests() {
  const utils = trpc.useUtils();

  // 希望休一覧を取得
  const { data: leaveRequests, isLoading } = trpc.leaveRequests.list.useQuery();

  // 承認
  const approveMutation = trpc.leaveRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("希望休を承認しました");
      utils.leaveRequests.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("承認に失敗しました: " + error.message);
    },
  });

  // 却下
  const rejectMutation = trpc.leaveRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("希望休を却下しました");
      utils.leaveRequests.list.invalidate();
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
    return <div className="p-6">読み込み中...</div>;
  }

  const pendingRequests = leaveRequests?.filter((lr: any) => lr.status === "pending") || [];
  const processedRequests = leaveRequests?.filter((lr: any) => lr.status !== "pending") || [];

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">希望休管理</h1>
        <p className="text-muted-foreground">職員からの希望休申請を管理します</p>
      </div>

      {/* 申請中の希望休 */}
      <Card>
        <CardHeader>
          <CardTitle>申請中の希望休 ({pendingRequests.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              申請中の希望休はありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>職員ID</TableHead>
                  <TableHead>希望日</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeId}</TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.reason || "-"}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveMutation.mutate({ id: request.id })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: request.id })}
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

      {/* 処理済みの希望休 */}
      <Card>
        <CardHeader>
          <CardTitle>処理済みの希望休 ({processedRequests.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              処理済みの希望休はありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>職員ID</TableHead>
                  <TableHead>希望日</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>申請日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>処理日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeId}</TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.reason || "-"}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.updatedAt).toLocaleString("ja-JP")}</TableCell>
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
