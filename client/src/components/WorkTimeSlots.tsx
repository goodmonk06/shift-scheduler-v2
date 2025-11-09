import { useState } from "react";
import { Clock, Plus, Pencil, Trash2, Save, X, Moon, Sun } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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
import { toast } from "sonner";

interface WorkTimeSlot {
  id: string;
  name: string;
  displayLabel: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
  createdAt: string;
  updatedAt: string;
}

export function WorkTimeSlots() {
  // モックデータ（後でAPI連携）
  const [workTimeSlots, setWorkTimeSlots] = useState<WorkTimeSlot[]>([
    {
      id: "1",
      name: "早番",
      displayLabel: "早",
      startTime: "08:00",
      endTime: "16:00",
      isNightShift: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "遅番",
      displayLabel: "遅",
      startTime: "11:00",
      endTime: "19:00",
      isNightShift: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "夜勤",
      displayLabel: "夜",
      startTime: "16:00",
      endTime: "09:00",
      isNightShift: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WorkTimeSlot | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    name: "",
    displayLabel: "",
    startTime: "",
    endTime: "",
    isNightShift: false,
  });

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setEditingSlot(null);
    setFormData({
      name: "",
      displayLabel: "",
      startTime: "",
      endTime: "",
      isNightShift: false,
    });
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (slot: WorkTimeSlot) => {
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

  // 保存処理
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("名前を入力してください");
      return;
    }
    if (!formData.displayLabel.trim()) {
      toast.error("表示ラベルを入力してください");
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      toast.error("開始時刻と終了時刻を入力してください");
      return;
    }

    if (editingSlot) {
      // 更新
      setWorkTimeSlots(
        workTimeSlots.map((s) =>
          s.id === editingSlot.id
            ? {
                ...s,
                name: formData.name,
                displayLabel: formData.displayLabel,
                startTime: formData.startTime,
                endTime: formData.endTime,
                isNightShift: formData.isNightShift,
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
      toast.success("勤務時間枠を更新しました");
    } else {
      // 新規作成
      const newSlot: WorkTimeSlot = {
        id: Date.now().toString(),
        name: formData.name,
        displayLabel: formData.displayLabel,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isNightShift: formData.isNightShift,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWorkTimeSlots([...workTimeSlots, newSlot]);
      toast.success("勤務時間枠を作成しました");
    }

    setIsDialogOpen(false);
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (slotId: string) => {
    setDeletingSlotId(slotId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (deletingSlotId) {
      setWorkTimeSlots(workTimeSlots.filter((s) => s.id !== deletingSlotId));
      toast.success("勤務時間枠を削除しました");
      setIsDeleteDialogOpen(false);
      setDeletingSlotId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">勤務時間枠管理</h1>
            <p className="text-sm text-muted-foreground">
              早番、遅番、夜勤などの勤務時間枠を管理します
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          勤務時間枠を追加
        </Button>
      </div>

      {/* テーブル */}
      <Card className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>ラベル</TableHead>
              <TableHead>時間</TableHead>
              <TableHead>種別</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workTimeSlots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  勤務時間枠が登録されていません
                </TableCell>
              </TableRow>
            ) : (
              workTimeSlots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell>{slot.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg">
                      {slot.displayLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {slot.startTime} - {slot.endTime}
                  </TableCell>
                  <TableCell>
                    {slot.isNightShift ? (
                      <Badge variant="secondary" className="rounded-lg">
                        <Moon className="w-3 h-3 mr-1" />
                        夜勤
                      </Badge>
                    ) : (
                      <Badge variant="default" className="rounded-lg">
                        <Sun className="w-3 h-3 mr-1" />
                        日勤
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(slot)}
                        className="rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(slot.id)}
                        className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 追加・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? "勤務時間枠を編集" : "勤務時間枠を追加"}
            </DialogTitle>
            <DialogDescription>
              勤務時間枠の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                placeholder="例: 早番、遅番、夜勤"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">表示ラベル *</Label>
              <Input
                id="displayLabel"
                placeholder="例: 早、遅、夜"
                value={formData.displayLabel}
                onChange={(e) =>
                  setFormData({ ...formData, displayLabel: e.target.value })
                }
                className="rounded-xl"
                maxLength={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">開始時刻 *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">終了時刻 *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isNightShift"
                checked={formData.isNightShift}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isNightShift: checked })
                }
              />
              <Label htmlFor="isNightShift" className="cursor-pointer">
                夜勤シフト
              </Label>
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
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>勤務時間枠を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この勤務時間枠が使用されているシフトがある場合は削除できません。
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
