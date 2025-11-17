import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Calendar,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../ui/collapsible';
import { trpcClient } from '../../lib/trpc';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';

interface WorkflowStatusBadgeProps {
  shiftId: number;
  employeeId: number;
  onModificationRequest?: () => void;
}

const STATUS_CONFIG = {
  'vacation_only': {
    label: '希望休受付中',
    color: 'bg-gray-100 text-gray-700',
    icon: Calendar,
    description: '希望休の入力期間中です'
  },
  'draft': {
    label: '下書き',
    color: 'bg-blue-100 text-blue-700',
    icon: FileText,
    description: 'シフト作成の準備中です'
  },
  'ai_generated': {
    label: 'AI生成済み',
    color: 'bg-purple-100 text-purple-700',
    icon: Clock,
    description: 'AIによってシフトが自動生成されました'
  },
  'tentative': {
    label: '仮確定',
    color: 'bg-yellow-100 text-yellow-700',
    icon: AlertTriangle,
    description: '仮確定シフトが公開されました。修正希望を受け付けています'
  },
  'tentative_revised': {
    label: '仮確定改',
    color: 'bg-orange-100 text-orange-700',
    icon: AlertTriangle,
    description: '修正希望を反映したシフトです'
  },
  'confirmed': {
    label: '最終確定',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    description: '最終確定されたシフトです'
  },
  'actual': {
    label: '実績',
    color: 'bg-indigo-100 text-indigo-700',
    icon: CheckCircle,
    description: '実際の勤務実績です'
  },
  'archived': {
    label: 'アーカイブ',
    color: 'bg-gray-100 text-gray-500',
    icon: FileText,
    description: '過去のシフトデータです'
  }
};

export function WorkflowStatusBadge({
  shiftId,
  employeeId,
  onModificationRequest
}: WorkflowStatusBadgeProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // ワークフローステータスを取得
  const {
    data: status,
    isLoading,
    isError,
    refetch
  } = useAsync(
    async () => {
      return await trpcClient.workflow.getStatus.query({ shiftId });
    },
    {
      onError: () => toast.error('ワークフローステータスの取得に失敗しました')
    },
    [shiftId]
  );

  // 定期的にステータスを更新
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60000); // 1分ごと

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading || isError || !status) {
    return null;
  }

  const config = STATUS_CONFIG[status.currentStatus as keyof typeof STATUS_CONFIG];
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  // 期限までの残り日数を計算
  const calculateDaysUntil = (deadline: string | null | undefined) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilLeaveDeadline = calculateDaysUntil(status.leaveRequestDeadline);
  const daysUntilFeedbackDeadline = calculateDaysUntil(status.feedbackDeadline);

  const showModificationButton =
    status.currentStatus === 'tentative' ||
    status.currentStatus === 'tentative_revised';

  return (
    <Card className="p-4 bg-gradient-to-r from-white to-secondary/5 border-2 border-secondary/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">ワークフローステータス</span>
                  <Badge className={config.color}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* 進捗バー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>進捗</span>
              <span>{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
          </div>

          {/* 期限情報 */}
          <div className="space-y-2">
            {daysUntilLeaveDeadline !== null && daysUntilLeaveDeadline >= 0 && (
              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                daysUntilLeaveDeadline <= 3 ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  希望休締切まで<span className="font-semibold">{daysUntilLeaveDeadline}日</span>
                </span>
              </div>
            )}

            {daysUntilFeedbackDeadline !== null && daysUntilFeedbackDeadline >= 0 && (
              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                daysUntilFeedbackDeadline <= 3 ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">
                  フィードバック締切まで<span className="font-semibold">{daysUntilFeedbackDeadline}日</span>
                </span>
              </div>
            )}
          </div>

          {/* 統計情報 */}
          {status.statistics && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-muted-foreground">修正希望</div>
                <div className="font-semibold">
                  {status.statistics.pendingModifications || 0}件待機中
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <div className="text-muted-foreground">通知</div>
                <div className="font-semibold">
                  {status.statistics.unreadNotifications || 0}件未読
                </div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          {showModificationButton && onModificationRequest && (
            <Button
              onClick={onModificationRequest}
              className="w-full"
              variant="outline"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              修正希望を提出
            </Button>
          )}

          {/* ステータス更新日時 */}
          {status.tentativePublishedAt && (
            <div className="text-xs text-muted-foreground text-center">
              仮確定日: {new Date(status.tentativePublishedAt).toLocaleDateString('ja-JP')}
            </div>
          )}
          {status.confirmedAt && (
            <div className="text-xs text-muted-foreground text-center">
              確定日: {new Date(status.confirmedAt).toLocaleDateString('ja-JP')}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}