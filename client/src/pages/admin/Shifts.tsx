import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Calendar, Edit, Plus, Trash2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function Shifts() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const { data: shifts, isLoading } = trpc.shifts.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.shifts.create.useMutation({
    onSuccess: () => {
      toast.success("シフトを作成しました");
      utils.shifts.list.invalidate();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("シフトの作成に失敗しました: " + error.message);
    },
  });

  const deleteMutation = trpc.shifts.delete.useMutation({
    onSuccess: () => {
      toast.success("シフトを削除しました");
      utils.shifts.list.invalidate();
    },
    onError: (error) => {
      toast.error("シフトの削除に失敗しました: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.year || !formData.month) {
      toast.error("年月を入力してください");
      return;
    }

    const name = `${formData.year}年${formData.month}月シフト`;
    createMutation.mutate({
      year: formData.year,
      month: formData.month,
      name,
      status: "draft",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("このシフトを削除してもよろしいですか?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default">確定</Badge>;
      case "tentative":
        return <Badge variant="secondary">仮確定</Badge>;
      case "draft":
        return <Badge variant="outline">下書き</Badge>;
      case "archived":
        return <Badge>アーカイブ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">シフト作成</h1>
            <p className="text-muted-foreground mt-2">月次シフトの作成・編集・管理</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新しいシフトを作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>新しいシフトを作成</DialogTitle>
                  <DialogDescription>
                    作成する月のシフトを選択してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">年</Label>
                      <Input
                        id="year"
                        type="number"
                        min="2020"
                        max="2030"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">月</Label>
                      <Select
                        value={formData.month.toString()}
                        onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <SelectItem key={m} value={m.toString()}>
                              {m}月
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    作成
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>シフト一覧</CardTitle>
            <CardDescription>作成済みのシフト一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : shifts && shifts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>年月</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>更新日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">
                        {shift.year}年{shift.month}月
                      </TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell>{new Date(shift.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>{new Date(shift.updatedAt).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/shifts/${shift.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(shift.id)}
                            disabled={shift.status === "confirmed" || shift.status === "archived"}
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
                シフトが作成されていません。「新しいシフトを作成」ボタンから作成してください。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="h-5 w-5 inline mr-2" />
              AI自動生成について
            </CardTitle>
            <CardDescription>
              シフトを作成後、編集画面でAI自動生成機能を使用できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 正社員を優先的に配置し、その後パートを配置します</p>
              <p>• 職場ルールと必要人数設定を考慮して最適なシフトを生成します</p>
              <p>• 希望休や個人の制約も反映されます</p>
              <p>• 生成後は手動で微調整が可能です</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
