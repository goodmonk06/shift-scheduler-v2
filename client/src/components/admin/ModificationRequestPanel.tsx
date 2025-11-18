import { useState, useMemo } from 'react';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  ArrowRight,
  Filter,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useToast } from '../../hooks/useToast';
import { trpcClient } from '../../lib/trpc';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { LoadingInline } from '../ui/loading-spinner';
import { EmptyState } from '../ui/error-state';

interface ModificationRequestPanelProps {
  shiftId: number;
  shiftYear: number;
  shiftMonth: number;
}

interface ModificationRequest {
  id: number;
  employeeId: number;
  requestDate: string;
  requestType: 'swap' | 'off' | 'time_change';
  currentAssignment?: string;
  requestedAssignment?: string;
  swapTargetEmployeeId?: number;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
  processedAt?: string;
  processingComment?: string;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-100 text-gray-700' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高', color: 'bg-red-100 text-red-700' }
};

const REQUEST_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  swap: { label: '交換', icon: '🔄', color: 'text-blue-600' },
  off: { label: '休希望', icon: '🏖️', color: 'text-green-600' },
  time_change: { label: '時間変更', icon: '⏰', color: 'text-orange-600' }
};

export function ModificationRequestPanel({ shiftId, shiftYear, shiftMonth }: ModificationRequestPanelProps) {
  const toast = useToast();
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [processDialog, setProcessDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
  }>({ open: false, action: null });
  const [processComment, setProcessComment] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed'>('pending');

  // 修正希望を取得
  const {
    data: requestsData,
    isLoading,
    isError,
    refetch
  } = useAsync(
    async () => {
      const requests = await trpcClient.modificationRequests.getByShift.query({
        shiftId,
        status: statusFilter === 'all' ? undefined : statusFilter === 'pending' ? 'pending' : undefined
      });

      // 従業員情報も取得
      const employees = await trpcClient.employees.list.query();
      const employeeMap = new Map(employees.map(e => [e.id, e]));

      // リクエストに従業員名を追加
      return requests.map((req: any) => ({
        ...req,
        employeeName: employeeMap.get(req.employeeId)?.name || '不明',
        swapTargetName: req.swapTargetEmployeeId
          ? employeeMap.get(req.swapTargetEmployeeId)?.name || '不明'
          : undefined
      }));
    },
    {
      onError: () => toast.error('修正希望の取得に失敗しました'),
    },
    [shiftId, statusFilter]
  );

  const requests = requestsData || [];

  // フィルタリングされたリクエスト
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'pending') {
      return requests.filter((r: any) => r.status === 'pending');
    } else if (statusFilter === 'processed') {
      return requests.filter((r: any) => r.status !== 'pending');
    }
    return requests;
  }, [requests, statusFilter]);

  // 優先度でソート
  const sortedRequests = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...filteredRequests].sort((a: any, b: any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [filteredRequests]);

  // 処理ミューテーション
  const { mutate: processRequests, isLoading: isProcessing } = useMutation(
    async (params: { action: 'approve' | 'reject', comment?: string }) => {
      if (selectedRequests.length === 0) {
        throw new Error('処理するリクエストを選択してください');
      }

      return await trpcClient.modificationRequests.process.mutate({
        requestIds: selectedRequests,
        action: params.action === 'approve' ? 'approved' : 'rejected',
        comment: params.comment
      });
    },
    {
      onSuccess: (result) => {
        toast.success(
          `${result.processedCount}件の修正希望を${processDialog.action === 'approve' ? '承認' : '却下'}しました`
        );
        setSelectedRequests([]);
        setProcessDialog({ open: false, action: null });
        setProcessComment('');
        refetch();
      },
      onError: (error: Error) => {
        toast.error('処理に失敗しました', {
          description: error.message
        });
      }
    }
  );

  // 全選択/解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(sortedRequests.filter(r => r.status === 'pending').map(r => r.id));
    } else {
      setSelectedRequests([]);
    }
  };

  // 個別選択
  const handleSelectRequest = (requestId: number, checked: boolean) => {
    if (checked) {
      setSelectedRequests([...selectedRequests, requestId]);
    } else {
      setSelectedRequests(selectedRequests.filter(id => id !== requestId));
    }
  };

  // 処理実行
  const handleProcess = () => {
    if (!processDialog.action) return;

    processRequests({
      action: processDialog.action,
      comment: processComment || undefined
    });
  };

  // 統計情報
  const stats = useMemo(() => {
    const pending = requests.filter((r: any) => r.status === 'pending').length;
    const approved = requests.filter((r: any) => r.status === 'approved').length;
    const rejected = requests.filter((r: any) => r.status === 'rejected').length;
    const highPriority = requests.filter((r: any) => r.priority === 'high' && r.status === 'pending').length;

    return { pending, approved, rejected, highPriority };
  }, [requests]);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">修正希望管理</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {shiftYear}年{shiftMonth}月シフトへの修正希望
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Clock className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">未処理</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">高優先度</p>
                <p className="text-2xl font-bold text-red-700">{stats.highPriority}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">承認済</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
              <Check className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">却下</p>
                <p className="text-2xl font-bold text-gray-700">{stats.rejected}</p>
              </div>
              <X className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </Card>

      {/* フィルターとアクション */}
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">
              未処理 ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="processed">
              処理済 ({stats.approved + stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="all">
              すべて ({requests.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedRequests.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setProcessDialog({ open: true, action: 'approve' })}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 mr-2" />
              承認 ({selectedRequests.length}件)
            </Button>
            <Button
              variant="outline"
              onClick={() => setProcessDialog({ open: true, action: 'reject' })}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              却下 ({selectedRequests.length}件)
            </Button>
          </div>
        )}
      </div>

      {/* リクエストテーブル */}
      <Card>
        {isLoading ? (
          <div className="p-6 text-center">
            <LoadingInline />
            <span className="ml-2">修正希望を読み込み中...</span>
          </div>
        ) : sortedRequests.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-16 w-16" />}
            title="修正希望はありません"
            message="職員からの修正希望がまだ提出されていません"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {statusFilter === 'pending' && (
                    <Checkbox
                      checked={selectedRequests.length === sortedRequests.filter(r => r.status === 'pending').length}
                      onCheckedChange={handleSelectAll}
                    />
                  )}
                </TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>職員</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>変更内容</TableHead>
                <TableHead>理由</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {request.status === 'pending' && (
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={(checked) => handleSelectRequest(request.id, !!checked)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_LABELS[request.priority].color}>
                      {PRIORITY_LABELS[request.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{request.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(request.requestDate).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className={REQUEST_TYPE_LABELS[request.requestType].color}>
                        {REQUEST_TYPE_LABELS[request.requestType].icon}
                      </span>
                      <span className="text-sm">
                        {REQUEST_TYPE_LABELS[request.requestType].label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {request.currentAssignment || '勤務'}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">
                        {request.requestedAssignment || '休み'}
                      </span>
                      {request.swapTargetName && (
                        <span className="text-xs text-muted-foreground">
                          ({request.swapTargetName}と交換)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground truncate max-w-xs" title={request.reason}>
                      {request.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' ? (
                      <Badge variant="outline">未処理</Badge>
                    ) : request.status === 'approved' ? (
                      <Badge className="bg-green-100 text-green-700">承認済</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">却下</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>アクション</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRequests([request.id]);
                              setProcessDialog({ open: true, action: 'approve' });
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            承認
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRequests([request.id]);
                              setProcessDialog({ open: true, action: 'reject' });
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            却下
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 処理確認ダイアログ */}
      <Dialog open={processDialog.open} onOpenChange={(open) => !open && setProcessDialog({ open: false, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processDialog.action === 'approve' ? '修正希望を承認' : '修正希望を却下'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequests.length}件の修正希望を{processDialog.action === 'approve' ? '承認' : '却下'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">コメント（任意）</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder={processDialog.action === 'approve'
                  ? "承認理由やメッセージ..."
                  : "却下理由を入力..."}
                value={processComment}
                onChange={(e) => setProcessComment(e.target.value)}
              />
            </div>

            {processDialog.action === 'reject' && !processComment && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  却下する場合は理由を入力することを推奨します
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessDialog({ open: false, action: null })}
              disabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className={processDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing ? (
                <>
                  <LoadingInline />
                  <span className="ml-2">処理中...</span>
                </>
              ) : (
                <>
                  {processDialog.action === 'approve' ? <Check className="h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-2" />}
                  {processDialog.action === 'approve' ? '承認' : '却下'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}