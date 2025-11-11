import { useState } from "react";
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

  // 全職員を取得（モック）
  const employees: Employee[] = [
    { id: "EMP001", name: "山田 太郎" },
    { id: "EMP002", name: "佐藤 花子" },
    { id: "EMP003", name: "鈴木 一郎" },
    { id: "EMP004", name: "田中 美咲" },
    { id: "EMP005", name: "高橋 健太" },
  ];

  // シフト割り当てデータ（モック）
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([
    // 希望休
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-10`,
      employeeId: "EMP001",
      employeeName: "山田 太郎",
      positionGroup: "fulltime",
      timeSlotId: null,
      timeSlotName: null,
      isVacationRequest: true,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-15`,
      employeeId: "EMP002",
      employeeName: "佐藤 花子",
      positionGroup: "fulltime",
      timeSlotId: null,
      timeSlotName: null,
      isVacationRequest: true,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-20`,
      employeeId: "EMP003",
      employeeName: "鈴木 一郎",
      positionGroup: "parttime",
      timeSlotId: null,
      timeSlotName: null,
      isVacationRequest: true,
    },
    // 通常勤務
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
      employeeId: "EMP001",
      employeeName: "山田 太郎",
      positionGroup: "fulltime",
      timeSlotId: "TS001",
      timeSlotName: "早番",
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
      employeeId: "EMP002",
      employeeName: "佐藤 花子",
      positionGroup: "fulltime",
      timeSlotId: "TS002",
      timeSlotName: "遅番",
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
      employeeId: "EMP004",
      employeeName: "田中 美咲",
      positionGroup: "parttime",
      timeSlotId: "TS003",
      timeSlotName: "夜勤",
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-02`,
      employeeId: "EMP001",
      employeeName: "山田 太郎",
      positionGroup: "fulltime",
      timeSlotId: "TS001",
      timeSlotName: "早番",
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-02`,
      employeeId: "EMP003",
      employeeName: "鈴木 一郎",
      positionGroup: "parttime",
      timeSlotId: "TS002",
      timeSlotName: "遅番",
      isVacationRequest: false,
      hasWarning: true,
      warningMessage: "スキルレベル80%の職員が配置されています",
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-03`,
      employeeId: "EMP002",
      employeeName: "佐藤 花子",
      positionGroup: "fulltime",
      timeSlotId: "TS001",
      timeSlotName: "早番",
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-03`,
      employeeId: "EMP005",
      employeeName: "高橋 健太",
      positionGroup: "parttime",
      timeSlotId: "TS003",
      timeSlotName: "夜勤",
      isVacationRequest: false,
    },
    // 休み
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
      employeeId: "EMP003",
      employeeName: "鈴木 一郎",
      positionGroup: "parttime",
      timeSlotId: null,
      timeSlotName: null,
      isVacationRequest: false,
    },
    {
      date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
      employeeId: "EMP005",
      employeeName: "高橋 健太",
      positionGroup: "parttime",
      timeSlotId: null,
      timeSlotName: null,
      isVacationRequest: false,
    },
  ]);

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
    async () => {
      if (!shiftId) {
        throw new Error("シフトIDが指定されていません");
      }

      const numericShiftId = parseInt(shiftId);
      if (isNaN(numericShiftId)) {
        throw new Error("無効なシフトIDです");
      }

      await trpcClient.shifts.generateAI.mutate({ shiftId: numericShiftId });
    },
    {
      onSuccess: () => {
        toast.success("AI生成が完了しました", {
          description: "シフトを確認してください",
        });
        // ページをリロードして最新データを取得
        window.location.reload();
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
            <Button variant="outline" onClick={handleExportPDF} className="rounded-xl">
              <FileDown className="w-4 h-4 mr-2" />
              PDF出力
            </Button>
            <Button variant="outline" onClick={handleSave} className="rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
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
          <ShiftCalendarView viewYear={viewYear} viewMonth={viewMonth} assignments={assignments} />
        ) : (
          <ShiftTableView viewYear={viewYear} viewMonth={viewMonth} assignments={assignments} employees={employees} />
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
