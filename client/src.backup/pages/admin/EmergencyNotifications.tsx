import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

export default function EmergencyNotifications() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
  });

  const utils = trpc.useUtils();

  // 緊急通知を取得
  const { data: notifications, isLoading } = trpc.emergencyNotifications.list.useQuery();

  // 緊急通知を作成
  const createMutation = trpc.emergencyNotifications.create.useMutation({
    onSuccess: () => {
      toast.success("緊急通知を作成しました");
      utils.emergencyNotifications.list.invalidate();
      setIsDialogOpen(false);
      setFormData({ title: "", message: "" });
    },
    onError: (error: any) => {
      toast.error("作成に失敗しました: " + error.message);
    },
  });

  // 緊急通知を削除
  const deleteMutation = trpc.emergencyNotifications.delete.useMutation({
    onSuccess: () => {
      toast.success("緊急通知を削除しました");
      utils.emergencyNotifications.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("削除に失敗しました: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.message) {
      toast.error("タイトルとメッセージを入力してください");
      return;
    }

    createMutation.mutate({
      title: formData.title,
      message: formData.message,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("この緊急通知を削除しますか?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">緊急通知管理</h1>
            <p className="text-muted-foreground mt-1">
              職員への緊急連絡事項を管理
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>緊急通知を作成</DialogTitle>
                <DialogDescription>
                  職員に通知する緊急連絡事項を入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    placeholder="例: 明日のシフト変更について"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="message">メッセージ</Label>
                  <Textarea
                    id="message"
                    placeholder="緊急連絡の内容を入力してください"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  作成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>緊急通知一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                読み込み中...
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                緊急通知はありません
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-destructive" />
                          <h3 className="font-semibold">{notification.title}</h3>
                          {notification.isUrgent && (
                            <Badge variant="destructive">緊急</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {notification.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      作成日時: {new Date(notification.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
