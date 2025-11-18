import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  MessageSquare,
  Users,
  Trash2,
  Filter,
  Search,
  X
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { trpcClient } from '../lib/trpc';
import notificationClient from '../lib/websocket';
import { useToast } from '../hooks/useToast';
import { useAsync } from '../hooks/useAsync';
import { LoadingInline } from './ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number;
  role: 'admin' | 'employee';
}

interface NotificationItem {
  id: number;
  recipientType: 'all' | 'employee' | 'admin';
  recipientId?: number;
  shiftId?: number;
  notificationType: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

const NOTIFICATION_TYPE_ICONS = {
  'status_change': Clock,
  'deadline_reminder': Calendar,
  'feedback_request': MessageSquare,
  'approval': Check,
  'rejection': X,
  'shift_published': Users,
  'modification_request': AlertTriangle
};

const NOTIFICATION_TYPE_LABELS = {
  'status_change': 'ステータス変更',
  'deadline_reminder': '締切リマインダー',
  'feedback_request': 'フィードバック依頼',
  'approval': '承認',
  'rejection': '却下',
  'shift_published': 'シフト公開',
  'modification_request': '修正希望'
};

const PRIORITY_COLORS = {
  'low': 'bg-gray-100 text-gray-700',
  'medium': 'bg-blue-100 text-blue-700',
  'high': 'bg-red-100 text-red-700'
};

export function NotificationCenter({
  open,
  onOpenChange,
  employeeId,
  role
}: NotificationCenterProps) {
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // 通知データを取得
  const {
    data,
    isLoading,
    isError,
    refetch
  } = useAsync(
    async () => {
      return await trpcClient.notifications.getMine.query({
        limit: 100,
        includeRead: true
      });
    },
    {
      onError: () => toast.error('通知の取得に失敗しました')
    },
    [employeeId]
  );

  // WebSocket接続のセットアップ
  useEffect(() => {
    if (!open || !isRealTimeEnabled) return;

    // WebSocketイベントハンドラー
    const events = {
      onNotification: (notification: any) => {
        console.log('New notification received:', notification);

        // 新しい通知を追加
        const newNotification: NotificationItem = {
          ...notification,
          isRead: false,
          createdAt: new Date(notification.timestamp)
        };

        setNotifications(prev => [newNotification, ...prev]);

        // トースト通知
        toast.info(notification.title, {
          description: notification.message
        });
      },

      onNotificationRead: (notificationId: number) => {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date() }
              : n
          )
        );
      },

      onAllNotificationsRead: () => {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
      },

      onConnectionStatusChange: (status: 'connected' | 'disconnected') => {
        setConnectionStatus(status);
      },

      onError: (error: string) => {
        toast.error('WebSocket接続エラー', {
          description: error
        });
      }
    };

    // WebSocket接続
    notificationClient.connect(employeeId, role, events);

    // 通知リストをリクエスト
    notificationClient.requestNotifications(100);

    return () => {
      notificationClient.disconnect();
    };
  }, [open, employeeId, role, isRealTimeEnabled, toast]);

  // 初期データのセット
  useEffect(() => {
    if (data) {
      setNotifications(data.map(n => ({
        ...n,
        recipientId: n.recipientId ?? undefined,
        shiftId: n.shiftId ?? undefined,
        actionUrl: n.actionUrl ?? undefined,
        readAt: n.readAt ? new Date(n.readAt) : undefined,
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        createdAt: new Date(n.createdAt)
      })) as any);
    }
  }, [data]);

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...notifications];

    // タブフィルター
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'high') {
      filtered = filtered.filter(n => n.priority === 'high');
    }

    // タイプフィルター
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.notificationType === selectedType);
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, selectedType, searchQuery]);

  // 通知を既読にする
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await trpcClient.notifications.markAsRead.mutate({ notificationId });
      notificationClient.markNotificationAsRead(notificationId);
    } catch (error: any) {
      toast.error('既読処理に失敗しました');
    }
  }, [toast]);

  // すべて既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      await trpcClient.notifications.markAllAsRead.mutate();
      notificationClient.markAllNotificationsAsRead();
      toast.success('すべて既読にしました');
    } catch (error: any) {
      toast.error('既読処理に失敗しました');
    }
  }, [toast]);

  // 通知を削除
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      // TODO: APIエンドポイント実装後に有効化
      // await trpcClient.notifications.delete.mutate({ notificationId });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('通知を削除しました');
    } catch (error: any) {
      toast.error('削除に失敗しました');
    }
  }, [toast]);

  // ブラウザ通知の権限をリクエスト
  const requestNotificationPermission = useCallback(async () => {
    const permission = await notificationClient.requestNotificationPermission();
    if (permission === 'granted') {
      toast.success('ブラウザ通知が有効になりました');
    } else if (permission === 'denied') {
      toast.error('ブラウザ通知が拒否されています');
    }
  }, [toast]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知センター
                {unreadCount > 0 && (
                  <Badge variant="destructive">
                    {unreadCount}件未読
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                すべての通知を管理できます
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {connectionStatus === 'connected' ? 'リアルタイム' : 'オフライン'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b space-y-4">
          {/* 検索とフィルター */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="通知を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                {Object.entries(NOTIFICATION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* タブとアクション */}
          <div className="flex items-center justify-between">
            <Tabs value={filter} onValueChange={(value: any) => setFilter(value)}>
              <TabsList>
                <TabsTrigger value="all">
                  すべて ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  未読 ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="high">
                  重要
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  すべて既読
                </Button>
              )}
              {!('Notification' in window) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ブラウザ通知はサポートされていません
                  </AlertDescription>
                </Alert>
              )}
              {Notification.permission === 'default' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  通知を有効化
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 通知リスト */}
        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingInline />
              <span className="ml-2">通知を読み込み中...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? '未読の通知はありません' :
                 filter === 'high' ? '重要な通知はありません' :
                 '通知はありません'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              {filteredNotifications.map((notification) => {
                const Icon = NOTIFICATION_TYPE_ICONS[notification.notificationType as keyof typeof NOTIFICATION_TYPE_ICONS] || Info;

                return (
                  <Card
                    key={notification.id}
                    className={`p-4 transition-all cursor-pointer hover:shadow-md ${
                      !notification.isRead ? 'bg-blue-50/50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${PRIORITY_COLORS[notification.priority]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">
                            {NOTIFICATION_TYPE_LABELS[notification.notificationType as keyof typeof NOTIFICATION_TYPE_LABELS] || notification.notificationType}
                          </Badge>
                          <span>
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: ja
                            })}
                          </span>
                          {notification.isRead && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              既読
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredNotifications.length}件の通知を表示中
            </span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="realtime"
                checked={isRealTimeEnabled}
                onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
              />
              <label htmlFor="realtime">リアルタイム更新</label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}