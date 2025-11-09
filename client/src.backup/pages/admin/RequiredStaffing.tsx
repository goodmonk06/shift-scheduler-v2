import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function RequiredStaffing() {
  // 24時間×7曜日のマトリクス（初期値は2人）
  const [staffingMatrix, setStaffingMatrix] = useState<number[][]>(
    Array(7).fill(null).map(() => Array(24).fill(2))
  );

  const { data: existingStaffing, isLoading } = trpc.requiredStaffing.list.useQuery();
  const utils = trpc.useUtils();

  const upsertMutation = trpc.requiredStaffing.upsert.useMutation({
    onSuccess: () => {
      // 個別の成功メッセージは表示しない
    },
    onError: (error: any) => {
      toast.error("必要人数の保存に失敗しました: " + error.message);
    },
  });

  useEffect(() => {
    if (existingStaffing && existingStaffing.length > 0) {
      const newMatrix = Array(7).fill(null).map(() => Array(24).fill(2));
      existingStaffing.forEach((staff) => {
        if (staff.dayOfWeek !== null && staff.hour !== null) {
          newMatrix[staff.dayOfWeek][staff.hour] = staff.requiredCount;
        }
      });
      setStaffingMatrix(newMatrix);
    }
  }, [existingStaffing]);

  const handleCellChange = (dayIndex: number, hour: number, value: string) => {
    const newValue = parseInt(value) || 0;
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex][hour] = newValue;
    setStaffingMatrix(newMatrix);
  };

  const handleSaveAll = async () => {
    const promises: Promise<any>[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (let hour = 0; hour < 24; hour++) {
        const requiredCount = staffingMatrix[dayIndex][hour];
        promises.push(
          upsertMutation.mutateAsync({
            dayOfWeek: dayIndex,
            hour,
            requiredCount,
          })
        );
      }
    }

    try {
      await Promise.all(promises);
      toast.success("すべての必要人数を保存しました");
      utils.requiredStaffing.list.invalidate();
    } catch (error) {
      toast.error("保存中にエラーが発生しました");
    }
  };

  const fillRow = (dayIndex: number, value: number) => {
    const newMatrix = [...staffingMatrix];
    newMatrix[dayIndex] = Array(24).fill(value);
    setStaffingMatrix(newMatrix);
  };

  const fillColumn = (hour: number, value: number) => {
    const newMatrix = [...staffingMatrix];
    for (let i = 0; i < 7; i++) {
      newMatrix[i][hour] = value;
    }
    setStaffingMatrix(newMatrix);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">必要人数設定</h1>
            <p className="text-muted-foreground mt-2">24時間×7曜日の必要人数を設定</p>
          </div>
          <Button onClick={handleSaveAll} disabled={upsertMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            すべて保存
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>必要人数マトリクス</CardTitle>
            <CardDescription>
              各曜日・時間帯に必要な職員数を入力してください。行・列をクリックすると一括入力できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                <div className="grid grid-cols-[80px_repeat(24,_minmax(40px,_1fr))] gap-1">
                  {/* ヘッダー行（時間） */}
                  <div className="font-bold text-center p-2">曜日/時</div>
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="font-bold text-center p-2 text-xs cursor-pointer hover:bg-accent rounded"
                      onClick={() => {
                        const value = prompt(`${hour}時の全曜日に設定する人数を入力してください:`, "2");
                        if (value) fillColumn(hour, parseInt(value) || 2);
                      }}
                      title={`${hour}時の列を一括設定`}
                    >
                      {hour}
                    </div>
                  ))}

                  {/* データ行 */}
                  {DAYS.map((day, dayIndex) => (
                    <div key={dayIndex} className="contents">
                      <div
                        className="font-bold text-center p-2 cursor-pointer hover:bg-accent rounded"
                        onClick={() => {
                          const value = prompt(`${day}曜日の全時間に設定する人数を入力してください:`, "2");
                          if (value) fillRow(dayIndex, parseInt(value) || 2);
                        }}
                        title={`${day}曜日の行を一括設定`}
                      >
                        {day}
                      </div>
                      {HOURS.map((hour) => (
                        <Input
                          key={`${dayIndex}-${hour}`}
                          type="number"
                          min="0"
                          max="20"
                          value={staffingMatrix[dayIndex][hour]}
                          onChange={(e) => handleCellChange(dayIndex, hour, e.target.value)}
                          className="text-center p-1 h-10"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">使い方</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 各セルに必要な職員数を入力してください</li>
                <li>• 曜日名をクリックすると、その曜日の全時間帯を一括設定できます</li>
                <li>• 時間をクリックすると、その時間の全曜日を一括設定できます</li>
                <li>• 入力後、「すべて保存」ボタンで保存してください</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
