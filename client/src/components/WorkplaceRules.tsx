import { useState } from "react";
import { Settings, Save, Briefcase, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "../hooks/useToast";

interface WorkplaceRule {
  employmentType: "fulltime" | "parttime";
  maxConsecutiveWorkDays: number;
  minRestDaysPerWeek: number;
  maxNightShiftsPerWeek: number;
  minRestHoursBetweenShifts: number;
}

export function WorkplaceRules() {
  const toast = useToast();
  // モックデータ（後でAPI連携）
  const [rules, setRules] = useState<Record<"fulltime" | "parttime", WorkplaceRule>>({
    fulltime: {
      employmentType: "fulltime",
      maxConsecutiveWorkDays: 5,
      minRestDaysPerWeek: 2,
      maxNightShiftsPerWeek: 3,
      minRestHoursBetweenShifts: 11,
    },
    parttime: {
      employmentType: "parttime",
      maxConsecutiveWorkDays: 5,
      minRestDaysPerWeek: 2,
      maxNightShiftsPerWeek: 2,
      minRestHoursBetweenShifts: 11,
    },
  });

  const [activeTab, setActiveTab] = useState<"fulltime" | "parttime">("fulltime");

  // フォームの状態を更新
  const handleInputChange = (
    employmentType: "fulltime" | "parttime",
    field: keyof Omit<WorkplaceRule, "employmentType">,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setRules({
      ...rules,
      [employmentType]: {
        ...rules[employmentType],
        [field]: numValue,
      },
    });
  };

  // 保存処理
  const handleSave = (employmentType: "fulltime" | "parttime") => {
    const rule = rules[employmentType];

    // バリデーション
    if (
      rule.maxConsecutiveWorkDays < 1 ||
      rule.maxConsecutiveWorkDays > 14
    ) {
      toast.error("最大連続勤務日数は1〜14日の範囲で設定してください");
      return;
    }
    if (rule.minRestDaysPerWeek < 1 || rule.minRestDaysPerWeek > 7) {
      toast.error("週の最低休日数は1〜7日の範囲で設定してください");
      return;
    }
    if (rule.maxNightShiftsPerWeek < 0 || rule.maxNightShiftsPerWeek > 7) {
      toast.error("週の最大夜勤回数は0〜7回の範囲で設定してください");
      return;
    }
    if (
      rule.minRestHoursBetweenShifts < 8 ||
      rule.minRestHoursBetweenShifts > 24
    ) {
      toast.error("シフト間最低休憩時間は8〜24時間の範囲で設定してください");
      return;
    }

    // ここでAPI呼び出し: trpc.workplaceRules.create または update
    toast.success(
      `${employmentType === "fulltime" ? "正社員" : "パート"}のルールを保存しました`
    );
  };

  const renderRuleForm = (employmentType: "fulltime" | "parttime") => {
    const rule = rules[employmentType];
    const label = employmentType === "fulltime" ? "正社員" : "パート";

    return (
      <div className="space-y-6">
        <Card className="p-6 rounded-2xl">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg mb-2 text-gray-900">{label}の勤務ルール</h3>
              <p className="text-sm text-muted-foreground">
                {label}の勤務に関するルールを設定します
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${employmentType}-maxConsecutiveWorkDays`}>
                  最大連続勤務日数
                </Label>
                <Input
                  id={`${employmentType}-maxConsecutiveWorkDays`}
                  type="number"
                  min="1"
                  max="14"
                  value={rule.maxConsecutiveWorkDays}
                  onChange={(e) =>
                    handleInputChange(
                      employmentType,
                      "maxConsecutiveWorkDays",
                      e.target.value
                    )
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  連続して勤務できる最大日数（1〜14日）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${employmentType}-minRestDaysPerWeek`}>
                  週の最低休日数
                </Label>
                <Input
                  id={`${employmentType}-minRestDaysPerWeek`}
                  type="number"
                  min="1"
                  max="7"
                  value={rule.minRestDaysPerWeek}
                  onChange={(e) =>
                    handleInputChange(
                      employmentType,
                      "minRestDaysPerWeek",
                      e.target.value
                    )
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  1週間に必要な最低休日数（1〜7日）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${employmentType}-maxNightShiftsPerWeek`}>
                  週の最大夜勤回数
                </Label>
                <Input
                  id={`${employmentType}-maxNightShiftsPerWeek`}
                  type="number"
                  min="0"
                  max="7"
                  value={rule.maxNightShiftsPerWeek}
                  onChange={(e) =>
                    handleInputChange(
                      employmentType,
                      "maxNightShiftsPerWeek",
                      e.target.value
                    )
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  1週間に入れる最大夜勤回数（0〜7回）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${employmentType}-minRestHoursBetweenShifts`}>
                  シフト間最低休憩時間（時間）
                </Label>
                <Input
                  id={`${employmentType}-minRestHoursBetweenShifts`}
                  type="number"
                  min="8"
                  max="24"
                  value={rule.minRestHoursBetweenShifts}
                  onChange={(e) =>
                    handleInputChange(
                      employmentType,
                      "minRestHoursBetweenShifts",
                      e.target.value
                    )
                  }
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  シフト間に必要な最低休憩時間（8〜24時間）
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => handleSave(employmentType)}
                className="rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10">
          <Settings className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl text-gray-900">職場ルール設定</h1>
          <p className="text-sm text-muted-foreground">
            正社員とパートの勤務ルールを設定します
          </p>
        </div>
      </div>

      {/* タブ */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "fulltime" | "parttime")}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="fulltime" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            正社員
          </TabsTrigger>
          <TabsTrigger value="parttime" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            パート
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fulltime" className="mt-6">
          {renderRuleForm("fulltime")}
        </TabsContent>

        <TabsContent value="parttime" className="mt-6">
          {renderRuleForm("parttime")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
