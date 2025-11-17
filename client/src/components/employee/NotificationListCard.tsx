import { Bell, AlertCircle, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { getNotificationBgColor } from "../../utils/employeeHomeUtils";
import type { NotificationListProps } from "../../types/employeeHomeTypes";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'deadline':
      return <AlertCircle className="w-5 h-5 text-warning" />;
    case 'reminder':
      return <Bell className="w-5 h-5 text-blue-600" />;
    case 'approval':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'rejection':
      return <XCircle className="w-5 h-5 text-destructive" />;
    case 'shift_published':
      return <Calendar className="w-5 h-5 text-purple-600" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

export function NotificationListCard({ notifications, stats, isLoading }: NotificationListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          お知らせ
        </h2>
        {stats && (stats.pendingRequests > 0 || stats.upcomingDeadline) && (
          <Badge variant="destructive" className="animate-pulse">
            {stats.pendingRequests > 0 ? `未承認${stats.pendingRequests}件` : '締切接近'}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30">
          <p className="text-center text-muted-foreground">読み込み中...</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30">
          <div className="text-center py-4">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">新しいお知らせはありません</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 border-2 shadow-md ${getNotificationBgColor(notification.priority)}`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-sm leading-tight">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {notification.priority === 'high' && (
                  <div className="flex-shrink-0">
                    <Badge variant="destructive" className="text-xs">重要</Badge>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
