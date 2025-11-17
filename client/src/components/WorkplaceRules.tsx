import { useState, useEffect } from "react";
import { Settings, Save, Moon, Calendar, Users, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "../hooks/useToast";
import { trpcClient } from "../lib/trpc";
import { Separator } from "./ui/separator";

interface WorkplaceRulesData {
  // 夜勤ルール
  nightShiftRequired: number; // 必要人数
  nightShiftStart: string; // 開始時刻
  nightShiftEnd: string; // 終了時刻
  nightShiftRestDays: number; // 夜勤明け後の休み日数

  // 連勤・休日ルール
  maxConsecutiveDays: number; // 最大連勤日数
  fulltimeMinDaysOff: number; // 正社員の月間公休日数
  fulltimeMinDaysOffFeb: number; // 2月の公休日数

  // 正社員配置ルール
  fulltimeRequiredStart: string; // 配置必須開始時刻
  fulltimeRequiredEnd: string; // 配置必須終了時刻
  fulltimeRequiredCount: number; // 最低人数
}

export function WorkplaceRules() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [rules, setRules] = useState<WorkplaceRulesData>({
    nightShiftRequired: 1,
    nightShiftStart: "16:00",
    nightShiftEnd: "09:00",
    nightShiftRestDays: 2,
    maxConsecutiveDays: 4,
    fulltimeMinDaysOff: 9,
    fulltimeMinDaysOffFeb: 8,
    fulltimeRequiredStart: "09:00",
    fulltimeRequiredEnd: "16:00",
    fulltimeRequiredCount: 1,
  });

  // データ読み込み
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const allRules = await trpcClient.workplaceRules.list.query();

      // ルールを整形
      const ruleMap: Partial<WorkplaceRulesData> = {};

      allRules.forEach((rule: any) => {
        const value = rule.ruleValue;

        switch (rule.ruleType) {
          case "night_shift_quota":
            ruleMap.nightShiftRequired = value.requiredCount || 1;
            ruleMap.nightShiftStart = value.startTime || "16:00";
            ruleMap.nightShiftEnd = value.endTime || "09:00";
            break;
          case "post_night_shift_rest":
            ruleMap.nightShiftRestDays = value.restDays || 2;
            break;
          case "max_consecutive_days":
            ruleMap.maxConsecutiveDays = value.maxDays || 4;
            break;
          case "min_rest_days":
            ruleMap.fulltimeMinDaysOff = value.daysPerMonth || 9;
            ruleMap.fulltimeMinDaysOffFeb = value.daysPerMonthFeb || 8;
            break;
          case "fulltime_required_hours":
            ruleMap.fulltimeRequiredStart = value.startTime || "09:00";
            ruleMap.fulltimeRequiredEnd = value.endTime || "16:00";
            ruleMap.fulltimeRequiredCount = value.minCount || 1;
            break;
        }
      });

      setRules(prev => ({ ...prev, ...ruleMap }));
    } catch (error) {
      console.error("Failed to load workplace rules:", error);
      toast.error("職場ルールの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // バリデーション
      if (rules.maxConsecutiveDays < 1 || rules.maxConsecutiveDays > 14) {
        toast.error("最大連勤日数は1〜14日の範囲で設定してください");
        return;
      }

      // データベースに保存
      await trpcClient.workplaceRules.upsert.mutate({
        rules: [
          {
            ruleType: "night_shift_quota",
            employmentType: "all",
            ruleValue: {
              requiredCount: rules.nightShiftRequired,
              startTime: rules.nightShiftStart,
              endTime: rules.nightShiftEnd,
            },
            description: `夜勤必要人数: ${rules.nightShiftRequired}名 (${rules.nightShiftStart}～${rules.nightShiftEnd})`,
          },
          {
            ruleType: "post_night_shift_rest",
            employmentType: "all",
            ruleValue: {
              restDays: rules.nightShiftRestDays,
            },
            description: "夜勤入り翌日=夜勤明け、夜勤明け翌日=休み",
          },
          {
            ruleType: "max_consecutive_days",
            employmentType: "all",
            ruleValue: {
              maxDays: rules.maxConsecutiveDays,
            },
            description: `連勤上限${rules.maxConsecutiveDays}日（夜勤入り～夜勤明け=2連勤扱い）`,
          },
          {
            ruleType: "min_rest_days",
            employmentType: "fulltime",
            ruleValue: {
              daysPerMonth: rules.fulltimeMinDaysOff,
              daysPerMonthFeb: rules.fulltimeMinDaysOffFeb,
            },
            description: `正社員の公休日数: ${rules.fulltimeMinDaysOff}日/月（2月は${rules.fulltimeMinDaysOffFeb}日）`,
          },
          {
            ruleType: "fulltime_required_hours",
            employmentType: "fulltime",
            ruleValue: {
              startTime: rules.fulltimeRequiredStart,
              endTime: rules.fulltimeRequiredEnd,
              minCount: rules.fulltimeRequiredCount,
            },
            description: `${rules.fulltimeRequiredStart}～${rules.fulltimeRequiredEnd}の間、最低${rules.fulltimeRequiredCount}名は正社員を配置`,
          },
        ],
      });

      toast.success("職場ルールを保存しました");
    } catch (error: any) {
      console.error("Failed to save workplace rules:", error);
      toast.error(error.message || "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10">
            <Settings className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">職場ルール設定</h1>
            <p className="text-sm text-muted-foreground">
              シフト自動生成時に参照されるルールを設定します
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* セクション1: 夜勤ルール */}
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">夜勤ルール</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nightShiftStart">夜勤開始時刻</Label>
                <Input
                  id="nightShiftStart"
                  type="time"
                  value={rules.nightShiftStart}
                  onChange={(e) =>
                    setRules({ ...rules, nightShiftStart: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nightShiftEnd">夜勤終了時刻（翌日）</Label>
                <Input
                  id="nightShiftEnd"
                  type="time"
                  value={rules.nightShiftEnd}
                  onChange={(e) =>
                    setRules({ ...rules, nightShiftEnd: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nightShiftRequired">必要人数</Label>
                <Input
                  id="nightShiftRequired"
                  type="number"
                  min="1"
                  value={rules.nightShiftRequired}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      nightShiftRequired: parseInt(e.target.value) || 1,
                    })
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">夜勤に必要な人数</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="nightShiftRestDays">夜勤明け後の休み日数</Label>
              <Input
                id="nightShiftRestDays"
                type="number"
                min="1"
                max="3"
                value={rules.nightShiftRestDays}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    nightShiftRestDays: parseInt(e.target.value) || 2,
                  })
                }
                className="rounded-xl max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                夜勤入り翌日=夜勤明け、夜勤明け翌日=休み（デフォルト: 2日）
              </p>
            </div>
          </div>
        </Card>

        {/* セクション2: 連勤・休日ルール */}
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">連勤・休日ルール</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxConsecutiveDays">最大連勤日数</Label>
              <Input
                id="maxConsecutiveDays"
                type="number"
                min="1"
                max="14"
                value={rules.maxConsecutiveDays}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    maxConsecutiveDays: parseInt(e.target.value) || 4,
                  })
                }
                className="rounded-xl max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                夜勤入り～夜勤明け=2連勤扱い、前月末3日間を考慮
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fulltimeMinDaysOff">正社員の月間公休日数</Label>
                <Input
                  id="fulltimeMinDaysOff"
                  type="number"
                  min="0"
                  max="31"
                  value={rules.fulltimeMinDaysOff}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      fulltimeMinDaysOff: parseInt(e.target.value) || 9,
                    })
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  正社員の1ヶ月の公休日数（通常月）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fulltimeMinDaysOffFeb">2月の公休日数</Label>
                <Input
                  id="fulltimeMinDaysOffFeb"
                  type="number"
                  min="0"
                  max="29"
                  value={rules.fulltimeMinDaysOffFeb}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      fulltimeMinDaysOffFeb: parseInt(e.target.value) || 8,
                    })
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  2月の公休日数（日数が少ないため）
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* セクション3: 正社員配置ルール */}
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">正社員配置ルール</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fulltimeRequiredStart">配置必須開始時刻</Label>
                <Input
                  id="fulltimeRequiredStart"
                  type="time"
                  value={rules.fulltimeRequiredStart}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      fulltimeRequiredStart: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fulltimeRequiredEnd">配置必須終了時刻</Label>
                <Input
                  id="fulltimeRequiredEnd"
                  type="time"
                  value={rules.fulltimeRequiredEnd}
                  onChange={(e) =>
                    setRules({ ...rules, fulltimeRequiredEnd: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fulltimeRequiredCount">最低人数</Label>
                <Input
                  id="fulltimeRequiredCount"
                  type="number"
                  min="1"
                  value={rules.fulltimeRequiredCount}
                  onChange={(e) =>
                    setRules({
                      ...rules,
                      fulltimeRequiredCount: parseInt(e.target.value) || 1,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              指定時間帯には、最低限この人数の正社員を配置する必要があります
            </p>
          </div>
        </Card>

        {/* AI参照情報 */}
        <Card className="p-4 rounded-2xl bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">AI自動生成への反映</p>
              <p className="text-blue-800">
                ここで設定したルールは、シフト自動生成時にAIが参照して、ルールに準拠したシフトを作成します。
                変更後は必ず「保存」ボタンをクリックしてください。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
