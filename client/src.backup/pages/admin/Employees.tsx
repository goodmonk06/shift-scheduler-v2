import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export default function Employees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    positionGroupId: "",
    skillLevel: "100",
    canWorkNightShift: false,
  });

  const [, setLocation] = useLocation();
  const { data: employees, isLoading } = trpc.employees.list.useQuery();
  const { data: positionGroups } = trpc.positionGroups.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("職員を追加しました");
      utils.employees.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("職員の追加に失敗しました: " + error.message);
    },
  });

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("職員情報を更新しました");
      utils.employees.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("職員情報の更新に失敗しました: " + error.message);
    },
  });

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("職員を削除しました");
      utils.employees.list.invalidate();
    },
    onError: (error) => {
      toast.error("職員の削除に失敗しました: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      positionGroupId: "",
      skillLevel: "100",
      canWorkNightShift: false,
    });
    setEditingEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.positionGroupId) {
      toast.error("名前と役職グループは必須です");
      return;
    }

    const data = {
      name: formData.name,
      positionGroupId: parseInt(formData.positionGroupId),
      skillLevel: parseInt(formData.skillLevel),
      canWorkNightShift: formData.canWorkNightShift,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      positionGroupId: employee.positionGroupId.toString(),
      skillLevel: employee.skillLevel.toString(),
      canWorkNightShift: employee.canWorkNightShift,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("この職員を削除してもよろしいですか?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getPositionGroupName = (id: number) => {
    return positionGroups?.find(pg => pg.id === id)?.name || "不明";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">職員管理</h1>
            <p className="text-muted-foreground mt-2">職員の登録・編集・削除</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                職員を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? "職員情報を編集" : "新しい職員を追加"}</DialogTitle>
                  <DialogDescription>
                    職員の基本情報を入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="positionGroup">役職グループ *</Label>
                    <Select
                      value={formData.positionGroupId}
                      onValueChange={(value) => setFormData({ ...formData, positionGroupId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="役職グループを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {positionGroups?.map((pg) => (
                          <SelectItem key={pg.id} value={pg.id.toString()}>
                            {pg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skillLevel">スキルレベル (50-100)</Label>
                    <Input
                      id="skillLevel"
                      type="number"
                      min="50"
                      max="100"
                      value={formData.skillLevel}
                      onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">50=0.5人前、100=1人前</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="canWorkNightShift"
                      checked={formData.canWorkNightShift}
                      onCheckedChange={(checked) => setFormData({ ...formData, canWorkNightShift: checked })}
                    />
                    <Label htmlFor="canWorkNightShift">夜勤可能</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingEmployee ? "更新" : "追加"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>職員一覧</CardTitle>
            <CardDescription>登録されている職員の一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : employees && employees.length > 0 ? (
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
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{getPositionGroupName(employee.positionGroupId)}</TableCell>
                      <TableCell>{employee.skillLevel}%</TableCell>
                      <TableCell>{employee.canWorkNightShift ? "可" : "不可"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/employees/${employee.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee.id)}
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
                職員が登録されていません。「職員を追加」ボタンから登録してください。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
