import { useState } from "react";
import { Clock, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { WorkPreferenceRequest } from "./WorkPreferenceRequest";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { LoadingInline } from "./ui/loading-spinner";
import { EmptyState, ErrorState } from "./ui/error-state";
import { trpcClient } from "../lib/trpc";

export function WorkPreferenceManagement() {
  const toast = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // 次月の年月を計算
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthYear = nextMonth.getFullYear();
  const nextMonthNum = nextMonth.getMonth() + 1;

  // 現在のシフト情報を取得
  const {
    data: currentShift,
    isLoading: isLoadingShift,
    isError: isShiftError,
    error: shiftError,
  } = useAsync(
    async () => {
      return await trpcClient.shifts.getCurrentMonth.query({
        year: nextMonthYear,
        month: nextMonthNum
      });
    },
    {
      onError: (error) => {
        console.error("シフト情報の取得に失敗:", error);
      },
    }
  );

  // 従業員データを取得
  const {
    data: employeesData,
    isLoading: isLoadingEmployees,
    isError: isEmployeesError,
    error: employeesError,
  } = useAsync(
    async () => {
      return await trpcClient.employees.list.query();
    },
    {
      onError: () => toast.error("従業員データの取得に失敗しました"),
    }
  );

  const employees = employeesData || [];
  const currentShiftId = currentShift?.id || 1;

  if (isLoadingShift || isLoadingEmployees) {
    return (
      <div className="p-6">
        <LoadingInline message="データを読み込み中..." />
      </div>
    );
  }

  if (isShiftError) {
    return (
      <div className="p-6">
        <ErrorState
          title="シフト情報の取得に失敗しました"
          message={shiftError?.message || "不明なエラーが発生しました"}
        />
      </div>
    );
  }

  if (isEmployeesError) {
    return (
      <div className="p-6">
        <ErrorState
          title="従業員データの取得に失敗しました"
          message={employeesError?.message || "不明なエラーが発生しました"}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/10">
          <Clock className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">時間指定勤務希望管理</h1>
          <p className="text-sm text-muted-foreground">
            職員ごとに時間指定勤務希望を設定できます
          </p>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="select" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="select" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            職員選択
          </TabsTrigger>
          {selectedEmployeeId && (
            <TabsTrigger value="input" className="rounded-lg">
              <Clock className="w-4 h-4 mr-2" />
              時間指定入力
            </TabsTrigger>
          )}
        </TabsList>

        {/* 職員選択タブ */}
        <TabsContent value="select" className="space-y-4">
          <Card className="p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-4">職員を選択してください</h2>

            {employees.length === 0 ? (
              <EmptyState
                title="職員が登録されていません"
                message="職員管理から職員を登録してください"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee: any) => (
                  <button
                    key={employee.id}
                    onClick={() => {
                      setSelectedEmployeeId(employee.id);
                      // タブを切り替える
                      const tabTrigger = document.querySelector('[value="input"]') as HTMLElement;
                      if (tabTrigger) tabTrigger.click();
                    }}
                    className="p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                  >
                    <div className="font-semibold text-gray-900">{employee.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {employee.positionGroup?.name || ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* 時間指定入力タブ */}
        <TabsContent value="input">
          {selectedEmployeeId && (
            <WorkPreferenceRequest
              employeeId={selectedEmployeeId}
              employeeName={
                employees.find((e: any) => e.id === selectedEmployeeId)?.name || ""
              }
              shiftId={currentShiftId}
              year={nextMonthYear}
              month={nextMonthNum}
              onClose={() => {
                setSelectedEmployeeId(null);
                // タブを戻す
                const tabTrigger = document.querySelector('[value="select"]') as HTMLElement;
                if (tabTrigger) tabTrigger.click();
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
