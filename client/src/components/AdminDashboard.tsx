import { Users, Calendar, Bell, Archive, Sparkles, Home } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type ShiftStatus = "draft" | "tentative" | "confirmed" | "archived";

interface EmergencyNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps = {}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // モックデータ（後でAPI連携）
  const stats = {
    totalEmployees: 24,
    currentShift: {
      year: currentYear,
      month: currentMonth,
      status: "confirmed" as ShiftStatus,
    },
    emergencyNotifications: 3,
    archivedShifts: 12,
  };

  const recentNotifications: EmergencyNotification[] = [
    {
      id: "1",
      title: "明日のシフト変更について",
      message: "山田さんが体調不良のため、明日の早番を佐藤さんに変更しました。",
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: "2",
      title: "来週のシフト確定のお知らせ",
      message: "来週（11月11日〜17日）のシフトが確定しました。",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "3",
      title: "緊急連絡：欠員対応",
      message: "本日の夜勤に欠員が発生しました。代替職員の手配をお願いします。",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ];

  // ステータスのラベル
  const getStatusLabel = (status: ShiftStatus) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "tentative":
        return "仮確定";
      case "confirmed":
        return "確定";
      case "archived":
        return "アーカイブ";
    }
  };

  // ステータスのバッジvariant
  const getStatusBadgeVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "outline";
      case "tentative":
        return "secondary";
      case "confirmed":
        return "default";
      case "archived":
        return "destructive";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10">
          <Home className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            システム全体の概要を一目で確認できます
          </p>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">登録職員数</p>
              <p className="text-2xl text-gray-900">{stats.totalEmployees}名</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">今月のシフト</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg text-gray-900">
                  {stats.currentShift.year}年{stats.currentShift.month}月
                </p>
                <Badge variant={getStatusBadgeVariant(stats.currentShift.status)} className="text-xs">
                  {getStatusLabel(stats.currentShift.status)}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <Bell className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">緊急通知</p>
              <p className="text-2xl text-gray-900">{stats.emergencyNotifications}件</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-500/10">
              <Archive className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">アーカイブ</p>
              <p className="text-2xl text-gray-900">{stats.archivedShifts}件</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 最近の活動 */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-gray-900">最近の活動</h2>
            <Badge variant="outline">{recentNotifications.length}件</Badge>
          </div>
        </div>
        <div className="p-6">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p>最近の活動はありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="flex gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Bell className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm mb-1 text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg mb-4 text-gray-900">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="p-6 rounded-2xl hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-500/5 to-pink-500/5"
            onClick={() => onNavigate?.("shifts")}
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 w-fit">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-gray-900">新しいシフトを作成</h3>
              <p className="text-sm text-muted-foreground">
                月次シフトを作成してAI自動生成または手動編集
              </p>
            </div>
          </Card>

          <Card 
            className="p-6 rounded-2xl hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
            onClick={() => onNavigate?.("employees")}
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/10 w-fit">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-gray-900">職員を追加</h3>
              <p className="text-sm text-muted-foreground">
                新しい職員を登録して役職グループを設定
              </p>
            </div>
          </Card>

          <Card 
            className="p-6 rounded-2xl hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-500/5 to-emerald-500/5"
            onClick={() => onNavigate?.("leave-requests")}
          >
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-green-500/10 w-fit">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-gray-900">希望休を確認</h3>
              <p className="text-sm text-muted-foreground">
                職員からの希望休申請を確認して承認・却下
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
