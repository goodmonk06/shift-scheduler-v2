import { useState } from "react";
import { Bell, Plus, Trash2, Send, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from "../hooks/useToast";

interface EmergencyNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export function EmergencyNotifications() {
  const toast = useToast();
  // モックデータ（後でAPI連携）
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([
    {
      id: "1",
      title: "明日のシフト変更について",
      message: "山田さんが体調不良のため、明日の早番を佐藤さんに変更しました。ご確認ください。",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "2",
      title: "来週のシフト確定のお知らせ",
      message: "来週（11月11日〜17日）のシフトが確定しました。各自確認をお願いします。",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    title: "",
    message: "",
  });

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setFormData({
      title: "",
      message: "",
    });
    setIsDialogOpen(true);
  };

  // 保存処理
  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (!formData.message.trim()) {
      toast.error("メッセージを入力してください");
      return;
    }

    // 新規作成
    const newNotification: EmergencyNotification = {
      id: Date.now().toString(),
      title: formData.title,
      message: formData.message,
      createdAt: new Date().toISOString(),
    };
    setNotifications([newNotification, ...notifications]);
    toast.success("緊急通知を作成しました");
    setIsDialogOpen(false);
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (notificationId: string) => {
    setDeletingNotificationId(notificationId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (deletingNotificationId) {
      setNotifications(
        notifications.filter((n) => n.id !== deletingNotificationId)
      );
      toast.success("緊急通知を削除しました");
      setIsDeleteDialogOpen(false);
      setDeletingNotificationId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10">
            <Bell className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">緊急通知管理</h1>
            <p className="text-sm text-muted-foreground">
              職員への緊急通知を作成・管理します
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          緊急通知を作成
        </Button>
      </div>

      {/* 通知一覧 */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">緊急通知はありません</p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className="p-6 rounded-2xl">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <Bell className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg mb-2 text-gray-900">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(notification.id)}
                      className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 作成ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>緊急通知を作成</DialogTitle>
            <DialogDescription>
              職員全員に送信する緊急通知を作成します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                placeholder="例: 明日のシフト変更について"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">メッセージ *</Label>
              <Textarea
                id="message"
                placeholder="緊急連絡の内容を入力してください"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="rounded-xl min-h-[120px]"
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSave} className="rounded-xl">
              <Send className="w-4 h-4 mr-2" />
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>緊急通知を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。削除された通知は職員の画面からも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
