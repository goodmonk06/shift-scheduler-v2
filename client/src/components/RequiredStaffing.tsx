import { useState, useEffect } from "react";
import { UsersRound, Save, Info } from "lucide-react";
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
import { toast } from "sonner";

interface RequiredStaffingData {
  dayOfWeek: number; // 0-6 (日曜=0)
  hour: number; // 0-23
  requiredCount: number;
}

export function RequiredStaffing() {
  const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 24×7のマトリクスデータ（168セル）
  const [staffingMatrix, setStaffingMatrix] = useState<number[][]>(() => {
    // 初期値: すべて3人
    return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 3));
  });

  // セルの値を更新
  const updateCell = (dayIndex: number, hour: number, value: string) => {
    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex][hour] = numValue;
    setStaffingMatrix(newMatrix);
  };

  // 行全体（曜日全体）に同じ値を設定
  const fillRow = (dayIndex: number) => {
    const value = prompt(`${daysOfWeek[dayIndex]}曜日の全時間帯に設定する人数を入力してください（0-20）:`);
    if (value === null) return;

    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex] = Array.from({ length: 24 }, () => numValue);
    setStaffingMatrix(newMatrix);
    toast.success(`${daysOfWeek[dayIndex]}曜日の全時間帯を${numValue}人に設定しました`);
  };

  // 列全体（時間全体）に同じ値を設定
  const fillColumn = (hour: number) => {
    const value = prompt(`${hour}時の全曜日に設定する人数を入力してください（0-20）:`);
    if (value === null) return;

    const numValue = Math.max(0, Math.min(20, parseInt(value) || 0));
    const newMatrix = staffingMatrix.map((row) => {
      const newRow = [...row];
      newRow[hour] = numValue;
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
        row.forEach((count, hour) => {
          dataToSave.push({
            dayOfWeek: dayIndex,
            hour,
            requiredCount: count,
          });
        });
      });

      // ここでAPI呼び出し: Promise.all で168回の upsert を実行
      // await Promise.all(
      //   dataToSave.map(data => trpc.requiredStaffing.upsert.mutate(data))
      // );

      toast.success("必要人数設定を保存しました");
    } catch (error) {
      toast.error("保存に失敗しました");
    }
  };

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
                  {hours.map((hour) => (
                    <TableCell key={hour} className="p-1">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={staffingMatrix[dayIndex][hour]}
                        onChange={(e) =>
                          updateCell(dayIndex, hour, e.target.value)
                        }
                        className="w-16 h-9 text-center rounded-lg"
                      />
                    </TableCell>
                  ))}
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
          <li>• 曜日名をクリックすると、その曜日の全時間帯に同じ値を設定できます</li>
          <li>• 時間をクリックすると、その時間の全曜日に同じ値を設定できます</li>
          <li>• 設定後は必ず「保存」ボタンをクリックしてください</li>
        </ul>
      </div>
    </div>
  );
}
