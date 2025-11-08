import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RuleValues {
  maxConsecutiveWorkDays?: number;
  minRestDaysPerWeek?: number;
  maxNightShiftsPerWeek?: number;
  minRestHoursBetweenShifts?: number;
}

export default function WorkplaceRules() {
  const [fulltimeRules, setFulltimeRules] = useState<RuleValues>({
    maxConsecutiveWorkDays: 5,
    minRestDaysPerWeek: 2,
    maxNightShiftsPerWeek: 3,
    minRestHoursBetweenShifts: 11,
  });

  const [parttimeRules, setParttimeRules] = useState<RuleValues>({
    maxConsecutiveWorkDays: 5,
    minRestDaysPerWeek: 2,
    maxNightShiftsPerWeek: 2,
    minRestHoursBetweenShifts: 11,
  });

  const { data: existingRules, isLoading } = trpc.workplaceRules.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.workplaceRules.create.useMutation({
    onSuccess: () => {
      toast.success("職場ルールを保存しました");
      utils.workplaceRules.list.invalidate();
    },
    onError: (error) => {
      toast.error("職場ルールの保存に失敗しました: " + error.message);
    },
  });

  const updateMutation = trpc.workplaceRules.update.useMutation({
    onSuccess: () => {
      toast.success("職場ルールを更新しました");
      utils.workplaceRules.list.invalidate();
    },
    onError: (error) => {
      toast.error("職場ルールの更新に失敗しました: " + error.message);
    },
  });

  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      existingRules.forEach((rule) => {
        const ruleValue = rule.ruleValue as RuleValues;
        if (rule.employmentType === "fulltime") {
          setFulltimeRules(ruleValue);
        } else if (rule.employmentType === "parttime") {
          setParttimeRules(ruleValue);
        }
      });
    }
  }, [existingRules]);

  const handleSave = (employmentType: "fulltime" | "parttime") => {
    const rules = employmentType === "fulltime" ? fulltimeRules : parttimeRules;
    const existingRule = existingRules?.find((r) => r.employmentType === employmentType);

    const data = {
      ruleType: "min_rest_days" as const,
      employmentType,
      ruleValue: rules,
      description: `${employmentType === "fulltime" ? "正社員" : "パート"}の勤務ルール`,
      isActive: true,
    };

    if (existingRule) {
      updateMutation.mutate({
        id: existingRule.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
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
        <div>
          <h1 className="text-3xl font-bold">職場ルール設定</h1>
          <p className="text-muted-foreground mt-2">正社員とパートの勤務ルールを設定</p>
        </div>

        <Tabs defaultValue="fulltime" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="fulltime">正社員</TabsTrigger>
            <TabsTrigger value="parttime">パート</TabsTrigger>
          </TabsList>

          <TabsContent value="fulltime">
            <Card>
              <CardHeader>
                <CardTitle>正社員の勤務ルール</CardTitle>
                <CardDescription>正社員に適用される勤務制約を設定します</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fulltime-maxConsecutive">最大連続勤務日数</Label>
                    <Input
                      id="fulltime-maxConsecutive"
                      type="number"
                      min="1"
                      max="14"
                      value={fulltimeRules.maxConsecutiveWorkDays || 5}
                      onChange={(e) =>
                        setFulltimeRules({
                          ...fulltimeRules,
                          maxConsecutiveWorkDays: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">連続して勤務できる最大日数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fulltime-minRest">週の最低休日数</Label>
                    <Input
                      id="fulltime-minRest"
                      type="number"
                      min="1"
                      max="7"
                      value={fulltimeRules.minRestDaysPerWeek || 2}
                      onChange={(e) =>
                        setFulltimeRules({
                          ...fulltimeRules,
                          minRestDaysPerWeek: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">1週間に必要な最低休日数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fulltime-maxNight">週の最大夜勤回数</Label>
                    <Input
                      id="fulltime-maxNight"
                      type="number"
                      min="0"
                      max="7"
                      value={fulltimeRules.maxNightShiftsPerWeek || 3}
                      onChange={(e) =>
                        setFulltimeRules({
                          ...fulltimeRules,
                          maxNightShiftsPerWeek: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">1週間に入れる最大夜勤回数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fulltime-restHours">シフト間最低休憩時間</Label>
                    <Input
                      id="fulltime-restHours"
                      type="number"
                      min="8"
                      max="24"
                      value={fulltimeRules.minRestHoursBetweenShifts || 11}
                      onChange={(e) =>
                        setFulltimeRules({
                          ...fulltimeRules,
                          minRestHoursBetweenShifts: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">シフト間に必要な最低休憩時間（時間）</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave("fulltime")}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parttime">
            <Card>
              <CardHeader>
                <CardTitle>パートの勤務ルール</CardTitle>
                <CardDescription>パートに適用される勤務制約を設定します</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="parttime-maxConsecutive">最大連続勤務日数</Label>
                    <Input
                      id="parttime-maxConsecutive"
                      type="number"
                      min="1"
                      max="14"
                      value={parttimeRules.maxConsecutiveWorkDays || 5}
                      onChange={(e) =>
                        setParttimeRules({
                          ...parttimeRules,
                          maxConsecutiveWorkDays: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">連続して勤務できる最大日数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parttime-minRest">週の最低休日数</Label>
                    <Input
                      id="parttime-minRest"
                      type="number"
                      min="1"
                      max="7"
                      value={parttimeRules.minRestDaysPerWeek || 2}
                      onChange={(e) =>
                        setParttimeRules({
                          ...parttimeRules,
                          minRestDaysPerWeek: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">1週間に必要な最低休日数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parttime-maxNight">週の最大夜勤回数</Label>
                    <Input
                      id="parttime-maxNight"
                      type="number"
                      min="0"
                      max="7"
                      value={parttimeRules.maxNightShiftsPerWeek || 2}
                      onChange={(e) =>
                        setParttimeRules({
                          ...parttimeRules,
                          maxNightShiftsPerWeek: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">1週間に入れる最大夜勤回数</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parttime-restHours">シフト間最低休憩時間</Label>
                    <Input
                      id="parttime-restHours"
                      type="number"
                      min="8"
                      max="24"
                      value={parttimeRules.minRestHoursBetweenShifts || 11}
                      onChange={(e) =>
                        setParttimeRules({
                          ...parttimeRules,
                          minRestHoursBetweenShifts: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">シフト間に必要な最低休憩時間（時間）</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave("parttime")}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
