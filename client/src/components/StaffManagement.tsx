import { useState } from "react";
import { Users, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
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

interface Employee {
  id: string;
  name: string;
  positionGroupId: string;
  positionGroupName: string; // 表示用
  skillLevel: number; // 50-100
  canWorkNight: boolean;
  // AI生成用の制約条件
  minDaysOffPerWeek?: number;
  maxConsecutiveWorkDays?: number;
  additionalConstraints?: string;
  createdAt: string;
  updatedAt: string;
}

export function StaffManagement() {
  // モックデータ（後でAPI連携）
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "EMP001",
      name: "山田 太郎",
      positionGroupId: "1",
      positionGroupName: "正社員",
      skillLevel: 100,
      canWorkNight: true,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 5,
      additionalConstraints: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "EMP002",
      name: "佐藤 花子",
      positionGroupId: "1",
      positionGroupName: "正社員",
      skillLevel: 100,
      canWorkNight: true,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 5,
      additionalConstraints: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "EMP003",
      name: "鈴木 一郎",
      positionGroupId: "2",
      positionGroupName: "パート",
      skillLevel: 80,
      canWorkNight: false,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 3,
      additionalConstraints: "月・水・金のみ勤務可能。水曜日は17時まで（子供の送迎のため）。",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  // 役職グループのモックデータ（後でAPI連携）
  const positionGroups = [
    { id: "1", name: "正社員" },
    { id: "2", name: "パート" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    name: "",
    positionGroupId: "1",
    skillLevel: 100,
    canWorkNight: false,
    minDaysOffPerWeek: 2,
    maxConsecutiveWorkDays: 5,
    additionalConstraints: "",
  });

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      positionGroupId: "1",
      skillLevel: 100,
      canWorkNight: false,
      minDaysOffPerWeek: 2,
      maxConsecutiveWorkDays: 5,
      additionalConstraints: "",
    });
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      positionGroupId: employee.positionGroupId,
      skillLevel: employee.skillLevel,
      canWorkNight: employee.canWorkNight,
      minDaysOffPerWeek: employee.minDaysOffPerWeek || 2,
      maxConsecutiveWorkDays: employee.maxConsecutiveWorkDays || 5,
      additionalConstraints: employee.additionalConstraints || "",
    });
    setIsDialogOpen(true);
  };

  // 保存処理
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("名前を入力してください");
      return;
    }

    if (formData.skillLevel < 50 || formData.skillLevel > 100) {
      toast.error("スキルレベルは50〜100の範囲で設定してください");
      return;
    }

    const positionGroup = positionGroups.find((g) => g.id === formData.positionGroupId);

    if (editingEmployee) {
      // 更新
      setEmployees(
        employees.map((e) =>
          e.id === editingEmployee.id
            ? {
                ...e,
                name: formData.name,
                positionGroupId: formData.positionGroupId,
                positionGroupName: positionGroup?.name || "",
                skillLevel: formData.skillLevel,
                canWorkNight: formData.canWorkNight,
                minDaysOffPerWeek: formData.minDaysOffPerWeek,
                maxConsecutiveWorkDays: formData.maxConsecutiveWorkDays,
                additionalConstraints: formData.additionalConstraints,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
      toast.success("職員情報を更新しました");
    } else {
      // 新規作成
      const newEmployee: Employee = {
        id: `EMP${String(employees.length + 1).padStart(3, "0")}`,
        name: formData.name,
        positionGroupId: formData.positionGroupId,
        positionGroupName: positionGroup?.name || "",
        skillLevel: formData.skillLevel,
        canWorkNight: formData.canWorkNight,
        minDaysOffPerWeek: formData.minDaysOffPerWeek,
        maxConsecutiveWorkDays: formData.maxConsecutiveWorkDays,
        additionalConstraints: formData.additionalConstraints,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEmployees([...employees, newEmployee]);
      toast.success("職員を追加しました");
    }

    setIsDialogOpen(false);
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (employeeId: string) => {
    setDeletingEmployeeId(employeeId);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (deletingEmployeeId) {
      setEmployees(employees.filter((e) => e.id !== deletingEmployeeId));
      toast.success("職員を削除しました");
      setIsDeleteDialogOpen(false);
      setDeletingEmployeeId(null);
    }
  };

  // 詳細表示（仮実装）
  const handleViewDetail = (employeeId: string) => {
    toast.info("職員詳細画面へ遷移します（実装予定）");
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">職員管理</h1>
            <p className="text-sm text-muted-foreground">
              職員の登録・編集・削除を行います
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          職員を追加
        </Button>
      </div>

      {/* テーブル */}
      <Card className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>役職グループ</TableHead>
              <TableHead>スキルレベル</TableHead>
              <TableHead>夜勤可否</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  職員が登録されていません
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{employee.name}</div>
                      <div className="text-xs text-muted-foreground">{employee.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.positionGroupName}</Badge>
                  </TableCell>
                  <TableCell>{employee.skillLevel}%</TableCell>
                  <TableCell>
                    <Badge variant={employee.canWorkNight ? "default" : "secondary"}>
                      {employee.canWorkNight ? "可" : "不可"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(employee.id)}
                        className="rounded-lg"
                      >
                        詳細
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                        className="rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(employee.id)}
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "職員情報を編集" : "職員を追加"}
            </DialogTitle>
            <DialogDescription>
              職員の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                placeholder="例: 山田 太郎"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="positionGroupId">役職グループ *</Label>
              <Select
                value={formData.positionGroupId}
                onValueChange={(value) =>
                  setFormData({ ...formData, positionGroupId: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positionGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillLevel">スキルレベル</Label>
              <Input
                id="skillLevel"
                type="number"
                min="50"
                max="100"
                value={formData.skillLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    skillLevel: parseInt(e.target.value) || 100,
                  })
                }
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                50=0.5人前、100=1人前（50〜100）
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="canWorkNight"
                checked={formData.canWorkNight}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, canWorkNight: checked })
                }
              />
              <Label htmlFor="canWorkNight" className="cursor-pointer">
                夜勤可能
              </Label>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm">シフト制約条件（AI生成用）</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minDaysOff">週の最低休日数</Label>
                  <Input
                    id="minDaysOff"
                    type="number"
                    min="1"
                    max="7"
                    value={formData.minDaysOffPerWeek}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minDaysOffPerWeek: parseInt(e.target.value) || 2,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxConsecutive">最大連勤日数</Label>
                  <Input
                    id="maxConsecutive"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.maxConsecutiveWorkDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxConsecutiveWorkDays: parseInt(e.target.value) || 5,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalConstraints">追加の制約（任意）</Label>
                <Textarea
                  id="additionalConstraints"
                  placeholder="例: 月・水・金のみ勤務可能。水曜日は17時まで（子供の送迎のため）。第2・第4土曜日は不可。"
                  value={formData.additionalConstraints}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalConstraints: e.target.value })
                  }
                  className="rounded-xl"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  AIが理解できるように、自然言語で具体的に記入してください
                </p>
              </div>
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
            <AlertDialogTitle>職員を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この職員に紐づくシフトデータも削除されます。
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
