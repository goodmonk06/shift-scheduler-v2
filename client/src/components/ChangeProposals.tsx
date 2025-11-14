import { useState, useMemo } from "react";
import { RefreshCw, Check, X, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from "../hooks/useToast";
import { useAsync, useMutation } from "../hooks/useAsync";
import { trpcClient } from "../lib/trpc";
import { LoadingInline } from "./ui/loading-spinner";
import { EmptyState } from "./ui/error-state";

type ProposalStatus = "pending" | "approved" | "rejected";

interface ChangeProposal {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  currentShift: string | null; // null = 休み
  proposedShift: string | null; // null = 休み
  reason: string;
  status: ProposalStatus;
  createdAt: string;
  processedAt?: string;
}

export function ChangeProposals() {
  const toast = useToast();

  // 次月の年月を計算
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthYear = nextMonth.getFullYear();
  const nextMonthNum = nextMonth.getMonth() + 1;

  // 現在のシフト情報を取得
  const {
    data: currentShift,
    isLoading: isLoadingShift,
  } = useAsync(
    async () => {
      return await trpcClient.shifts.getCurrentMonth.query({
        year: nextMonthYear,
        month: nextMonthNum
      });
    },
    {
      onError: (error) => {
        console.error("シフト情報の取得に失敗:", error);
      },
    }
  );

  // 変更提案データを取得
  const {
    data: changeProposalsData,
    isLoading: isLoadingProposals,
    isError: isProposalsError,
    error: proposalsError,
    refetch: refetchProposals,
  } = useAsync(
    async () => {
      if (!currentShift) return [];
      return await trpcClient.changeProposals.getByShift.query({ shiftId: currentShift.id });
    },
    {
      onError: () => toast.error("変更提案データの取得に失敗しました"),
      deps: [currentShift?.id],
    }
  );

  // 従業員データを取得
  const {
    data: employeesData,
    isLoading: isLoadingEmployees,
  } = useAsync(
    async () => {
      return await trpcClient.employees.list.query();
    },
    {
      onError: () => toast.error("従業員データの取得に失敗しました"),
    }
  );

  const employees = employeesData || [];
  const rawProposals = changeProposalsData || [];

  // DBデータをUIデータに変換
  const proposals = useMemo(() => {
    return rawProposals.map((p: any) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: employees.find((e) => e.id === p.employeeId)?.name || "不明",
      date: p.proposalDate,
      currentShift: p.currentTimeSlotId ? `タイムスロット${p.currentTimeSlotId}` : null,
      proposedShift: p.proposedTimeSlotId ? `タイムスロット${p.proposedTimeSlotId}` : null,
      reason: p.reason,
      status: p.status,
      createdAt: p.createdAt,
      processedAt: p.reviewedAt,
    }));
  }, [rawProposals, employees]);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ChangeProposal | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");

  // 承認ダイアログを開く
  const handleApproveClick = (proposal: ChangeProposal) => {
    setSelectedProposal(proposal);
    setActionType("approve");
    setActionDialogOpen(true);
  };

  // 却下ダイアログを開く
  const handleRejectClick = (proposal: ChangeProposal) => {
    setSelectedProposal(proposal);
    setActionType("reject");
    setActionDialogOpen(true);
  };

  // 承認または却下処理
  const { mutate: handleAction, isLoading: isProcessing } = useMutation(
    async () => {
      if (!selectedProposal) throw new Error("提案が選択されていません");

      if (actionType === "approve") {
        await trpcClient.changeProposals.approve.mutate({ id: selectedProposal.id });
      } else {
        await trpcClient.changeProposals.reject.mutate({ id: selectedProposal.id });
      }
    },
    {
      onSuccess: () => {
        toast.success(
          actionType === "approve"
            ? "変更提案を承認しました"
            : "変更提案を却下しました"
        );
        refetchProposals();
        setActionDialogOpen(false);
        setSelectedProposal(null);
      },
      onError: () => {
        toast.error(
          actionType === "approve"
            ? "承認に失敗しました"
            : "却下に失敗しました"
        );
      },
    }
  );

  // シフト表示（null = 休み）
  const formatShift = (shift: string | null) => {
    return shift || "休み";
  };

  // ステータスのラベル
  const getStatusLabel = (status: ProposalStatus) => {
    switch (status) {
      case "pending":
        return "申請中";
      case "approved":
        return "承認済";
      case "rejected":
        return "却下";
    }
  };

  // ステータスのバッジvariant
  const getStatusBadgeVariant = (status: ProposalStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
    }
  };

  // フィルター
  // ローディング中
  if (isLoadingShift || isLoadingProposals || isLoadingEmployees) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <LoadingInline message="読み込み中..." size="lg" />
          </div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (isProposalsError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto pt-20">
          <EmptyState
            type="network"
            error={proposalsError}
            onRetry={refetchProposals}
          />
        </div>
      </div>
    );
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const processedProposals = proposals.filter(
    (p) => p.status === "approved" || p.status === "rejected"
  );

  const renderProposalTable = (proposalsList: ChangeProposal[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>職員</TableHead>
          <TableHead>日付</TableHead>
          <TableHead>現在の勤務</TableHead>
          <TableHead>→</TableHead>
          <TableHead>提案する勤務</TableHead>
          <TableHead>理由</TableHead>
          <TableHead>申請日時</TableHead>
          {!showActions && <TableHead>ステータス</TableHead>}
          {!showActions && <TableHead>処理日時</TableHead>}
          {showActions && <TableHead className="text-right">操作</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {proposalsList.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 8 : 9}
              className="text-center py-8 text-muted-foreground"
            >
              {showActions ? "申請中の変更提案はありません" : "処理済みの変更提案はありません"}
            </TableCell>
          </TableRow>
        ) : (
          proposalsList.map((proposal) => (
            <TableRow key={proposal.id}>
              <TableCell>
                <div className="space-y-1">
                  <div>{proposal.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{proposal.employeeId}</div>
                </div>
              </TableCell>
              <TableCell>
                {new Date(proposal.date).toLocaleDateString("ja-JP")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatShift(proposal.currentShift)}</Badge>
              </TableCell>
              <TableCell>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatShift(proposal.proposedShift)}</Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="text-sm line-clamp-2">{proposal.reason}</div>
              </TableCell>
              <TableCell>
                {new Date(proposal.createdAt).toLocaleString("ja-JP")}
              </TableCell>
              {!showActions && (
                <>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(proposal.status)}>
                      {getStatusLabel(proposal.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {proposal.processedAt
                      ? new Date(proposal.processedAt).toLocaleString("ja-JP")
                      : "-"}
                  </TableCell>
                </>
              )}
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApproveClick(proposal)}
                      className="rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRejectClick(proposal)}
                      className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <RefreshCw className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl text-gray-900">変更提案管理</h1>
          <p className="text-sm text-muted-foreground">
            職員からのシフト変更提案を承認・却下します
          </p>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            申請中 ({pendingProposals.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            処理済み ({processedProposals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card className="rounded-2xl overflow-hidden">
            {renderProposalTable(pendingProposals, true)}
          </Card>
        </TabsContent>

        <TabsContent value="processed" className="mt-6">
          <Card className="rounded-2xl overflow-hidden">
            {renderProposalTable(processedProposals, false)}
          </Card>
        </TabsContent>
      </Tabs>

      {/* 承認・却下確認ダイアログ */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "変更提案を承認しますか？" : "変更提案を却下しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProposal && (
                <div className="space-y-2 mt-2">
                  <div>職員: {selectedProposal.employeeName}</div>
                  <div>日付: {new Date(selectedProposal.date).toLocaleDateString("ja-JP")}</div>
                  <div>
                    変更: {formatShift(selectedProposal.currentShift)} →{" "}
                    {formatShift(selectedProposal.proposedShift)}
                  </div>
                  <div className="text-sm">理由: {selectedProposal.reason}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction()}
              disabled={isProcessing}
              className={
                actionType === "approve"
                  ? "rounded-xl bg-green-600 hover:bg-green-700"
                  : "rounded-xl bg-red-600 hover:bg-red-700"
              }
            >
              {isProcessing ? (
                <LoadingInline message="処理中..." size="sm" />
              ) : (
                actionType === "approve" ? "承認" : "却下"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
