import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function WorkTimeSlots() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayLabel: "",
    startTime: "",
    endTime: "",
    isNightShift: false,
  });

  const { data: workTimeSlots, isLoading } = trpc.workTimeSlots.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.workTimeSlots.create.useMutation({
    onSuccess: () => {
      toast.success("勤務時間枠を追加しました");
      utils.workTimeSlots.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("勤務時間枠の追加に失敗しました: " + error.message);
    },
  });

  const updateMutation = trpc.workTimeSlots.update.useMutation({
    onSuccess: () => {
      toast.success("勤務時間枠を更新しました");
      utils.workTimeSlots.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("勤務時間枠の更新に失敗しました: " + error.message);
    },
  });

  const deleteMutation = trpc.workTimeSlots.delete.useMutation({
    onSuccess: () => {
      toast.success("勤務時間枠を削除しました");
      utils.workTimeSlots.list.invalidate();
    },
    onError: (error) => {
      toast.error("勤務時間枠の削除に失敗しました: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayLabel: "",
      startTime: "",
      endTime: "",
      isNightShift: false,
    });
    setEditingSlot(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.displayLabel || !formData.startTime || !formData.endTime) {
      toast.error("すべての項目を入力してください");
      return;
    }

    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
    setFormData({
      name: slot.name,
      displayLabel: slot.displayLabel,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isNightShift: slot.isNightShift,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("この勤務時間枠を削除してもよろしいですか?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">勤務時間枠管理</h1>
            <p className="text-muted-foreground mt-2">勤務時間枠の登録・編集・削除</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                勤務時間枠を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingSlot ? "勤務時間枠を編集" : "新しい勤務時間枠を追加"}</DialogTitle>
                  <DialogDescription>
                    勤務時間枠の情報を入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例: 早番、遅番、夜勤"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayLabel">表示ラベル *</Label>
                    <Input
                      id="displayLabel"
                      value={formData.displayLabel}
                      onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
                      placeholder="例: 早、遅、夜"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">開始時刻 *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">終了時刻 *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isNightShift"
                      checked={formData.isNightShift}
                      onCheckedChange={(checked) => setFormData({ ...formData, isNightShift: checked })}
                    />
                    <Label htmlFor="isNightShift">夜勤シフト</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSlot ? "更新" : "追加"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>勤務時間枠一覧</CardTitle>
            <CardDescription>登録されている勤務時間枠の一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : workTimeSlots && workTimeSlots.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>表示ラベル</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workTimeSlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{slot.name}</TableCell>
                      <TableCell>
                        <Badge>{slot.displayLabel}</Badge>
                      </TableCell>
                      <TableCell>{slot.startTime} - {slot.endTime}</TableCell>
                      <TableCell>
                        {slot.isNightShift ? (
                          <Badge variant="secondary">夜勤</Badge>
                        ) : (
                          <Badge variant="outline">日勤</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(slot)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(slot.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                勤務時間枠が登録されていません。「勤務時間枠を追加」ボタンから登録してください。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
