import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  ChevronRight,
  Calendar,
  Users,
  Bell,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { useToast } from '../../hooks/useToast';
import { trpcClient } from '../../lib/trpc';
import { useAsync } from '../../hooks/useAsync';
import { LoadingInline } from '../ui/loading-spinner';

interface WorkflowDashboardProps {
  shiftId: number;
  onRefresh?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  'vacation_only': '希望休受付中',
  'draft': '下書き',
  'ai_generated': 'AI生成済み',
  'tentative': '仮確定',
  'tentative_revised': '仮確定改',
  'confirmed': '最終確定',
  'actual': '実績',
  'archived': 'アーカイブ済み'
};

const STATUS_COLORS: Record<string, string> = {
  'vacation_only': 'bg-gray-100 text-gray-700',
  'draft': 'bg-blue-100 text-blue-700',
  'ai_generated': 'bg-purple-100 text-purple-700',
  'tentative': 'bg-yellow-100 text-yellow-700',
  'tentative_revised': 'bg-orange-100 text-orange-700',
  'confirmed': 'bg-green-100 text-green-700',
  'actual': 'bg-indigo-100 text-indigo-700',
  'archived': 'bg-gray-100 text-gray-500'
};

export function WorkflowDashboard({ shiftId, onRefresh }: WorkflowDashboardProps) {
  const toast = useToast();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationType, setNotificationType] = useState<'status_change' | 'deadline_reminder' | 'feedback_request' | 'shift_published'>('status_change');
  const [notificationMessage, setNotificationMessage] = useState('');

  // ワークフローステータスを取得
  const {
    data: workflowStatus,
    isLoading,
    isError,
    error,
    refetch
  } = useAsync(
    async () => {
      return await trpcClient.workflow.getStatus.query({ shiftId });
    },
    {
      onError: (err) => toast.error('ワークフローステータスの取得に失敗しました'),
    },
    [shiftId]
  );

  // 定期的にステータスを更新
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [refetch]);

  // 通知送信
  const handleSendNotification = async () => {
    try {
      await trpcClient.workflow.sendBulkNotifications.mutate({
        shiftId,
        notificationType,
        message: notificationMessage || undefined,
      });

      toast.success('通知を送信しました');
      setShowNotificationDialog(false);
      setNotificationMessage('');
      refetch();
    } catch (error: any) {
      toast.error('通知の送信に失敗しました', {
        description: error.message
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <LoadingInline />
          <span className="ml-2">ワークフローステータスを読み込み中...</span>
        </div>
      </Card>
    );
  }

  if (isError || !workflowStatus) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ワークフローステータスを取得できませんでした
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const {
    currentStatus,
    progress,
    statistics,
    canTransitionTo,
    leaveRequestDeadline,
    additionalRequestDeadline,
    feedbackDeadline,
    tentativePublishedAt,
    confirmedAt
  } = workflowStatus;

  // 期限までの残り日数を計算
  const calculateDaysUntil = (deadline: string | null | undefined) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilLeaveDeadline = calculateDaysUntil(leaveRequestDeadline);
  const daysUntilFeedbackDeadline = calculateDaysUntil(feedbackDeadline);

  return (
    <div className="space-y-6">
      {/* メインステータスカード */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* ヘッダー */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">ワークフローステータス</h2>
              <p className="text-muted-foreground mt-1">
                現在のステータスと次のアクション
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                onRefresh?.();
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>

          {/* 現在のステータス表示 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-lg font-semibold ${STATUS_COLORS[currentStatus]}`}>
                  {STATUS_LABELS[currentStatus]}
                </div>
                {tentativePublishedAt && (
                  <Badge variant="secondary">
                    仮確定日: {new Date(tentativePublishedAt).toLocaleDateString('ja-JP')}
                  </Badge>
                )}
                {confirmedAt && (
                  <Badge variant="secondary">
                    確定日: {new Date(confirmedAt).toLocaleDateString('ja-JP')}
                  </Badge>
                )}
              </div>
            </div>

            {/* プログレスバー */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>進捗</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </div>

          {/* 次のアクション */}
          {canTransitionTo.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <ChevronRight className="h-5 w-5 mr-1" />
                次のアクション
              </h3>
              <div className="flex flex-wrap gap-2">
                {canTransitionTo.map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      // TODO: Implement transition
                      toast.info(`${STATUS_LABELS[status]}への移行機能は実装中です`);
                    }}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {STATUS_LABELS[status]}へ移行
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 統計情報カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 修正希望 */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">修正希望</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">
                  {statistics?.pendingModifications || 0}
                </span>
                <span className="text-sm text-muted-foreground">件</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>承認済: {statistics?.approvedModifications || 0}</span>
                <span>却下: {statistics?.rejectedModifications || 0}</span>
              </div>
            </div>
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
        </Card>

        {/* 通知 */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">通知</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">
                  {statistics?.unreadNotifications || 0}
                </span>
                <span className="text-sm text-muted-foreground">件未読</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                全{statistics?.totalNotifications || 0}件中
              </p>
            </div>
            <Bell className="h-5 w-5 text-purple-500" />
          </div>
        </Card>

        {/* ワークフロー履歴 */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ワークフロー履歴</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">
                  {statistics?.workflowSteps || 0}
                </span>
                <span className="text-sm text-muted-foreground">ステップ</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                記録済み
              </p>
            </div>
            <Clock className="h-5 w-5 text-green-500" />
          </div>
        </Card>
      </div>

      {/* 期限情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {daysUntilLeaveDeadline !== null && daysUntilLeaveDeadline >= 0 && (
          <Alert className={daysUntilLeaveDeadline <= 3 ? 'border-red-200' : ''}>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>希望休締切まで{daysUntilLeaveDeadline}日</strong>
              <br />
              {new Date(leaveRequestDeadline!).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </AlertDescription>
          </Alert>
        )}

        {daysUntilFeedbackDeadline !== null && daysUntilFeedbackDeadline >= 0 && (
          <Alert className={daysUntilFeedbackDeadline <= 3 ? 'border-red-200' : ''}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>フィードバック締切まで{daysUntilFeedbackDeadline}日</strong>
              <br />
              {new Date(feedbackDeadline!).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* アクションボタン */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setNotificationType('status_change');
              setShowNotificationDialog(true);
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            ステータス変更通知
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNotificationType('deadline_reminder');
              setShowNotificationDialog(true);
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            締切リマインダー送信
          </Button>

          {currentStatus === 'tentative' && (
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType('feedback_request');
                setShowNotificationDialog(true);
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              フィードバック依頼
            </Button>
          )}

          {currentStatus === 'confirmed' && (
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType('shift_published');
                setShowNotificationDialog(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              確定通知送信
            </Button>
          )}
        </div>
      </Card>

      {/* 通知送信ダイアログ */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>通知送信</DialogTitle>
            <DialogDescription>
              全職員に通知を送信します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">通知タイプ</label>
              <p className="text-sm text-muted-foreground mt-1">
                {notificationType === 'status_change' && 'ステータス変更通知'}
                {notificationType === 'deadline_reminder' && '締切リマインダー'}
                {notificationType === 'feedback_request' && 'フィードバック依頼'}
                {notificationType === 'shift_published' && 'シフト確定通知'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">追加メッセージ（任意）</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="追加のメッセージを入力..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSendNotification}>
              <Send className="h-4 w-4 mr-2" />
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}