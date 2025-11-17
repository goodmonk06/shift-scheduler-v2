import { useState, useEffect } from "react";
import { UsersRound, Save, Info, Settings2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/useToast";
import { trpcClient } from "../lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";

interface StaffingDetails {
  roleGroups?: string[];
  officeStaffRequired?: number;
}

interface RequiredStaffingData {
  dayOfWeek: number; // 0-6 (日曜=0)
  hour: number; // 0-23
  requiredCount: number;
  staffingDetails?: StaffingDetails;
}

interface StaffingCell {
  requiredCount: number;
  staffingDetails?: StaffingDetails;
}

export function RequiredStaffing() {
  const toast = useToast();
  const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const [isLoading, setIsLoading] = useState(true);

  // 24×7のマトリクスデータ（168セル）
  const [staffingMatrix, setStaffingMatrix] = useState<StaffingCell[][]>(() => {
    // 初期値: すべて3人
    return Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ requiredCount: 3 }))
    );
  });

  // 詳細編集ダイアログの状態
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    dayIndex: number;
    hour: number;
  } | null>(null);
  const [editingDetails, setEditingDetails] = useState<StaffingCell>({
    requiredCount: 3,
    staffingDetails: {
      roleGroups: [],
      officeStaffRequired: 0,
    },
  });

  // 利用可能な役職グループ
  const availableRoleGroups = [
    "正社員（夜勤）",
    "正社員（早番）",
    "正社員（日A）",
    "正社員（日B）",
    "正社員（遅番）",
    "正社員（早・日A・日B）",
    "パート",
    "事務員",
  ];

  // データベースからデータを読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await trpcClient.requiredStaffing.list.query();

      // データをマトリクスに変換
      const newMatrix: StaffingCell[][] = Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () => ({ requiredCount: 3 }))
      );

      data.forEach((item: any) => {
        if (
          item.dayOfWeek >= 0 &&
          item.dayOfWeek <= 6 &&
          item.hour >= 0 &&
          item.hour <= 23
        ) {
          newMatrix[item.dayOfWeek][item.hour] = {
            requiredCount: item.requiredCount,
            staffingDetails: item.staffingDetails || undefined,
          };
        }
      });

      setStaffingMatrix(newMatrix);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // セルの値を更新（数字入力時）
  const updateCell = (dayIndex: number, hour: number, value: string) => {
    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex][hour] = {
      ...newMatrix[dayIndex][hour],
      requiredCount: numValue,
    };
    setStaffingMatrix(newMatrix);
  };

  // 詳細編集ダイアログを開く
  const openDetailDialog = (dayIndex: number, hour: number) => {
    setEditingCell({ dayIndex, hour });
    const currentCell = staffingMatrix[dayIndex][hour];
    setEditingDetails({
      requiredCount: currentCell.requiredCount,
      staffingDetails: {
        roleGroups: currentCell.staffingDetails?.roleGroups || [],
        officeStaffRequired: currentCell.staffingDetails?.officeStaffRequired || 0,
      },
    });
    setIsDetailDialogOpen(true);
  };

  // 詳細を保存
  const saveDetails = () => {
    if (!editingCell) return;

    const newMatrix = [...staffingMatrix];
    newMatrix[editingCell.dayIndex][editingCell.hour] = {
      ...editingDetails,
    };
    setStaffingMatrix(newMatrix);
    setIsDetailDialogOpen(false);
    toast.success("詳細設定を更新しました");
  };

  // 役職グループのトグル
  const toggleRoleGroup = (roleGroup: string) => {
    const currentGroups = editingDetails.staffingDetails?.roleGroups || [];
    const newGroups = currentGroups.includes(roleGroup)
      ? currentGroups.filter((g) => g !== roleGroup)
      : [...currentGroups, roleGroup];

    setEditingDetails({
      ...editingDetails,
      staffingDetails: {
        ...editingDetails.staffingDetails,
        roleGroups: newGroups,
      },
    });
  };

  // 行全体（曜日全体）に同じ値を設定
  const fillRow = (dayIndex: number) => {
    const value = prompt(
      `${daysOfWeek[dayIndex]}曜日の全時間帯に設定する人数を入力してください（0-20）:`
    );
    if (value === null) return;

    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex] = Array.from({ length: 24 }, () => ({
      requiredCount: numValue,
    }));
    setStaffingMatrix(newMatrix);
    toast.success(
      `${daysOfWeek[dayIndex]}曜日の全時間帯を${numValue}人に設定しました`
    );
  };

  // 列全体（時間全体）に同じ値を設定
  const fillColumn = (hour: number) => {
    const value = prompt(
      `${hour}時の全曜日に設定する人数を入力してください（0-20）:`
    );
    if (value === null) return;

    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = staffingMatrix.map((row) => {
      const newRow = [...row];
      newRow[hour] = { requiredCount: numValue };
      return newRow;
    });
    setStaffingMatrix(newMatrix);
    toast.success(`${hour}時の全曜日を${numValue}人に設定しました`);
  };

  // 保存処理
  const handleSave = async () => {
    try {
      // データを変換
      const dataToSave: RequiredStaffingData[] = [];
      staffingMatrix.forEach((row, dayIndex) => {
        row.forEach((cell, hour) => {
          dataToSave.push({
            dayOfWeek: dayIndex,
            hour,
            requiredCount: cell.requiredCount,
            staffingDetails: cell.staffingDetails,
          });
        });
      });

      // Promise.all で168回の upsert を実行
      await Promise.all(
        dataToSave.map((data) =>
          trpcClient.requiredStaffing.upsert.mutate(data)
        )
      );

      toast.success("必要人数設定を保存しました");
      await loadData(); // データを再読み込み
    } catch (error: any) {
      console.error("保存エラー:", error);
      toast.error(error.message || "保存に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <UsersRound className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">必要人数設定</h1>
            <p className="text-sm text-muted-foreground">
              曜日と時間帯ごとに必要な職員数を設定します
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          保存
        </Button>
      </div>

      {/* 説明 */}
      <Alert className="rounded-2xl">
        <Info className="h-4 w-4" />
        <AlertDescription>
          各セルに必要な人数（0-20）を入力してください。
          曜日名または時間をクリックすると、その行/列全体に同じ値を一括設定できます。
        </AlertDescription>
      </Alert>

      {/* マトリクステーブル */}
      <Card className="rounded-2xl overflow-auto">
        <div className="min-w-[1400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[80px]">
                  曜日/時間
                </TableHead>
                {hours.map((hour) => (
                  <TableHead
                    key={hour}
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fillColumn(hour)}
                    title="クリックして一括設定"
                  >
                    {hour}時
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysOfWeek.map((day, dayIndex) => (
                <TableRow key={dayIndex}>
                  <TableCell
                    className="sticky left-0 bg-background z-10 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fillRow(dayIndex)}
                    title="クリックして一括設定"
                  >
                    {day}曜日
                  </TableCell>
                  {hours.map((hour) => {
                    const cell = staffingMatrix[dayIndex][hour];
                    const hasDetails =
                      cell.staffingDetails &&
                      (cell.staffingDetails.roleGroups?.length || 0) > 0;
                    const hasOfficeStaff =
                      cell.staffingDetails?.officeStaffRequired === 1;

                    return (
                      <TableCell key={hour} className="p-1">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={cell.requiredCount}
                            onChange={(e) =>
                              updateCell(dayIndex, hour, e.target.value)
                            }
                            className="w-16 h-9 text-center rounded-lg pr-7"
                          />
                          <button
                            onClick={() => openDetailDialog(dayIndex, hour)}
                            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/80 ${
                              hasDetails || hasOfficeStaff
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                            title="詳細設定"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          {hasOfficeStaff && (
                            <Badge
                              variant="secondary"
                              className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-1 py-0 h-3.5"
                            >
                              事務
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ヒント */}
      <div className="bg-muted/30 rounded-2xl p-4">
        <h3 className="text-sm mb-2 text-gray-900">使い方のヒント</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• 各セルに直接数値を入力できます（0-20）</li>
          <li>
            • セルの右側の
            <Settings2 className="w-3 h-3 inline mx-1" />
            アイコンをクリックすると、役職グループや事務員配置を設定できます
          </li>
          <li>
            • 曜日名をクリックすると、その曜日の全時間帯に同じ値を設定できます
          </li>
          <li>
            • 時間をクリックすると、その時間の全曜日に同じ値を設定できます
          </li>
          <li>• 設定後は必ず「保存」ボタンをクリックしてください</li>
        </ul>
      </div>

      {/* 詳細編集ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCell &&
                `${daysOfWeek[editingCell.dayIndex]}曜日 ${
                  editingCell.hour
                }時の詳細設定`}
            </DialogTitle>
            <DialogDescription>
              必要人数、役職グループ、事務員配置を設定します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 必要人数 */}
            <div className="space-y-2">
              <Label htmlFor="requiredCount">必要人数</Label>
              <Input
                id="requiredCount"
                type="number"
                min="0"
                max="20"
                value={editingDetails.requiredCount}
                onChange={(e) =>
                  setEditingDetails({
                    ...editingDetails,
                    requiredCount: parseInt(e.target.value) || 0,
                  })
                }
                className="rounded-xl"
              />
            </div>

            {/* 役職グループ */}
            <div className="space-y-3">
              <Label>必要な役職グループ</Label>
              <div className="space-y-2">
                {availableRoleGroups.map((group) => (
                  <div key={group} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group}`}
                      checked={
                        editingDetails.staffingDetails?.roleGroups?.includes(
                          group
                        ) || false
                      }
                      onCheckedChange={() => toggleRoleGroup(group)}
                    />
                    <label
                      htmlFor={`group-${group}`}
                      className="text-sm cursor-pointer"
                    >
                      {group}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 事務員配置 */}
            <div className="space-y-3">
              <Label>事務員配置</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="officeStaff"
                  checked={
                    editingDetails.staffingDetails?.officeStaffRequired === 1
                  }
                  onCheckedChange={(checked: boolean) =>
                    setEditingDetails({
                      ...editingDetails,
                      staffingDetails: {
                        ...editingDetails.staffingDetails,
                        officeStaffRequired: checked ? 1 : 0,
                      },
                    })
                  }
                />
                <label htmlFor="officeStaff" className="text-sm cursor-pointer">
                  事務員を1名配置する（必要人数とは別カウント）
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                ※
                事務員の人数は「必要人数」には含まれません。独立して管理されます。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button onClick={saveDetails} className="rounded-xl">
              設定を保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
