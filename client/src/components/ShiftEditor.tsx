// ShiftEditor Component - Updated UI with larger buttons
import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Save, FileDown, AlertCircle,
  ChevronLeft, ChevronRight, Settings, MessageSquare,
  CheckCircle, AlertTriangle, Info, Calendar, Zap, Send, Users
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { ShiftData, ShiftAssignment, AIGenerationConfig, Employee } from "../types/shiftTypes";
import type { ShiftStatus } from "../types/api";
import { ShiftCalendarView } from "./ShiftCalendarView";
import { ShiftTableView } from "./ShiftTableView";
import { ShiftTableV2 } from "./ShiftTableV2";
import { ShiftCellEditor } from "./ShiftCellEditor";
import { ShiftPDFView } from "./ShiftPDFView";
import { WorkflowDashboard } from "./admin/WorkflowDashboard";
import type { ShiftCell, EmployeeRowData, DaySummary } from "../types/shiftV2Types";
import { getCellKey, getDateRange, SHIFT_TYPE_MASTER } from "../types/shiftV2Types";
import { getStatusLabel, getStatusBadgeVariant, getDaysInMonth, isReadOnlyStatus } from "../utils/shiftHelpers";
import { convertAssignmentsToCellsMap, calculateDaySummaries } from "../utils/shiftV2Mappers";
import { useToast } from "../hooks/useToast";
import { LoadingInline } from "./ui/loading-spinner";
import { trpcClient } from "../lib/trpc";
import { useMutation } from "../hooks/useAsync";
import { shiftService } from "../services/shiftService";

interface ShiftEditorProps {
  shiftId?: string;
  onBack?: () => void;
}

export function ShiftEditor({ shiftId, onBack }: ShiftEditorProps = {}) {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [currentShift, setCurrentShift] = useState<ShiftData>({
    id: shiftId || "shift-demo",
    year: currentYear,
    month: currentMonth,
    status: "vacation_only",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [viewMode, setViewMode] = useState<"table" | "calendar" | "workflow" | "table-v2">("table-v2");
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [isLoadingShift, setIsLoadingShift] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);

  // シフトデータをロードする関数（成功後の再取得にも使用）
  const loadShiftData = useCallback(async () => {
    console.log('[ShiftEditor] shiftId:', shiftId);
    if (shiftId) {
      try {
        setIsLoadingShift(true);
        console.log('[ShiftEditor] Fetching shift data for ID:', shiftId);
        const shiftData = await shiftService.getShiftById(Number(shiftId));
        console.log('[ShiftEditor] Fetched shift data:', shiftData);
        if (shiftData) {
          // シフトデータを設定
          const newShift = {
            id: shiftData.id.toString(),
            year: shiftData.year,
            month: shiftData.month,
            status: shiftData.status as ShiftStatus,
            createdAt: shiftData.createdAt.toString(),
            updatedAt: shiftData.updatedAt.toString(),
          };
          console.log('[ShiftEditor] Setting currentShift:', newShift);
          setCurrentShift(newShift);
          // 表示年月も更新
          console.log('[ShiftEditor] Setting viewYear/viewMonth:', shiftData.year, shiftData.month);
          setViewYear(shiftData.year);
          setViewMonth(shiftData.month);
        } else {
          console.warn('[ShiftEditor] Shift not found');
          toast.error("シフトが見つかりませんでした");
        }
      } catch (error) {
        console.error('[ShiftEditor] Failed to load shift data:', error);
        toast.error("シフトの読み込みに失敗しました");
      } finally {
        setIsLoadingShift(false);
      }
    } else {
      console.log('[ShiftEditor] No shiftId provided, using default values');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]); // FIX: toast を除外して無限ループを解消

  // shiftIdが渡された場合、実際のシフトデータを取得
  useEffect(() => {

    loadShiftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  // 生成方式の選択
  const [generationMethod, setGenerationMethod] = useState<'rule_based' | 'time_slot' | 'ai'>('time_slot');

  // AI生成設定
  const [aiConfig, setAiConfig] = useState<AIGenerationConfig>({
    includeVacationRequests: true,
    prioritizeLowSkillFirst: true,
    enforceMaxConsecutiveDays: true,
    allowManagementOvertime: true,
    customInstructions: "",
  });

  // 職員データとシフト割り当てデータ
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [workTimeSlots, setWorkTimeSlots] = useState<Record<number, { name: string; displayLabel: string; startTime: string; endTime: string; requiredStaff: number }>>({}); // 時間枠データ

  // 職員データとシフト詳細を取得
  const loadData = useCallback(async () => {
    if (!shiftId) return;

    try {
      setIsLoadingData(true);

      // FIX: currentShiftへの依存を避けるため、shiftIdから直接データを取得
      const shiftData = await shiftService.getShiftById(Number(shiftId));
      if (!shiftData) {
        toast.error('シフトが見つかりませんでした');
        return;
      }

      // シフトデータから年月を取得（currentShift stateに依存しない）
      const targetYear = shiftData.year;
      const targetMonth = shiftData.month;

      // 職員データを取得
      const employeesData = await trpcClient.employees.list.query();
      const formattedEmployees: Employee[] = employeesData.map(emp => ({
        id: emp.employeeId, // Display ID (e.g., "EMP001")
        name: emp.name,
        dbId: emp.id, // Database numeric ID
      }));
      setEmployees(formattedEmployees);

      // 時間枠データを取得
      const slotsData = await trpcClient.workTimeSlots.list.query();
      const slotsMap: Record<number, any> = {};
      slotsData.forEach(slot => {
        slotsMap[slot.id] = {
          name: slot.name,
          displayLabel: slot.displayLabel || slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          requiredStaff: slot.requiredStaff || 0
        };
      });
      setWorkTimeSlots(slotsMap);
      const monthStart = new Date(targetYear, targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth, 0);
      const monthStartStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const monthEndDay = monthEnd.getDate();
      const monthEndStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;

      // FIX: 常に指定されたshiftIdのデータを使用（年月検索ではなく）
      // これにより、同じ年月に複数のシフトがある場合でも、正しいシフトのデータを取得できる
      console.log('[ShiftEditor] Loading shift details for shiftId:', shiftId);
      const allDetails = await trpcClient.shiftDetails.getByShift.query({
        shiftId: Number(shiftId)
      });
      // 全てのシフト詳細を表示（新UIで編集したシフトも含む）
      const shiftDetails = allDetails;
      console.log('[ShiftEditor] Shift details:', shiftDetails.length);

      // 承認済み希望休を取得（年月でフィルタリング）
      const allLeaveRequests = await trpcClient.leaveRequests.list.query();
      console.log('[ShiftEditor] Total leave requests:', allLeaveRequests.length);

      // 該当月の承認済み希望休をフィルタリング
      const approvedLeaveRequests = allLeaveRequests.filter(req => {
        if (req.status !== 'approved') return false;

        // startDateまたはendDateが該当月に含まれるかチェック
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);

        return (startDate <= monthEnd && endDate >= monthStart);
      });
      console.log('[ShiftEditor] Approved leave requests for', targetYear, targetMonth, ':', approvedLeaveRequests.length);

      // シフト詳細をShiftAssignment形式に変換
      const formattedAssignments: ShiftAssignment[] = shiftDetails.map(detail => {
        const employee = employeesData.find(emp => emp.id === detail.employeeId);

        // Determine display name based on leaveType and times
        let displayName = null;

        // パート職員かどうかを判定（positionGroupIdから判定が必要だが、現在はemployeeIdから推定）
        const isPartTime = employee?.positionGroupId === 3; // パートのIDが3と仮定

        if (detail.leaveType === "時間指定" && detail.startTime && detail.endTime) {
          // Format time display (remove :00 for clean display)
          const formatTime = (time: string) => {
            const [hour, minute] = time.split(':');
            return minute === '00' ? hour : time;
          };
          displayName = `${formatTime(detail.startTime)}-${formatTime(detail.endTime)}`;
        } else if (detail.leaveType) {
          displayName = detail.leaveType;
        } else if (detail.status === "off" || detail.status === "requested_off") {
          // 承認済み希望休（generatedBy = 'leave_request'）の場合、leaveTypeがnullでも"休"を表示
          displayName = "休";
        } else if (detail.timeSlotId && slotsMap[detail.timeSlotId]) {
          // 時間枠の略称を取得
          const slot = slotsMap[detail.timeSlotId];
          if (isPartTime && slot.startTime && slot.endTime) {
            // パート職員の場合は時間表示（例: 8-13）
            const formatTime = (time: string) => {
              const [hour, minute] = time.split(':');
              return minute === '00' ? hour : `${hour}:${minute}`;
            };
            displayName = `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`;
          } else {
            // 正社員・管理者の場合は略称表示（夜、明、早、日A、日B、遅）
            displayName = slot.displayLabel;
          }
        } else if (detail.timeSlotId) {
          displayName = "勤務"; // フォールバック
        }

        return {
          date: detail.date,
          employeeId: employee?.employeeId || String(detail.employeeId),
          employeeName: employee?.name || "不明",
          positionGroup: "fulltime", // TODO: 実際のデータから取得
          timeSlotId: detail.timeSlotId?.toString() || null,
          timeSlotName: displayName,
          isVacationRequest: detail.status === "requested_off",
          shiftDetailId: detail.id, // Include the ID for editing
          employeeDbId: detail.employeeId, // Database numeric ID
        };
      });

      // 承認済み希望休をShiftAssignment形式に変換して追加
      const leaveRequestAssignments: ShiftAssignment[] = [];

      for (const request of approvedLeaveRequests) {
        const employee = employeesData.find(emp => emp.id === request.employeeId);
        console.log('[ShiftEditor] Processing request:', request.id, 'employeeId:', request.employeeId, 'dates:', request.startDate, 'to', request.endDate);

        // startDateからendDateまでの各日付に対してassignmentを作成
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);

        // 該当月の範囲内で日付を生成
        const actualStart = startDate < monthStart ? monthStart : startDate;
        const actualEnd = endDate > monthEnd ? monthEnd : endDate;
        console.log('[ShiftEditor] Date range:', actualStart.toISOString(), 'to', actualEnd.toISOString());

        for (let d = new Date(actualStart); d <= actualEnd; d.setDate(d.getDate() + 1)) {
          // タイムゾーンを考慮してYYYY-MM-DD形式の日付文字列を生成
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          // 既にshiftDetailsに存在する日付はスキップ
          const existsInShiftDetails = formattedAssignments.some(
            a => a.date === dateStr && a.employeeDbId === request.employeeId
          );
          console.log('[ShiftEditor] Date:', dateStr, 'exists in shiftDetails:', existsInShiftDetails);

          if (!existsInShiftDetails) {
            // 時間指定の希望休の場合
            let displayName: string = request.leaveType || "休";
            if (request.leaveType === "時間指定" && request.startTime && request.endTime) {
              const formatTime = (time: string) => {
                const [hour, minute] = time.split(':');
                return minute === '00' ? hour : time;
              };
              displayName = `${formatTime(request.startTime)}-${formatTime(request.endTime)}`;
            }

            leaveRequestAssignments.push({
              date: dateStr,
              employeeId: employee?.employeeId || String(request.employeeId),
              employeeName: employee?.name || "不明",
              positionGroup: "fulltime",
              timeSlotId: null,
              timeSlotName: displayName,
              isVacationRequest: true,
              shiftDetailId: undefined,
              employeeDbId: request.employeeId,
            });
          }
        }
      }

      // shiftDetailsとleaveRequestsを統合
      console.log('[ShiftEditor] Leave request assignments created:', leaveRequestAssignments.length);
      const allAssignments = [...formattedAssignments, ...leaveRequestAssignments];
      console.log('[ShiftEditor] Total assignments:', allAssignments.length);
      setAssignments(allAssignments);

    } catch (error) {
      console.error('[ShiftEditor] Failed to load data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]); // FIX: toast を除外して無限ループを完全に解消

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]); // FIX: loadData ではなく shiftId に依存させる

  // 統計情報（動的に計算）
  const calculateStats = () => {
    const daysInMonth = getDaysInMonth(currentShift.year, currentShift.month);
    const uniqueDates = new Set(assignments.map((a) => a.date));
    const vacationDays = assignments.filter((a) => a.isVacationRequest).length;
    const warnings = assignments.filter((a) => a.hasWarning).length;

    return {
      totalDays: daysInMonth,
      assignedDays: uniqueDates.size,
      vacationDays: vacationDays,
      unassignedDays: daysInMonth - uniqueDates.size,
      warnings: warnings,
    };
  };

  const stats = calculateStats();

  // AI自動生成を実行 - useMutationに移行
  const { mutate: generateAI, isLoading: isGeneratingAI } = useMutation(
    async (prompt?: string) => {
      if (!shiftId) {
        throw new Error("シフトIDが指定されていません");
      }

      const numericShiftId = parseInt(shiftId);
      if (isNaN(numericShiftId)) {
        throw new Error("無効なシフトIDです");
      }

      const result = await trpcClient.shifts.generateAI.mutate({
        shiftId: numericShiftId,
        prompt,
      });
      return result;
    },
    {
      onSuccess: async (result) => {
        toast.success("AI生成が完了しました", {
          description: "AI生成シフトを確認してください",
        });
        // Navigate to the newly created AI-generated shift
        if (result.newShiftId) {
          window.location.href = `/shifts/${result.newShiftId}`;
        } else {
          // Fallback: reload current shift data if newShiftId is not returned
          await loadShiftData();
          await loadData();
        }
      },
      onError: (error: Error) => {
        toast.error("AI生成に失敗しました", {
          description: error.message,
        });
      },
    }
  );

  // AI自動生成を実行
  const handleAIGenerate = async () => {
    setShowAIDialog(false);
    toast.info("AI自動生成を開始します...", {
      description: "生成には20-30秒かかります",
    });
    generateAI(aiConfig.customInstructions || undefined);
  };

  // ルールベース生成を実行 - useMutationに移行
  const { mutate: generateRuleBased, isLoading: isGeneratingRuleBased } = useMutation(
    async () => {
      if (!shiftId) {
        throw new Error("シフトIDが指定されていません");
      }

      const numericShiftId = parseInt(shiftId);
      if (isNaN(numericShiftId)) {
        throw new Error("無効なシフトIDです");
      }

      const result = await trpcClient.shifts.generateRuleBased.mutate({
        shiftId: numericShiftId,
      });
      return result;
    },
    {
      onSuccess: async (result) => {
        toast.success("ルールベース生成が完了しました", {
          description: `${result.assignmentsCount || 0}件のシフトが生成されました`,
          duration: 5000,
        });
        // Reload shift data and details to show the newly generated shifts
        await loadShiftData();
        await loadData();
      },
      onError: (error: Error) => {
        toast.error("ルールベース生成に失敗しました", {
          description: error.message,
          duration: 7000,
        });
      },
    }
  );

  // ルールベース生成を実行
  const handleRuleBasedGenerate = async () => {
    toast.info("ルールベースシフト生成を開始します...", {
      description: "生成には数秒かかります",
    });
    generateRuleBased();
  };

  // 時間スロットベース生成を実行 - useMutationに移行
  const { mutate: generateTimeSlotBased, isLoading: isGeneratingTimeSlot } = useMutation(
    async () => {
      if (!shiftId) {
        throw new Error("シフトIDが指定されていません");
      }

      const numericShiftId = parseInt(shiftId);
      if (isNaN(numericShiftId)) {
        throw new Error("無効なシフトIDです");
      }

      const result = await trpcClient.shifts.generateTimeSlotBased.mutate({
        shiftId: numericShiftId,
      });
      return result;
    },
    {
      onSuccess: async (result) => {
        toast.success("時間スロットベース生成が完了しました", {
          description: `${result.assignmentsCount || 0}件のシフトが生成されました（高速版）`,
          duration: 5000,
        });
        // Reload shift data and details to show the newly generated shifts
        await loadShiftData();
        await loadData();
      },
      onError: (error: Error) => {
        toast.error("時間スロットベース生成に失敗しました", {
          description: error.message,
          duration: 7000,
        });
      },
    }
  );

  // 時間スロットベース生成を実行
  const handleTimeSlotBasedGenerate = async () => {
    toast.info("時間スロットベースシフト生成を開始します...", {
      description: "高速生成（約2秒）",
    });
    generateTimeSlotBased();
  };

  // Phase transition mutation
  const { mutate: transitionPhase, isLoading: isTransitioning } = useMutation(
    async (targetStatus: "tentative" | "tentative_revised" | "confirmed" | "actual") => {
      if (!shiftId) {
        throw new Error("シフトIDが指定されていません");
      }

      const numericShiftId = parseInt(shiftId);
      if (isNaN(numericShiftId)) {
        throw new Error("無効なシフトIDです");
      }

      const result = await trpcClient.shifts.transitionPhase.mutate({
        sourceShiftId: numericShiftId,
        targetStatus,
      });
      return { ...result, targetStatus };
    },
    {
      onSuccess: (result: any) => {
        const statusLabels: Record<string, string> = {
          tentative: "仮確定",
          tentative_revised: "仮確定改",
          confirmed: "最終確定",
          actual: "実績",
        };
        const targetStatus = result.targetStatus || "tentative";
        toast.success(`${statusLabels[targetStatus]}シフトを作成しました`);
        // Navigate to the new shift
        if (result.newShiftId) {
          window.location.href = `/shifts/${result.newShiftId}`;
        }
      },
      onError: (error: Error) => {
        toast.error("フェーズ遷移に失敗しました", {
          description: error.message,
        });
      },
    }
  );

  const handleExportPDF = () => {
    setShowPDFDialog(true);
  };

  const handlePrintPDF = () => {
    window.print();
    setShowPDFDialog(false);
  };

  const handleSave = () => {
    toast.success("シフトを保存しました");
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 戻るボタン（AdminApp統合時に表示） */}
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-xl">
            <ChevronLeft className="w-4 h-4 mr-2" />
            シフト一覧に戻る
          </Button>
        )}

        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl text-gray-900">シフト作成・編集</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {currentShift.year}年{currentShift.month}月
                </p>
                <Badge variant={getStatusBadgeVariant(currentShift.status)}>
                  {getStatusLabel(currentShift.status)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isReadOnlyStatus(currentShift.status) && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Info className="w-3 h-3 mr-1" />
                読み取り専用
              </Badge>
            )}
            {(currentShift.status === "vacation_only" || currentShift.status === "draft") && (
              <>
                {generationMethod === 'time_slot' && (
                  <Button
                    onClick={handleTimeSlotBasedGenerate}
                    disabled={isGeneratingTimeSlot || isGeneratingRuleBased || isGeneratingAI}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    {isGeneratingTimeSlot ? (
                      <><LoadingInline /> <span className="ml-2">時間スロット生成中...</span></>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> 時間スロット生成（高速）</>
                    )}
                  </Button>
                )}
                {generationMethod === 'rule_based' && (
                  <Button
                    onClick={handleRuleBasedGenerate}
                    disabled={isGeneratingRuleBased || isGeneratingAI || isGeneratingTimeSlot}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    {isGeneratingRuleBased ? (
                      <><LoadingInline /> <span className="ml-2">ルールベース生成中...</span></>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> ルールベース生成</>
                    )}
                  </Button>
                )}
                {generationMethod === 'ai' && (
                  <Button
                    onClick={() => setShowAIDialog(true)}
                    disabled={isGeneratingAI || isGeneratingRuleBased || isGeneratingTimeSlot}
                    className="rounded-xl bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingAI ? (
                      <><LoadingInline /> <span className="ml-2">AI生成中...</span></>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> AI生成</>
                    )}
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={handleExportPDF} className="rounded-xl">
              <FileDown className="w-4 h-4 mr-2" />
              PDF出力
            </Button>
            {currentShift.status !== "ai_generated" && (
              <Button variant="outline" onClick={handleSave} className="rounded-xl">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            )}
          </div>
        </div>

        {/* 生成方式選択 */}
        {(currentShift.status === "vacation_only" || currentShift.status === "draft") && (
          <Card className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">シフト生成方式を選択</h3>
                {currentShift.status === "draft" && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    再生成
                  </Badge>
                )}
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generation"
                    value="time_slot"
                    checked={generationMethod === 'time_slot'}
                    onChange={(e) => setGenerationMethod(e.target.value as 'time_slot' | 'rule_based' | 'ai')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">時間スロット方式</span>
                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                      推奨・高速
                    </Badge>
                    <p className="text-xs text-gray-500 mt-0.5">30分刻みの時間枠で最適配置（約2秒）</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generation"
                    value="rule_based"
                    checked={generationMethod === 'rule_based'}
                    onChange={(e) => setGenerationMethod(e.target.value as 'time_slot' | 'rule_based' | 'ai')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">ルールベース方式</span>
                    <p className="text-xs text-gray-500 mt-0.5">従来の制約ルールに基づく生成</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generation"
                    value="ai"
                    checked={generationMethod === 'ai'}
                    onChange={(e) => setGenerationMethod(e.target.value as 'time_slot' | 'rule_based' | 'ai')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">AI方式</span>
                    <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-700 border-amber-200">
                      実験的
                    </Badge>
                    <p className="text-xs text-gray-500 mt-0.5">ChatGPTによる自動生成（20-30秒）</p>
                  </div>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* 統計情報（簡略版） */}
        <Card className="p-3 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">総日数:</span>
                <span className="font-semibold">{stats.totalDays}日</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">割当済:</span>
                <span className="font-semibold text-green-700">{stats.assignedDays}日</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span className="text-muted-foreground">希望休:</span>
                <span className="font-semibold text-blue-700">{stats.vacationDays}日</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-muted-foreground">未割当:</span>
                <span className="font-semibold text-amber-700">{stats.unassignedDays}日</span>
              </div>
              {stats.warnings > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-muted-foreground">警告:</span>
                  <span className="font-semibold text-red-700">{stats.warnings}件</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Phase Transition Actions */}
        {currentShift.status === "draft" && (
          <Card className="p-4 rounded-2xl border-purple-200 bg-purple-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">仮確定して職員に通知</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    現在のシフトを仮確定版として職員に通知し、修正希望を受け付けます
                  </p>
                </div>
              </div>
              <Button
                onClick={() => transitionPhase("tentative")}
                disabled={isTransitioning}
                className="rounded-xl bg-purple-600 hover:bg-purple-700"
              >
                {isTransitioning ? (
                  <><LoadingInline /> <span className="ml-2">処理中...</span></>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    仮確定して職員に通知
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {currentShift.status !== "draft" && currentShift.status !== "archived" && (
          <Card className="p-4 rounded-2xl border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm text-gray-900">次のフェーズへ進む</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isReadOnlyStatus(currentShift.status) && "仮確定シフトを作成して編集を開始します"}
                    {currentShift.status === "tentative" && "スタッフの要望を反映した仮確定改、または最終確定シフトを作成します"}
                    {currentShift.status === "tentative_revised" && "最終確定シフトを作成します"}
                    {currentShift.status === "confirmed" && "実績シフトを作成します"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isReadOnlyStatus(currentShift.status) && (
                  <Button
                    onClick={() => transitionPhase("tentative")}
                    disabled={isTransitioning}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    {isTransitioning ? <LoadingInline /> : "仮確定へ進む"}
                  </Button>
                )}
                {currentShift.status === "tentative" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => transitionPhase("tentative_revised")}
                      disabled={isTransitioning}
                      className="rounded-xl"
                    >
                      {isTransitioning ? <LoadingInline /> : "仮確定改を作成"}
                    </Button>
                    <Button
                      onClick={() => transitionPhase("confirmed")}
                      disabled={isTransitioning}
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      {isTransitioning ? <LoadingInline /> : "最終確定へ進む"}
                    </Button>
                  </>
                )}
                {currentShift.status === "tentative_revised" && (
                  <Button
                    onClick={() => transitionPhase("confirmed")}
                    disabled={isTransitioning}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    {isTransitioning ? <LoadingInline /> : "最終確定へ進む"}
                  </Button>
                )}
                {currentShift.status === "confirmed" && (
                  <Button
                    onClick={() => transitionPhase("actual")}
                    disabled={isTransitioning}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700"
                  >
                    {isTransitioning ? <LoadingInline /> : "実績シフトを作成"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}



        {/* 月選択とビュー切り替え */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg">
              {viewYear}年{viewMonth}月
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as "table" | "calendar" | "workflow" | "table-v2")}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="table-v2" className="rounded-lg">新UI (推奨)</TabsTrigger>
              <TabsTrigger value="table" className="rounded-lg">テーブル (旧)</TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-lg">カレンダー（実装予定）</TabsTrigger>
              <TabsTrigger value="workflow" className="rounded-lg">ワークフロー</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* シフト表示 */}
        {viewMode === "table-v2" && (
          <ShiftTableV2
            shiftId={Number(shiftId) || 0}
            year={currentShift.year}
            month={currentShift.month}
            employees={employees.map(emp => ({
              id: emp.dbId || parseInt(emp.id.replace(/\D/g, '')) || 0,
              employeeId: emp.id || '',
              name: emp.name,
              position: '', // TODO: positionGroupから取得
              employmentType: '', // TODO: positionGroupから取得
              canWorkNightShift: false, // TODO: DBから取得
              skillLevel: 1, // TODO: DBから取得
              orderIndex: 0 // TODO: DBから取得
            }))}
            cells={(() => {
              const cellsMap = convertAssignmentsToCellsMap(assignments, workTimeSlots);
              return cellsMap;
            })()}
            daySummaries={(() => {
              const cellsMap = convertAssignmentsToCellsMap(assignments, workTimeSlots);
              const dates = getDateRange(currentShift.year, currentShift.month);
              return calculateDaySummaries(cellsMap, dates);
            })()}
            onCellUpdate={async (cell) => {
              try {
                console.log('[ShiftEditor] Cell update request:', {
                  shiftDetailId: cell.shiftDetailId,
                  employeeId: cell.employeeId,
                  date: cell.date,
                  shiftType: cell.shiftType,
                  startTime: cell.startTime,
                  endTime: cell.endTime,
                  isHope: cell.isHope,
                  source: cell.source,
                });

                // 空セル（削除）の場合は既存のshiftDetailを削除
                if (cell.shiftType === null) {
                  if (cell.shiftDetailId) {
                    console.log('[ShiftEditor] Deleting shift detail:', cell.shiftDetailId);
                    await trpcClient.shiftDetails.delete.mutate({ id: cell.shiftDetailId });
                    toast.success('シフトを削除しました');
                    await loadData();
                  } else {
                    console.log('[ShiftEditor] Empty cell, nothing to delete');
                  }
                  return;
                }

                // ShiftTypeからstatusとleaveTypeを判定
                let status: "working" | "off" | "requested_off" | "emergency_off" = "working";
                let leaveType: "休" | "有休" | "時間指定" | null = null;
                let timeSlotId: number | null = null;

                if (cell.shiftType === 'OFF') {
                  status = cell.isHope ? "requested_off" : "off";
                  leaveType = "休";
                } else if (cell.shiftType === 'PAID_LEAVE') {
                  status = cell.isHope ? "requested_off" : "off";
                  leaveType = "有休";
                } else if (cell.shiftType) {
                  // 勤務シフトの場合、時間枠から逆引きしてtimeSlotIdを取得
                  status = "working";
                  const master = SHIFT_TYPE_MASTER[cell.shiftType];
                  console.log('[ShiftEditor] Looking for timeSlot matching:', {
                    shiftType: cell.shiftType,
                    masterCode: master?.code,
                    masterLabel: master?.label,
                    cellStartTime: cell.startTime,
                    cellEndTime: cell.endTime,
                    workTimeSlotsCount: Object.keys(workTimeSlots).length,
                    workTimeSlotsKeys: Object.keys(workTimeSlots),
                    sampleSlot: Object.values(workTimeSlots)[0]
                  });

                  // workTimeSlotsから対応するtimeSlotIdを検索
                  for (const [id, slot] of Object.entries(workTimeSlots)) {
                    console.log('[ShiftEditor] Checking slot:', {
                      id,
                      slotDisplayLabel: slot.displayLabel,
                      slotName: slot.name,
                      slotStartTime: slot.startTime,
                      slotEndTime: slot.endTime,
                      codeMatch: slot.displayLabel === master?.code,
                      labelMatch: slot.name === master?.label,
                      timeMatch: cell.startTime && cell.endTime && slot.startTime === cell.startTime && slot.endTime === cell.endTime
                    });

                    if (slot.displayLabel === master?.code ||
                        slot.name === master?.label ||
                        (cell.startTime && cell.endTime &&
                         slot.startTime === cell.startTime &&
                         slot.endTime === cell.endTime)) {
                      timeSlotId = parseInt(id);
                      console.log('[ShiftEditor] Found matching timeSlot!', id, slot);
                      break;
                    }
                  }

                  if (!timeSlotId) {
                    console.warn('[ShiftEditor] No matching timeSlot found for', cell.shiftType, 'workTimeSlots:', workTimeSlots);
                  }
                }

                const requestData = {
                  status,
                  timeSlotId,
                  leaveType,
                  startTime: cell.startTime || null,
                  endTime: cell.endTime || null,
                };

                if (cell.shiftDetailId) {
                  // 既存のシフト詳細を更新
                  console.log('[ShiftEditor] Updating shift detail:', cell.shiftDetailId, requestData);
                  const result = await trpcClient.shiftDetails.update.mutate({
                    id: cell.shiftDetailId,
                    date: cell.date,
                    ...requestData,
                  });
                  console.log('[ShiftEditor] Update result:', result);
                  toast.success('シフトを更新しました');
                } else {
                  // 新規シフト詳細を作成
                  console.log('[ShiftEditor] Creating new shift detail:', {
                    shiftId: Number(shiftId),
                    employeeId: cell.employeeId,
                    date: cell.date,
                    ...requestData,
                  });
                  const result = await trpcClient.shiftDetails.create.mutate({
                    shiftId: Number(shiftId),
                    employeeId: cell.employeeId,
                    date: cell.date,
                    ...requestData,
                  });
                  console.log('[ShiftEditor] Create result:', result);
                  toast.success('シフトを保存しました');
                }

                // データを再読み込みして表示を更新
                console.log('[ShiftEditor] Reloading data after save...');
                await loadData();
                console.log('[ShiftEditor] Data reloaded successfully');
              } catch (error) {
                console.error('[ShiftEditor] Failed to update cell:', error);
                toast.error('シフトの保存に失敗しました', {
                  description: error instanceof Error ? error.message : '不明なエラー',
                });
              }
            }}
            onBatchUpdate={async (cells) => {
              console.log('Batch update:', cells);
              toast.info('一括更新機能は開発中です');
            }}
            isReadOnly={isReadOnlyStatus(currentShift.status)}
          />
        )}
        {viewMode === "calendar" && (
          <ShiftCalendarView
            viewYear={viewYear}
            viewMonth={viewMonth}
            assignments={assignments}
          />
        )}
        {viewMode === "table" && (
          <ShiftTableView
            viewYear={viewYear}
            viewMonth={viewMonth}
            assignments={assignments}
            employees={employees}
            shiftId={shiftId}
            onRefresh={loadData}
            workTimeSlots={workTimeSlots}
          />
        )}
        {viewMode === "workflow" && shiftId && (
          <WorkflowDashboard
            shiftId={Number(shiftId)}
            onRefresh={loadShiftData}
          />
        )}

        {/* AI生成設定ダイアログ */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI自動生成設定
                </div>
              </DialogTitle>
              <DialogDescription>
                ChatGPTを使用してシフトを自動生成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">
                  追加の指示（任意）
                </Label>
                <Textarea
                  id="instructions"
                  value={aiConfig.customInstructions}
                  onChange={(e) => setAiConfig({ ...aiConfig, customInstructions: e.target.value })}
                  placeholder="例: 今月は忙しいので、できるだけ正社員を多めに配置してください"
                  className="rounded-xl mt-2"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ChatGPTへの追加の指示を自然言語で入力できます
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIDialog(false)} className="rounded-xl">
                キャンセル
              </Button>
              <Button onClick={handleAIGenerate} className="rounded-xl bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                生成開始
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PDF出力ダイアログ */}
        <Dialog open={showPDFDialog} onOpenChange={setShowPDFDialog}>
          <DialogContent className="max-w-[95vw] h-[95vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-blue-600" />
                  PDF出力プレビュー
                </div>
              </DialogTitle>
              <DialogDescription>
                プレビューを確認して、PDF出力してください
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded-lg">
              <div className="bg-white shadow-lg mx-auto" style={{ width: '297mm' }}>
                <ShiftPDFView
                  viewYear={currentShift.year}
                  viewMonth={currentShift.month}
                  assignments={assignments}
                  employees={employees}
                  facilityName="グループホーム"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPDFDialog(false)} className="rounded-xl">
                閉じる
              </Button>
              <Button onClick={handlePrintPDF} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                <FileDown className="w-4 h-4 mr-2" />
                PDF出力
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 印刷専用（非表示） */}
        <div className="print-only">
          <ShiftPDFView
            viewYear={currentShift.year}
            viewMonth={currentShift.month}
            assignments={assignments}
            employees={employees}
            facilityName="グループホーム"
          />
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
