import { useState } from "react";
import { Archive, Calendar, Eye, FolderArchive } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
import { Separator } from "./ui/separator";
import { useToast } from "../hooks/useToast";
import type { ShiftStatus } from "../types/api";

interface Shift {
  id: string;
  year: number;
  month: number;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
}

export function ShiftArchive() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();

  // モックデータ（後でAPI連携）
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: "1",
      year: currentYear,
      month: new Date().getMonth() + 1,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
    },
    {
      id: "2",
      year: currentYear,
      month: new Date().getMonth(),
      status: "confirmed",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      isArchived: false,
    },
    {
      id: "3",
      year: currentYear - 1,
      month: 12,
      status: "archived",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
      isArchived: true,
      archivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50).toISOString(),
    },
    {
      id: "4",
      year: currentYear - 1,
      month: 11,
      status: "archived",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      isArchived: true,
      archivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 80).toISOString(),
    },
  ]);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // アーカイブ確認ダイアログを開く
  const handleArchiveClick = (shift: Shift) => {
    setSelectedShift(shift);
    setArchiveDialogOpen(true);
  };

  // アーカイブ処理
  const handleArchive = () => {
    if (!selectedShift) return;

    const updatedShifts = shifts.map((s) =>
      s.id === selectedShift.id
        ? {
            ...s,
            status: "archived" as const,
            isArchived: true,
            archivedAt: new Date().toISOString(),
          }
        : s
    );

    setShifts(updatedShifts);
    toast.success("シフトをアーカイブしました");
    setArchiveDialogOpen(false);
    setSelectedShift(null);
  };

  // 表示/閲覧（仮実装）
  const handleView = (shiftId: string) => {
    toast.info("シフト詳細画面へ遷移します（実装予定）");
    // 実際は /shifts/{id}/edit へ遷移
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
      default:
        return "不明";
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
      default:
        return "outline";
    }
  };

  // フィルター
  const currentShifts = shifts.filter((s) => !s.isArchived);
  const archivedShifts = shifts.filter(
    (s) => s.isArchived && s.year === selectedYear
  );

  const renderShiftCard = (shift: Shift, showArchiveButton: boolean) => (
    <Card key={shift.id} className="p-6 rounded-2xl">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-xl ${showArchiveButton ? "bg-purple-500/10" : "bg-gray-500/10"}`}>
              {showArchiveButton ? (
                <Calendar className="w-6 h-6 text-purple-600" />
              ) : (
                <FolderArchive className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg mb-2 text-gray-900">
              {shift.year}年{shift.month}月のシフト
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>ステータス:</span>
                <Badge variant={getStatusBadgeVariant(shift.status)}>
                  {getStatusLabel(shift.status)}
                </Badge>
              </div>
              <div>作成日: {new Date(shift.createdAt).toLocaleDateString("ja-JP")}</div>
              {shift.archivedAt && (
                <div>アーカイブ日: {new Date(shift.archivedAt).toLocaleDateString("ja-JP")}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleView(shift.id)}
            className="rounded-lg"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showArchiveButton ? "表示" : "閲覧"}
          </Button>
          {showArchiveButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleArchiveClick(shift)}
              className="rounded-lg"
            >
              <Archive className="w-4 h-4 mr-2" />
              アーカイブ
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/10">
          <Archive className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl text-gray-900">アーカイブ</h1>
          <p className="text-sm text-muted-foreground">
            シフトのアーカイブと過去データの閲覧
          </p>
        </div>
      </div>

      {/* 現在のシフト */}
      <div className="space-y-4">
        <h2 className="text-lg text-gray-900">現在のシフト</h2>
        {currentShifts.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">現在のシフトはありません</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentShifts.map((shift) => renderShiftCard(shift, true))}
          </div>
        )}
      </div>

      <Separator />

      {/* アーカイブ済みシフト */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-gray-900">アーカイブ済みシフト</h2>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value: string) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {archivedShifts.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center">
            <FolderArchive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedYear}年のアーカイブはありません
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {archivedShifts.map((shift) => renderShiftCard(shift, false))}
          </div>
        )}
      </div>

      {/* アーカイブ確認ダイアログ */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>シフトをアーカイブしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedShift && (
                <div className="space-y-2 mt-2">
                  <div>
                    {selectedShift.year}年{selectedShift.month}月のシフトをアーカイブします。
                  </div>
                  <div className="text-sm">
                    アーカイブされたシフトは編集できなくなりますが、閲覧は可能です。
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="rounded-xl"
            >
              アーカイブ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
