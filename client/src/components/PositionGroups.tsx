import { useState } from "react";
import { Briefcase, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

interface PositionGroup {
  id: string;
  name: string;
  employmentType: "fulltime" | "parttime";
  createdAt: string;
  updatedAt: string;
}

export function PositionGroups() {
  // モックデータ（後でAPI連携）
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([
    {
      id: "1",
      name: "正社員",
      employmentType: "fulltime",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "パート",
      employmentType: "parttime",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PositionGroup | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    name: "",
    employmentType: "fulltime" as "fulltime" | "parttime",
  });

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: "",
      employmentType: "fulltime",
    });
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (group: PositionGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      employmentType: group.employmentType,
    });
    setIsDialogOpen(true);
  };

  // 保存処理
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("名前を入力してください");
      return;
    }

    if (editingGroup) {
      // 更新
      setPositionGroups(
        positionGroups.map((g) =>
          g.id === editingGroup.id
            ? {
                ...g,
                name: formData.name,
                employmentType: formData.employmentType,
                updatedAt: new Date().toISOString(),
              }
            : g
        )
      );
      toast.success("役職グループを更新しました");
    } else {
      // 新規作成
      const newGroup: PositionGroup = {
        id: Date.now().toString(),
        name: formData.name,
        employmentType: formData.employmentType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPositionGroups([...positionGroups, newGroup]);
      toast.success("役職グループを作成しました");
    }

    setIsDialogOpen(false);
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (groupId: string) => {
    setDeletingGroupId(groupId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (deletingGroupId) {
      setPositionGroups(positionGroups.filter((g) => g.id !== deletingGroupId));
      toast.success("役職グループを削除しました");
      setIsDeleteDialogOpen(false);
      setDeletingGroupId(null);
    }
  };

  // 雇用形態のラベル
  const getEmploymentTypeLabel = (type: "fulltime" | "parttime") => {
    return type === "fulltime" ? "正社員" : "パート";
  };

  // 雇用形態のバッジ色
  const getEmploymentTypeBadgeVariant = (type: "fulltime" | "parttime") => {
    return type === "fulltime" ? "default" : "secondary";
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <Briefcase className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">役職グループ管理</h1>
            <p className="text-sm text-muted-foreground">
              正社員、パートなどの役職グループを管理します
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          役職グループを追加
        </Button>
      </div>

      {/* テーブル */}
      <Card className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>雇用形態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positionGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  役職グループが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              positionGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>
                    <Badge variant={getEmploymentTypeBadgeVariant(group.employmentType)}>
                      {getEmploymentTypeLabel(group.employmentType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                        className="rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(group.id)}
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
              {editingGroup ? "役職グループを編集" : "役職グループを追加"}
            </DialogTitle>
            <DialogDescription>
              役職グループの情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                placeholder="例: 正社員、パート"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">雇用形態 *</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value: "fulltime" | "parttime") =>
                  setFormData({ ...formData, employmentType: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">正社員</SelectItem>
                  <SelectItem value="parttime">パート</SelectItem>
                </SelectContent>
              </Select>
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
            <AlertDialogTitle>役職グループを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この役職グループに紐づく職員がいる場合は削除できません。
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
