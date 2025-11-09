import { useState } from "react";
import { Clock, Check, X, Sparkles, Settings, Users, CheckCheck } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { VacationRequestCard } from "./VacationRequestCard";
import { useVacation } from "../contexts/VacationContext";
import { toast } from "sonner";
import { leaveRequestService, type SubmissionStatus } from "../services/leaveRequestService";
import { formatDeadline } from "../utils/vacationManagementHelpers";
import { StatsCards } from "./vacation/StatsCards";
import { RequestDetailDialog } from "./vacation/RequestDetailDialog";
import { DeadlineSettingDialog } from "./vacation/DeadlineSettingDialog";
import { SubmissionStatusDialog } from "./vacation/SubmissionStatusDialog";

export function VacationManagement() {
  const { vacationRequests, approveRequest, rejectRequest, deadline, setDeadline } = useVacation();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showSubmissionStatusDialog, setShowSubmissionStatusDialog] = useState(false);
  const [tempDeadlineDate, setTempDeadlineDate] = useState("");
  const [tempDeadlineTime, setTempDeadlineTime] = useState("");
  const [showAdditionalOnly, setShowAdditionalOnly] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // 現在のシフトIDを取得（仮で1を使用、実際にはpropsやcontextから取得）
  const currentShiftId = 1;

  // TODO: バックエンドのデータに isAdditionalRequest フラグを追加する必要がある
  const pendingRequests = vacationRequests.filter((req) => req.status === "pending");
  const approvedRequests = vacationRequests.filter((req) => req.status === "approved");
  const rejectedRequests = vacationRequests.filter((req) => req.status === "rejected");
  
  // 追加希望のみフィルタ（将来的にバックエンドから取得）
  const additionalRequests = vacationRequests.filter((req) => {
    // TODO: req.isAdditionalRequest でフィルタ
    return false; // 現在は追加希望データがないため空配列
  });

  const handleApprove = (id: string) => {
    approveRequest(id);
    setShowDetailDialog(false);
  };

  const handleReject = (id: string) => {
    rejectRequest(id);
    setShowDetailDialog(false);
  };

  const openDetail = (id: string) => {
    setSelectedRequest(id);
    setShowDetailDialog(true);
  };

  const selectedRequestData = vacationRequests.find((req) => req.id === selectedRequest);

  const openDeadlineDialog = () => {
    const dateStr = deadline.toISOString().split('T')[0];
    const timeStr = `${deadline.getHours().toString().padStart(2, '0')}:${deadline.getMinutes().toString().padStart(2, '0')}`;
    setTempDeadlineDate(dateStr);
    setTempDeadlineTime(timeStr);
    setShowDeadlineDialog(true);
  };

  const handleSaveDeadline = () => {
    if (!tempDeadlineDate || !tempDeadlineTime) {
      toast.error("日付と時刻を入力してください");
      return;
    }

    const [hours, minutes] = tempDeadlineTime.split(':');
    const newDeadline = new Date(tempDeadlineDate);
    newDeadline.setHours(parseInt(hours), parseInt(minutes), 59);
    
    setDeadline(newDeadline);
    setShowDeadlineDialog(false);
    
    toast.success("締切日を更新しました", {
      description: newDeadline.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };


  // 提出状況を取得
  const loadSubmissionStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const status = await leaveRequestService.getSubmissionStatus(currentShiftId);
      setSubmissionStatus(status);
      setShowSubmissionStatusDialog(true);
    } catch (error) {
      console.error("提出状況の取得に失敗しました:", error);
      toast.error("提出状況の取得に失敗しました");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // 一括承認
  const handleBulkApproval = async () => {
    if (new Date() < deadline) {
      toast.error("締切前は一括承認できません", {
        description: "締切後に実行してください",
      });
      return;
    }

    if (pendingRequests.length === 0) {
      toast.info("承認待ちの申請がありません");
      return;
    }

    try {
      setIsApproving(true);
      const result = await leaveRequestService.approveAllForShift(currentShiftId);

      toast.success(`${result.approved}件の希望休を承認しました`, {
        description: `全${result.total}件中、承認待ちの${result.approved}件を承認しました`,
      });

      // ページをリロードして最新データを取得
      window.location.reload();
    } catch (error) {
      console.error("一括承認に失敗しました:", error);
      toast.error("一括承認に失敗しました");
    } finally {
      setIsApproving(false);
    }
  };

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
              onClick={loadSubmissionStatus}
              variant="outline"
              className="rounded-xl border-2 bg-gradient-to-br from-blue-500/5 to-blue-500/5 hover:from-blue-500/10 hover:to-blue-500/10"
              disabled={isLoadingStatus}
            >
              <Users className="w-4 h-4 mr-2" />
              {isLoadingStatus ? "読み込み中..." : "提出状況"}
            </Button>
            <Button
              onClick={handleBulkApproval}
              variant="outline"
              className="rounded-xl border-2 bg-gradient-to-br from-success/5 to-success/5 hover:from-success/10 hover:to-success/10"
              disabled={isApproving || new Date() < deadline}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {isApproving ? "承認中..." : "一括承認"}
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
                {formatDeadline()}まで
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
