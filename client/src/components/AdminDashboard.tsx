import { useState, useEffect } from "react";
import { Users, Calendar, Bell, Archive, Sparkles, Home } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { dashboardService } from "../services/dashboardService";
import { notificationService, type EmergencyNotification } from "../services/notificationService";
import { toast } from "sonner";

type ShiftStatus = "draft" | "tentative" | "tentative_revised" | "confirmed" | "actual" | "archived";

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    currentShift: null as {
      id: number;
      year: number;
      month: number;
      status: string;
      leaveRequestDeadline: string | null;
    } | null,
    emergencyNotifications: 0,
    archivedShifts: 0,
  });
  const [recentNotifications, setRecentNotifications] = useState<EmergencyNotification[]>([]);

  // APIからダッシュボード統計と通知を取得
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        const [statsData, notificationsData] = await Promise.all([
          dashboardService.getStats(),
          notificationService.getRecentNotifications(5),
        ]);
        setStats(statsData);
        setRecentNotifications(notificationsData);
      } catch (error) {
        console.error("ダッシュボードデータの取得に失敗しました:", error);
        toast.error("データ読み込みエラー", {
          description: "ダッシュボードデータの取得に失敗しました。ページを再読み込みしてください。",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // ステータスのラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "tentative":
        return "仮確定";
      case "tentative_revised":
        return "仮確定(修正版)";
      case "confirmed":
        return "確定";
      case "actual":
        return "実績";
      case "archived":
        return "アーカイブ";
      default:
        return status;
    }
  };

  // ステータスのバッジvariant
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "outline";
      case "tentative":
      case "tentative_revised":
        return "secondary";
      case "confirmed":
      case "actual":
        return "default";
      case "archived":
        return "destructive";
      default:
        return "outline";
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
              {isLoading ? (
                <p className="text-lg text-gray-900">読み込み中...</p>
              ) : stats.currentShift ? (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg text-gray-900">
                    {stats.currentShift.year}年{stats.currentShift.month}月
                  </p>
                  <Badge variant={getStatusBadgeVariant(stats.currentShift.status)} className="text-xs">
                    {getStatusLabel(stats.currentShift.status)}
                  </Badge>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">未作成</p>
              )}
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
