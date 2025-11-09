import { useState, useEffect } from "react";
import { Calendar, Clock, Check, X, User, Filter, Sparkles, Settings, Users, CheckCheck, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useVacation } from "../contexts/VacationContext";
import { toast } from "sonner";
import { leaveRequestService, type SubmissionStatus } from "../services/leaveRequestService";

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

  const getTypeConfig = (type: "休" | "有休" | "時間指定") => {
    const configs = {
      "休": { emoji: "🌸", color: "bg-success/10 text-success border-success/20", label: "休" },
      "有休": { emoji: "💐", color: "bg-secondary/10 text-primary border-secondary/20", label: "有休" },
      "時間指定": { emoji: "⏰", color: "bg-warning/10 text-warning border-warning/20", label: "時間指定" },
    };
    return configs[type];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const RequestCard = ({ request }: { request: typeof vacationRequests[0] }) => {
    const statusConfig = {
      pending: { label: "未承認", color: "bg-warning", icon: Clock },
      approved: { label: "承認済", color: "bg-success", icon: Check },
      rejected: { label: "却下", color: "bg-destructive", icon: X },
    };

    const config = statusConfig[request.status];
    const StatusIcon = config.icon;

    return (
      <Card
        className="p-5 hover:shadow-lg transition-all cursor-pointer border-2"
        onClick={() => openDetail(request.id)}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="bg-gradient-to-br from-primary/20 to-secondary/20">
                <AvatarFallback className="text-primary">
                  {request.staffName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4>{request.staffName}</h4>
                <p className="text-muted-foreground">{request.month}</p>
              </div>
            </div>
            <Badge className={`${config.color} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </Badge>
          </div>

          {/* Request Summary */}
          <div className="flex flex-wrap gap-2">
            {request.requests.slice(0, 3).map((req, index) => {
              const typeConfig = getTypeConfig(req.type);
              const monthPart = request.month.split("年")[1]?.replace("月", "/") || "";
              return (
                <Badge
                  key={index}
                  variant="outline"
                  className={`${typeConfig.color} border-2`}
                >
                  <span className="mr-1">{typeConfig.emoji}</span>
                  {monthPart}
                  {req.day}
                  {req.type === "時間指定" && ` ${req.startTime}~`}
                </Badge>
              );
            })}
            {request.requests.length > 3 && (
              <Badge variant="outline" className="border-2">
                他 {request.requests.length - 3}件
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(request.submittedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-accent" />
              {request.requests.length}件の申請
            </span>
          </div>
        </div>
      </Card>
    );
  };

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

  const formatDeadline = () => {
    return deadline.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">未承認</p>
                <h2 className="text-warning">{pendingRequests.length}件</h2>
              </div>
              <div className="bg-warning/20 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">承認済</p>
                <h2 className="text-success">{approvedRequests.length}件</h2>
              </div>
              <div className="bg-success/20 p-3 rounded-xl">
                <Check className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">却下</p>
                <h2 className="text-destructive">{rejectedRequests.length}件</h2>
              </div>
              <div className="bg-destructive/20 p-3 rounded-xl">
                <X className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">追加希望</p>
                <h2 className="text-blue-700">{additionalRequests.length}件</h2>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

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
                  <RequestCard key={request.id} request={request} />
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
                  <RequestCard key={request.id} request={request} />
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
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl rounded-3xl border-2 border-secondary/30" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {selectedRequestData?.staffName}さんの希望休申請
              <Sparkles className="w-5 h-5 text-accent ml-auto" />
            </DialogTitle>
          </DialogHeader>

          {selectedRequestData && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-gradient-to-br from-primary/20 to-secondary/20 w-12 h-12">
                    <AvatarFallback className="text-primary">
                      {selectedRequestData.staffName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4>{selectedRequestData.staffName}</h4>
                    <p className="text-muted-foreground">{selectedRequestData.month}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">申請日時</p>
                  <span>{formatDate(selectedRequestData.submittedAt)}</span>
                </div>
              </div>

              {/* Requests List */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  申請内容 ({selectedRequestData.requests.length}件)
                </h4>
                <div className="space-y-2">
                  {selectedRequestData.requests.map((req, index) => {
                    const typeConfig = getTypeConfig(req.type);
                    const monthPart = selectedRequestData.month.split("年")[1]?.replace("月", "/") || "";
                    return (
                      <Card key={index} className="p-4 bg-gradient-to-br from-card to-secondary/5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{typeConfig.emoji}</div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span>
                                  {monthPart}
                                  {req.day}日
                                </span>
                                <Badge variant="outline" className={`${typeConfig.color} border-2`}>
                                  {typeConfig.label}
                                </Badge>
                              </div>
                              {req.type === "時間指定" && req.startTime && req.endTime && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {req.startTime} - {req.endTime}
                                </p>
                              )}
                              {req.reason && (
                                <p className="text-muted-foreground">
                                  💭 {req.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedRequestData?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedRequestData.id)}
                  className="rounded-xl border-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  却下する
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequestData.id)}
                  className="rounded-xl bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  承認する
                </Button>
              </>
            )}
            {selectedRequestData?.status !== "pending" && (
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
                className="rounded-xl border-2"
              >
                閉じる
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline Setting Dialog */}
      <Dialog open={showDeadlineDialog} onOpenChange={setShowDeadlineDialog}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-secondary/30" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              希望休申請の締切設定
              <Sparkles className="w-5 h-5 text-accent ml-auto" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30">
              <div className="flex gap-3">
                <div className="text-2xl">💡</div>
                <div className="space-y-1">
                  <h4>締切日について</h4>
                  <p className="text-muted-foreground">
                    この日時を過ぎると、職員は希望休の申請・変更ができなくなります。
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="deadline-date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  締切日
                </Label>
                <Input
                  id="deadline-date"
                  type="date"
                  value={tempDeadlineDate}
                  onChange={(e) => setTempDeadlineDate(e.target.value)}
                  className="rounded-xl border-2 h-12"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="deadline-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  締切時刻
                </Label>
                <Input
                  id="deadline-time"
                  type="time"
                  value={tempDeadlineTime}
                  onChange={(e) => setTempDeadlineTime(e.target.value)}
                  className="rounded-xl border-2 h-12"
                />
              </div>
            </div>

            {/* Preview */}
            {tempDeadlineDate && tempDeadlineTime && (
              <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/5 border-2 border-primary/20">
                <div className="space-y-2">
                  <p className="text-muted-foreground">設定後の締切日時</p>
                  <h4>
                    {new Date(`${tempDeadlineDate}T${tempDeadlineTime}`).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </h4>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeadlineDialog(false)}
              className="rounded-xl border-2"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSaveDeadline}
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg"
              disabled={!tempDeadlineDate || !tempDeadlineTime}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              設定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Status Dialog */}
      <Dialog open={showSubmissionStatusDialog} onOpenChange={setShowSubmissionStatusDialog}>
        <DialogContent className="max-w-2xl rounded-3xl border-2 border-secondary/30 max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              希望休提出状況
              <Sparkles className="w-5 h-5 text-accent ml-auto" />
            </DialogTitle>
          </DialogHeader>

          {submissionStatus && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">提出済</p>
                    <h3 className="text-success">
                      {submissionStatus.submitted} / {submissionStatus.total}名
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ({Math.round((submissionStatus.submitted / submissionStatus.total) * 100)}%)
                    </p>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">未提出</p>
                    <h3 className="text-warning">
                      {submissionStatus.notSubmitted.length}名
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ({Math.round((submissionStatus.notSubmitted.length / submissionStatus.total) * 100)}%)
                    </p>
                  </div>
                </Card>
              </div>

              {/* Not Submitted List */}
              {submissionStatus.notSubmitted.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    未提出の職員 ({submissionStatus.notSubmitted.length}名)
                  </h4>
                  <div className="space-y-2">
                    {submissionStatus.notSubmitted.map((employee) => (
                      <Card key={employee.id} className="p-4 bg-gradient-to-br from-warning/5 to-warning/5 border-warning/10">
                        <div className="flex items-center gap-3">
                          <Avatar className="bg-gradient-to-br from-warning/20 to-warning/30">
                            <AvatarFallback className="text-warning">
                              {employee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="text-sm">{employee.name}</h4>
                            <p className="text-xs text-muted-foreground">{employee.email}</p>
                          </div>
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            未提出
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="text-muted-foreground">全員提出済みです！</h3>
                </Card>
              )}

              {/* Approval Status */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">承認待ち</p>
                    <h3 className="text-blue-700">{submissionStatus.pendingApproval}件</h3>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">承認済</p>
                    <h3 className="text-success">{submissionStatus.approved}件</h3>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 bg-background border-t pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSubmissionStatusDialog(false)}
              className="rounded-xl border-2"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
