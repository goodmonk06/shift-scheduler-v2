import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function PositionGroups() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    employmentType: "fulltime" as "fulltime" | "parttime",
  });

  const { data: positionGroups, isLoading } = trpc.positionGroups.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.positionGroups.create.useMutation({
    onSuccess: () => {
      toast.success("役職グループを追加しました");
      utils.positionGroups.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("役職グループの追加に失敗しました: " + error.message);
    },
  });

  const updateMutation = trpc.positionGroups.update.useMutation({
    onSuccess: () => {
      toast.success("役職グループを更新しました");
      utils.positionGroups.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("役職グループの更新に失敗しました: " + error.message);
    },
  });

  const deleteMutation = trpc.positionGroups.delete.useMutation({
    onSuccess: () => {
      toast.success("役職グループを削除しました");
      utils.positionGroups.list.invalidate();
    },
    onError: (error) => {
      toast.error("役職グループの削除に失敗しました: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      employmentType: "fulltime",
    });
    setEditingGroup(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("名前は必須です");
      return;
    }

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      employmentType: group.employmentType,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("この役職グループを削除してもよろしいですか?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">役職グループ管理</h1>
            <p className="text-muted-foreground mt-2">役職グループの登録・編集・削除</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                役職グループを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingGroup ? "役職グループを編集" : "新しい役職グループを追加"}</DialogTitle>
                  <DialogDescription>
                    役職グループの情報を入力してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例: 正社員、パート"
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
                      <SelectTrigger>
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
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingGroup ? "更新" : "追加"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>役職グループ一覧</CardTitle>
            <CardDescription>登録されている役職グループの一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : positionGroups && positionGroups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>雇用形態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <Badge variant={group.employmentType === "fulltime" ? "default" : "secondary"}>
                          {group.employmentType === "fulltime" ? "正社員" : "パート"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(group.id)}
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
                役職グループが登録されていません。「役職グループを追加」ボタンから登録してください。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
