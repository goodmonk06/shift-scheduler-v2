import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Save, FileDown, AlertCircle,
  ChevronLeft, ChevronRight, Settings, MessageSquare,
  CheckCircle, AlertTriangle, Info, Calendar
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
import { getStatusLabel, getStatusBadgeVariant, getDaysInMonth } from "../utils/shiftHelpers";
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

  const [viewMode, setViewMode] = useState<"calendar" | "table">("table");
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [isLoadingShift, setIsLoadingShift] = useState(false);

  // Phase management - store all shifts for the same month
  const [monthShifts, setMonthShifts] = useState<Record<string, ShiftData>>({});
  const [selectedPhase, setSelectedPhase] = useState<ShiftStatus>("draft");

  // shiftIdが渡された場合、実際のシフトデータを取得
  useEffect(() => {
    const loadShiftData = async () => {
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
    };

    loadShiftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  // AI生成設定
  const [aiConfig, setAiConfig] = useState<AIGenerationConfig>({
    includeVacationRequests: true,
    prioritizeLowSkillFirst: true,
    enforceMaxConsecutiveDays: true,
    allowManagementOvertime: true,
    customInstructions: "",
  });

  // AI生成プロンプトプレビューダイアログ
  const [showAIPromptDialog, setShowAIPromptDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // セル編集ダイアログ（将来的な実装用）
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: string;
    employeeName: string;
    date: string;
  } | null>(null);

  const handleCellClick = (employeeId: string, employeeName: string, day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedCell({ employeeId, employeeName, date: dateStr });
    toast.info(`${employeeName} - ${day}日のシフト編集（実装予定）`);
  };

  // 職員データとシフト割り当てデータ
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 職員データとシフト詳細を取得
  const loadData = useCallback(async () => {
    if (!shiftId) return;

    try {
      setIsLoadingData(true);

      // 職員データを取得
      const employeesData = await trpcClient.employees.list.query();
      const formattedEmployees: Employee[] = employeesData.map(emp => ({
        id: emp.employeeId, // Display ID (e.g., "EMP001")
        name: emp.name,
        dbId: emp.id, // Database numeric ID
      }));
      setEmployees(formattedEmployees);

      // シフト詳細を取得
      const shiftDetails = await trpcClient.shiftDetails.getByShift.query({
        shiftId: Number(shiftId)
      });

      // 承認済み希望休を取得（年月でフィルタリング）
      const allLeaveRequests = await trpcClient.leaveRequests.list.query();
      console.log('[ShiftEditor] Total leave requests:', allLeaveRequests.length);

      // 該当月の承認済み希望休をフィルタリング
      const targetYear = viewYear;
      const targetMonth = viewMonth;

      const approvedLeaveRequests = allLeaveRequests.filter(req => {
        if (req.status !== 'approved') return false;

        // startDateまたはendDateが該当月に含まれるかチェック
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        const monthStart = new Date(targetYear, targetMonth - 1, 1);
        const monthEnd = new Date(targetYear, targetMonth, 0);

        return (startDate <= monthEnd && endDate >= monthStart);
      });
      console.log('[ShiftEditor] Approved leave requests for', targetYear, targetMonth, ':', approvedLeaveRequests.length);

      // シフト詳細をShiftAssignment形式に変換
      const formattedAssignments: ShiftAssignment[] = shiftDetails.map(detail => {
        const employee = employeesData.find(emp => emp.id === detail.employeeId);

        // Determine display name based on leaveType and times
        let displayName = null;
        if (detail.leaveType === "時間指定" && detail.startTime && detail.endTime) {
          // Format time display (remove :00 for clean display)
          const formatTime = (time: string) => {
            const [hour, minute] = time.split(':');
            return minute === '00' ? hour : time;
          };
          displayName = `${formatTime(detail.startTime)}-${formatTime(detail.endTime)}`;
        } else if (detail.leaveType) {
          displayName = detail.leaveType;
        } else if (detail.timeSlotId) {
          displayName = "勤務"; // TODO: 実際の時間枠名を取得
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
      const monthStart = new Date(targetYear, targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth, 0);

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
            let displayName = request.leaveType || "休";
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
  }, [shiftId, viewYear, viewMonth, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // AI生成プロンプトを構築
  const buildAIPrompt = () => {
    const prompt = `
# シフト自動生成タスク

## 基本情報
- 対象: ${currentShift.year}年${currentShift.month}月
- 現在のステータス: ${getStatusLabel(currentShift.status)}

## 制約条件

### 必要人数設定
\`\`\`json
{
  "早番 (07:00-16:00)": { "平日": 3, "土日": 2 },
  "遅番 (11:00-20:00)": { "平日": 2, "土日": 2 },
  "夜勤 (16:00-翌09:00)": { "毎日": 1 }
}
\`\`\`

### 職員情報
\`\`\`json
[
  {
    "id": "EMP001",
    "name": "山田 太郎",
    "positionGroup": "正社員",
    "skillLevel": 100,
    "canWorkNight": true,
    "constraints": {
      "workableTimeSlots": [
        { "dayOfWeek": 1-5, "startTime": "07:00", "endTime": "20:00" }
      ],
      "minDaysOffPerWeek": 2,
      "maxConsecutiveWorkDays": 5,
      "additionalConstraints": "なし"
    }
  },
  {
    "id": "EMP003",
    "name": "鈴木 一郎",
    "positionGroup": "パート",
    "skillLevel": 80,
    "canWorkNight": false,
    "constraints": {
      "workableTimeSlots": [
        { "dayOfWeek": 1-3-5, "startTime": "07:00", "endTime": "16:00" }
      ],
      "minDaysOffPerWeek": 2,
      "maxConsecutiveWorkDays": 3,
      "additionalConstraints": "水曜日は17時まで（子供の送迎）"
    }
  }
]
\`\`\`

### 職場ルール
- 連勤は最大5日まで
- 夜勤の翌日は必ず休み
- 週の休日は最低2日
- 月の夜勤回数は正社員で最大10回

### 希望休（既に反映済み）
${assignments
  .filter((a) => a.isVacationRequest)
  .map((a) => `- ${a.employeeName}: ${a.date}`)
  .join("\n")}

## 生成ロジック

### 優先順位
1. **第一フェーズ**: パート・事務員から配置
   - これらの職員は柔軟性が低いため、まず配置
   - 制約条件を厳密に守る
   - 可能な限り100%配置する

2. **第二フェーズ**: 正社員を配置
   - パート配置後の不足分を埋める
   - ある程度の柔軟性を持たせる

3. **第三フェーズ**: 管理職を配置
   - 他の職員でカバーできない部分のみ
   - 必要人数を満たすため、場合によっては無理な配置も許容

### 特別な考慮事項
${aiConfig.customInstructions || "なし"}

## 出力形式
各日のシフト割り当てをJSON形式で出力してください。

\`\`\`json
{
  "2025-01-01": [
    { "employeeId": "EMP001", "timeSlotId": "TS001", "warnings": [] },
    { "employeeId": "EMP002", "timeSlotId": "TS002", "warnings": ["スキルレベル80%"] }
  ],
  ...
}
\`\`\`

警告がある場合は warnings 配列に含めてください。
`;

    return prompt.trim();
  };

  // AI生成プロンプトをプレビュー
  const handlePreviewAIPrompt = () => {
    const prompt = buildAIPrompt();
    setAiPrompt(prompt);
    setShowAIPromptDialog(true);
  };

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
      onSuccess: (result) => {
        toast.success("AI生成が完了しました", {
          description: "AI生成シフトを確認してください",
        });
        // Navigate to the new AI-generated shift
        if (result.newShiftId) {
          window.location.href = `/shifts/${result.newShiftId}`;
        } else {
          window.location.reload();
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
    setShowAIPromptDialog(false);
    toast.info("AI自動生成を開始します...", {
      description: "生成には20-30秒かかります",
    });
    generateAI();
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
      return result;
    },
    {
      onSuccess: (result, targetStatus) => {
        const statusLabels: Record<string, string> = {
          tentative: "仮確定",
          tentative_revised: "仮確定改",
          confirmed: "最終確定",
          actual: "実績",
        };
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
    toast.info("PDF出力機能（実装予定）");
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
        {/* デバッグ情報 */}
        {shiftId && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-900">
              DEBUG: ShiftID = {shiftId}, 表示年月 = {currentShift.year}年{currentShift.month}月, viewYear = {viewYear}, viewMonth = {viewMonth}
            </AlertDescription>
          </Alert>
        )}

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
            {currentShift.status === "ai_generated" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Info className="w-3 h-3 mr-1" />
                読み取り専用
              </Badge>
            )}
            {currentShift.status === "draft" && (
              <Button
                onClick={handlePreviewAIPrompt}
                disabled={isGeneratingAI}
                className="rounded-xl bg-purple-600 hover:bg-purple-700"
              >
                {isGeneratingAI ? (
                  <><LoadingInline /> AI生成中...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> AI生成</>
                )}
              </Button>
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

        {/* 統計情報 */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">総日数</p>
            </div>
            <p className="text-2xl">{stats.totalDays}日</p>
          </Card>
          <Card className="p-4 rounded-xl border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">割当済</p>
            </div>
            <p className="text-2xl text-green-700">{stats.assignedDays}日</p>
          </Card>
          <Card className="p-4 rounded-xl border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">希望休</p>
            </div>
            <p className="text-2xl text-blue-700">{stats.vacationDays}日</p>
          </Card>
          <Card className="p-4 rounded-xl border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">未割当</p>
            </div>
            <p className="text-2xl text-amber-700">{stats.unassignedDays}日</p>
          </Card>
          <Card className="p-4 rounded-xl border-red-200 bg-red-50/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-muted-foreground">警告</p>
            </div>
            <p className="text-2xl text-red-700">{stats.warnings}件</p>
          </Card>
        </div>

        {/* Phase Transition Actions */}
        {currentShift.status !== "draft" && currentShift.status !== "archived" && (
          <Card className="p-4 rounded-2xl border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm text-gray-900">次のフェーズへ進む</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentShift.status === "ai_generated" && "仮確定シフトを作成して編集を開始します"}
                    {currentShift.status === "tentative" && "スタッフの要望を反映した仮確定改、または最終確定シフトを作成します"}
                    {currentShift.status === "tentative_revised" && "最終確定シフトを作成します"}
                    {currentShift.status === "confirmed" && "実績シフトを作成します"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {currentShift.status === "ai_generated" && (
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

        {/* シフト生成フロー */}
        <Card className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <h3 className="text-gray-900">シフト生成フロー</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewAIPrompt}
                className="rounded-xl"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AIプロンプトを確認
              </Button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { status: "vacation_only" as ShiftStatus, label: "希望休" },
                { status: "ai_generated" as ShiftStatus, label: "AI生成" },
                { status: "tentative" as ShiftStatus, label: "仮確定" },
                { status: "tentative_revised" as ShiftStatus, label: "仮確定改" },
                { status: "final" as ShiftStatus, label: "最終" },
                { status: "actual" as ShiftStatus, label: "実績" },
              ].map((item, index) => (
                <div key={item.status} className="relative">
                  <Button
                    variant={currentShift.status === item.status ? "default" : "outline"}
                    size="sm"
                    className="w-full rounded-lg text-xs"
                    onClick={() => setCurrentShift({ ...currentShift, status: item.status })}
                  >
                    {item.label}
                  </Button>
                  {index < 5 && (
                    <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 text-muted-foreground z-10">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>

            {currentShift.status === "vacation_only" && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  現在、希望休のみが反映されています。「AI自動生成」ボタンでシフトを生成できます。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

        {/* AI生成設定 */}
        {currentShift.status === "vacation_only" && (
          <Card className="p-6 rounded-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">AI生成設定</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">追加の指示（任意）</Label>
                  <Textarea
                    value={aiConfig.customInstructions}
                    onChange={(e) => setAiConfig({ ...aiConfig, customInstructions: e.target.value })}
                    placeholder="例: 今月は忙しいので、できるだけ正社員を多めに配置してください"
                    className="rounded-xl mt-2"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ChatGPTへの追加の指示を自然言語で入力できます
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePreviewAIPrompt} className="rounded-xl">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI自動生成を開始
                </Button>
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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "table")}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="calendar" className="rounded-lg">カレンダー</TabsTrigger>
              <TabsTrigger value="table" className="rounded-lg">テーブル</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* シフト表示 */}
        {viewMode === "calendar" ? (
          <ShiftCalendarView
            viewYear={viewYear}
            viewMonth={viewMonth}
            assignments={assignments}
            readOnly={currentShift.status === "ai_generated"}
          />
        ) : (
          <ShiftTableView
            viewYear={viewYear}
            viewMonth={viewMonth}
            assignments={assignments}
            employees={employees}
            shiftId={shiftId}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* AI生成プロンプトプレビューダイアログ */}
      <Dialog open={showAIPromptDialog} onOpenChange={setShowAIPromptDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI生成プロンプトの確認</DialogTitle>
            <DialogDescription>
              ChatGPT 4 miniに送信するプロンプトを確認してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-sm">
                このプロンプトには、職員情報・必要人数・制約条件・希望休がすべて含まれています。
                AIはこの情報を基にシフトを生成します。
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-muted rounded-xl">
              <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                {aiPrompt || buildAIPrompt()}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIPromptDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAIGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI生成を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
