import { useState, useEffect } from "react";
import { Sparkles, Plus, Pencil, Trash2, Calendar as CalendarIcon, X, Save, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
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
import { useToast } from "../hooks/useToast";
import { shiftService } from "../services/shiftService";
import type { Shift as ApiShift } from "../types/api";

type ShiftStatus = "draft" | "tentative" | "confirmed" | "archived";

interface ShiftListProps {
  onEditShift?: (shiftId: string) => void;
}

export function ShiftList({ onEditShift }: ShiftListProps = {}) {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [shifts, setShifts] = useState<ApiShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingShiftId, setDeletingShiftId] = useState<number | null>(null);

  // シフト一覧を読み込む
  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const data = await shiftService.getAllShifts();
      setShifts(data);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      toast.error('シフトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フォームの状態
  const [formData, setFormData] = useState({
    year: currentYear,
    month: currentMonth,
    name: '',
  });

  // 新規作成ダイアログを開く
  const handleCreate = () => {
    const defaultName = `${currentYear}年${currentMonth}月シフト`;
    setFormData({
      year: currentYear,
      month: currentMonth,
      name: defaultName,
    });
    setIsDialogOpen(true);
  };

  // 保存処理
  const handleSave = async () => {
    // 既に同じ年月のシフトがあるかチェック
    const existing = shifts.find(
      (s) => s.year === formData.year && s.month === formData.month
    );
    if (existing) {
      toast.error("この年月のシフトは既に存在します");
      return;
    }

    try {
      setIsSaving(true);
      await shiftService.createShift({
        year: formData.year,
        month: formData.month,
        name: formData.name,
      });
      toast.success("シフトを作成しました");
      setIsDialogOpen(false);
      // リロード
      await loadShifts();
    } catch (error) {
      console.error('Failed to create shift:', error);
      toast.error("シフトの作成に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (shift: ApiShift) => {
    if (shift.status === "confirmed" || shift.status === "archived") {
      toast.error("確定済みまたはアーカイブ済みのシフトは削除できません");
      return;
    }
    setDeletingShiftId(shift.id);
    setIsDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = async () => {
    if (deletingShiftId) {
      try {
        setIsDeleting(true);
        await shiftService.deleteShift(deletingShiftId);
        toast.success("シフトを削除しました");
        setIsDeleteDialogOpen(false);
        setDeletingShiftId(null);
        // リロード
        await loadShifts();
      } catch (error) {
        console.error('Failed to delete shift:', error);
        toast.error("シフトの削除に失敗しました");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // 編集画面へ遷移
  const handleEdit = (shiftId: number) => {
    if (onEditShift) {
      onEditShift(shiftId.toString());
    } else {
      toast.info("シフト編集画面へ遷移します");
    }
  };

  // ステータスのラベル
  const getStatusLabel = (status: ShiftStatus) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "tentative":
        return "仮確定";
      case "confirmed":
        return "確定";
      case "archived":
        return "アーカイブ";
    }
  };

  // ステータスのバッジvariant
  const getStatusBadgeVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "outline";
      case "tentative":
        return "secondary";
      case "confirmed":
        return "default";
      case "archived":
        return "destructive";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">シフト作成・編集</h1>
            <p className="text-sm text-muted-foreground">
              月次シフトを作成・編集します
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          新しいシフトを作成
        </Button>
      </div>

      {/* テーブル */}
      <Card className="rounded-2xl overflow-hidden">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    読み込み中...
                  </div>
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  シフトが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      {shift.year}年{shift.month}月
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(shift.status)}>
                      {getStatusLabel(shift.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(shift.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    {new Date(shift.updatedAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(shift.id)}
                        className="rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(shift)}
                        className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={shift.status === "confirmed" || shift.status === "archived"}
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

      {/* 作成ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新しいシフトを作成</DialogTitle>
            <DialogDescription>
              作成する月を選択してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">年</label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => {
                    const year = parseInt(value);
                    setFormData({
                      ...formData,
                      year,
                      name: `${year}年${formData.month}月シフト`
                    });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(
                      (year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm">月</label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) => {
                    const month = parseInt(value);
                    setFormData({
                      ...formData,
                      month,
                      name: `${formData.year}年${month}月シフト`
                    });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  作成
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>シフトを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。シフトに含まれるすべてのデータが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
