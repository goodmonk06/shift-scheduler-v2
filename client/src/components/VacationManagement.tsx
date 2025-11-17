import { useState, useMemo } from "react";
import { Clock, Check, X, Sparkles, Settings, Users, CheckCheck } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { VacationRequestCard } from "./VacationRequestCard";
import { leaveRequestService, type SubmissionStatus, type LeaveRequest } from "../services/leaveRequestService";
import { formatDeadline } from "../utils/vacationManagementHelpers";
import { StatsCards } from "./vacation/StatsCards";
import { RequestDetailDialog } from "./vacation/RequestDetailDialog";
import { DeadlineSettingDialog } from "./vacation/DeadlineSettingDialog";
import { SubmissionStatusDialog } from "./vacation/SubmissionStatusDialog";
import { useAsync, useMutation } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { LoadingInline } from "./ui/loading-spinner";
import { EmptyState, ErrorState } from "./ui/error-state";
import { trpcClient } from "../lib/trpc";

export function VacationManagement() {
  const toast = useToast();
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showSubmissionStatusDialog, setShowSubmissionStatusDialog] = useState(false);
  const [tempDeadlineDate, setTempDeadlineDate] = useState("");
  const [tempDeadlineTime, setTempDeadlineTime] = useState("");
  const [showAdditionalOnly, setShowAdditionalOnly] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);

  // 次月の年月を計算
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthYear = nextMonth.getFullYear();
  const nextMonthNum = nextMonth.getMonth() + 1;

  // 現在のシフト情報を取得
  const {
    data: currentShift,
    isLoading: isLoadingShift,
    isError: isShiftError,
    error: shiftError,
    refetch: refetchShift,
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

  const currentShiftId = currentShift?.id || 1;
  const deadline = currentShift?.leaveRequestDeadline
    ? new Date(currentShift.leaveRequestDeadline)
    : new Date(nextMonthYear, nextMonthNum - 1, 20, 23, 59);

  // 希望休データを取得 - 全データを取得して12月でフィルタ
  const {
    data: leaveRequestsData,
    isLoading: isLoadingRequests,
    isError: isRequestsError,
    error: requestsError,
    refetch: refetchRequests,
  } = useAsync(
    async () => {
      // 全ての希望休を取得
      const allRequests = await leaveRequestService.getAll();
      // 12月のデータのみフィルタ
      return allRequests.filter(req => {
        const date = new Date(req.startDate);
        return date.getFullYear() === nextMonthYear && (date.getMonth() + 1) === nextMonthNum;
      });
    },
    {
      onError: () => toast.error("希望休データの取得に失敗しました"),
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

  // LeaveRequestを職員ごとにグループ化してVacationRequest形式に変換
  const vacationRequests = useMemo(() => {
    if (!leaveRequestsData || !employees.length) return [];

    const grouped = new Map<number, LeaveRequest[]>();

    leaveRequestsData.forEach((req) => {
      if (!grouped.has(req.employeeId)) {
        grouped.set(req.employeeId, []);
      }
      grouped.get(req.employeeId)!.push(req);
    });

    return Array.from(grouped.entries()).map(([employeeId, requests]) => {
      const employee = employees.find((e) => e.id === employeeId);
      const firstRequest = requests[0];
      const startDate = new Date(firstRequest.startDate);

      return {
        id: employeeId, // 職員IDを使用
        staffName: employee?.name || "不明",
        staffId: String(employeeId),
        month: `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`,
        requests: requests.map((req) => ({
          day: new Date(req.startDate).getDate(),
          type: req.leaveType,
          startTime: req.startTime ?? undefined,
          endTime: req.endTime ?? undefined,
          reason: req.reason ?? undefined,
        })),
        status: firstRequest.status,
        submittedAt: new Date(firstRequest.submittedAt),
        rawData: requests, // デバッグ用に元データも保持
      };
    });
  }, [leaveRequestsData, employees]);

  // 希望休をステータスごとにフィルタリング
  const pendingRequests = vacationRequests.filter((req) => req.status === "pending");
  const approvedRequests = vacationRequests.filter((req) => req.status === "approved");
  const rejectedRequests = vacationRequests.filter((req) => req.status === "rejected");

  // 追加希望のみフィルタ（元データがisAdditional=trueのもの）
  const additionalRequests = vacationRequests.filter((req) =>
    (req as any).rawData?.some((r: LeaveRequest) => r.isAdditional === true)
  );

  // 承認・却下のミューテーション
  const { mutate: approveRequestMutation, isLoading: isApproving } = useMutation(
    async (id: number) => {
      await leaveRequestService.approve(id);
    },
    {
      onSuccess: () => {
        toast.success("希望休を承認しました");
        refetchRequests();
        setShowDetailDialog(false);
      },
      onError: () => toast.error("承認に失敗しました"),
    }
  );

  const { mutate: rejectRequestMutation, isLoading: isRejecting } = useMutation(
    async (id: number) => {
      await leaveRequestService.reject(id);
    },
    {
      onSuccess: () => {
        toast.success("希望休を却下しました");
        refetchRequests();
        setShowDetailDialog(false);
      },
      onError: () => toast.error("却下に失敗しました"),
    }
  );

  const handleApprove = (id: string) => {
    // 職員IDに対応する全てのLeaveRequestを承認（締め切り前でも可能）
    const selectedVacationRequest = vacationRequests.find((req) => String(req.id) === String(id));
    if (selectedVacationRequest && (selectedVacationRequest as any).rawData) {
      const leaveRequests = (selectedVacationRequest as any).rawData as LeaveRequest[];
      // 全てのLeaveRequestを承認
      Promise.all(leaveRequests.map((req) => leaveRequestService.approve(req.id)))
        .then(() => {
          toast.success("希望休を承認しました");
          refetchRequests();
          setShowDetailDialog(false);
        })
        .catch((error) => {
          console.error("Approval error:", error);
          toast.error("承認に失敗しました");
        });
    } else {
      console.error("Request not found for id:", id, "Available requests:", vacationRequests);
      toast.error("希望休が見つかりませんでした");
    }
  };

  const handleReject = (id: string) => {
    // 職員IDに対応する全てのLeaveRequestを却下（締め切り前でも可能）
    const selectedVacationRequest = vacationRequests.find((req) => String(req.id) === String(id));
    if (selectedVacationRequest && (selectedVacationRequest as any).rawData) {
      const leaveRequests = (selectedVacationRequest as any).rawData as LeaveRequest[];
      // 全てのLeaveRequestを却下
      Promise.all(leaveRequests.map((req) => leaveRequestService.reject(req.id)))
        .then(() => {
          toast.success("希望休を却下しました");
          refetchRequests();
          setShowDetailDialog(false);
        })
        .catch((error) => {
          console.error("Rejection error:", error);
          toast.error("却下に失敗しました");
        });
    } else {
      console.error("Request not found for id:", id, "Available requests:", vacationRequests);
      toast.error("希望休が見つかりませんでした");
    }
  };

  const openDetail = (id: number) => {
    setSelectedRequest(id);
    setShowDetailDialog(true);
  };

  const selectedRequestData = vacationRequests.find((req) => req.id === selectedRequest);

  const openDeadlineDialog = () => {
    // deadline が undefined の場合はデフォルト値を使用
    const currentDeadline = deadline || new Date(2025, 10, 15, 23, 59, 59);
    const dateStr = currentDeadline.toISOString().split('T')[0];
    const timeStr = `${currentDeadline.getHours().toString().padStart(2, '0')}:${currentDeadline.getMinutes().toString().padStart(2, '0')}`;
    setTempDeadlineDate(dateStr);
    setTempDeadlineTime(timeStr);
    setShowDeadlineDialog(true);
  };

  const { mutate: saveDeadline, isLoading: isSavingDeadline } = useMutation(
    async () => {
      if (!tempDeadlineDate || !tempDeadlineTime) {
        throw new Error("日付と時刻を入力してください");
      }

      const [hours, minutes] = tempDeadlineTime.split(':');
      const newDeadline = new Date(tempDeadlineDate);
      newDeadline.setHours(parseInt(hours), parseInt(minutes), 59);

      if (!currentShift) {
        throw new Error("シフトが見つかりません");
      }

      // シフトの締切日を更新
      await trpcClient.shifts.update.mutate({
        id: currentShift.id,
        leaveRequestDeadline: newDeadline.toISOString(),
      });

      return newDeadline;
    },
    {
      onSuccess: (newDeadline) => {
        setShowDeadlineDialog(false);
        refetchShift();
        toast.success("締切日を更新しました", {
          description: newDeadline.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      },
      onError: (error: Error) => {
        toast.error(error.message || "締切日の更新に失敗しました");
      },
    }
  );

  const handleSaveDeadline = () => {
    saveDeadline();
  };


  // 提出状況を取得 - useMutationに移行
  const { mutate: loadSubmissionStatus, isLoading: isLoadingStatus } = useMutation(
    async () => {
      const status = await leaveRequestService.getSubmissionStatus(currentShiftId);
      setSubmissionStatus(status);
      setShowSubmissionStatusDialog(true);
      return status;
    },
    {
      onError: () => toast.error("提出状況の取得に失敗しました"),
    }
  );

  // 一括承認 - 締め切り前でも可能
  const { mutate: handleBulkApproval, isLoading: isBulkApproving } = useMutation(
    async () => {
      if (pendingRequests.length === 0) {
        throw new Error("承認待ちの申請がありません");
      }

      const result = await leaveRequestService.approveAllForShift(currentShiftId);
      return result;
    },
    {
      onSuccess: (result) => {
        toast.success(`${result.approved}件の希望休を承認しました`, {
          description: `全${result.total}件中、承認待ちの${result.approved}件を承認しました`,
        });
        // データを再取得
        refetchRequests();
      },
      onError: (error: Error) => {
        if (error.message === "承認待ちの申請がありません") {
          toast.info(error.message);
        } else {
          toast.error("一括承認に失敗しました");
        }
      },
    }
  );

  // ローディング中
  if (isLoadingShift || isLoadingRequests || isLoadingEmployees) {
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
  if (isRequestsError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto pt-20">
          <ErrorState
            type="network"
            error={requestsError}
            onRetry={refetchRequests}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2">
              希望休管理
              <Sparkles className="w-7 h-7 text-accent" />
            </h1>
            <p className="text-muted-foreground">職員からの希望休申請を確認・承認</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => loadSubmissionStatus()}
              variant="outline"
              className="rounded-xl border-2 bg-gradient-to-br from-blue-500/5 to-blue-500/5 hover:from-blue-500/10 hover:to-blue-500/10"
              disabled={isLoadingStatus}
            >
              {isLoadingStatus ? (
                <LoadingInline message="読み込み中..." size="sm" />
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  提出状況
                </>
              )}
            </Button>
            <Button
              onClick={() => handleBulkApproval()}
              variant="outline"
              className="rounded-xl border-2 bg-gradient-to-br from-success/5 to-success/5 hover:from-success/10 hover:to-success/10"
              disabled={isBulkApproving}
            >
              {isBulkApproving ? (
                <LoadingInline message="承認中..." size="sm" />
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  一括承認（締切前でも可能）
                </>
              )}
            </Button>
            <Button
              onClick={openDeadlineDialog}
              variant="outline"
              className="rounded-xl border-2 bg-gradient-to-br from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              締切設定
            </Button>
          </div>
        </div>

        {/* Deadline Info */}
        <Card className="p-5 bg-gradient-to-br from-primary/10 to-secondary/5 border-2 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="text-3xl">⏰</div>
            <div className="flex-1">
              <h4 className="flex items-center gap-2">
                申請締切日
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {new Date() < deadline ? '受付中' : '締切済'}
                </Badge>
              </h4>
              <p className="text-muted-foreground">
                {formatDeadline(deadline)}まで
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={openDeadlineDialog}
              className="rounded-xl"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <StatsCards
          pendingCount={pendingRequests.length}
          approvedCount={approvedRequests.length}
          rejectedCount={rejectedRequests.length}
          additionalCount={additionalRequests.length}
        />

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              未承認 ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              承認済 ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <X className="w-4 h-4" />
              却下 ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-muted-foreground">未承認の申請はありません</h3>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((request) => (
                  <VacationRequestCard key={request.id} request={request} onClick={openDetail} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-muted-foreground">承認済の申請はありません</h3>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedRequests.map((request) => (
                  <VacationRequestCard key={request.id} request={request} onClick={openDetail} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">🗑️</div>
                <h3 className="text-muted-foreground">却下した申請はありません</h3>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rejectedRequests.map((request) => (
                  <VacationRequestCard key={request.id} request={request} onClick={openDetail} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <RequestDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        request={selectedRequestData || null}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Deadline Setting Dialog */}
      <DeadlineSettingDialog
        open={showDeadlineDialog}
        onOpenChange={setShowDeadlineDialog}
        tempDate={tempDeadlineDate}
        tempTime={tempDeadlineTime}
        onDateChange={setTempDeadlineDate}
        onTimeChange={setTempDeadlineTime}
        onSave={handleSaveDeadline}
      />

      {/* Submission Status Dialog */}
      <SubmissionStatusDialog
        open={showSubmissionStatusDialog}
        onOpenChange={setShowSubmissionStatusDialog}
        status={submissionStatus}
      />
    </div>
  );
}
