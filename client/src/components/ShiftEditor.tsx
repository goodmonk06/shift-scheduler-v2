import { useState } from "react";
import { 
  Calendar, Sparkles, Save, FileDown, Users, AlertCircle, 
  ChevronLeft, ChevronRight, Eye, Settings, MessageSquare,
  CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import type { ShiftStatus } from "../types/api";

interface ShiftData {
  id: string;
  year: number;
  month: number;
  status: ShiftStatus;
  createdAt: string;
  updatedAt: string;
}

interface ShiftAssignment {
  date: string;
  employeeId: string;
  employeeName: string;
  positionGroup?: "fulltime" | "parttime";
  timeSlotId: string | null;
  timeSlotName: string | null;
  isVacationRequest: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
}

interface AIGenerationConfig {
  includeVacationRequests: boolean;
  prioritizeLowSkillFirst: boolean;
  enforceMaxConsecutiveDays: boolean;
  allowManagementOvertime: boolean;
  customInstructions: string;
}

interface ShiftEditorProps {
  shiftId?: string;
  onBack?: () => void;
}

export function ShiftEditor({ shiftId, onBack }: ShiftEditorProps = {}) {
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

  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
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

  // ヘルパー関数
  // 2025年の祝日データ（日本）
  const holidays2025: { [key: string]: number[] } = {
    "1": [1, 13], // 元日、成人の日
    "2": [11, 23, 24], // 建国記念の日、天皇誕生日、振替休日
    "3": [20], // 春分の日
    "4": [29], // 昭和の日
    "5": [3, 4, 5, 6], // 憲法記念日、みどりの日、こどもの日、振替休日
    "6": [], 
    "7": [21], // 海の日
    "8": [11], // 山の日
    "9": [15, 22, 23], // 敬老の日、秋分の日、振替休日
    "10": [13], // スポーツの日
    "11": [3, 23, 24], // 文化の日、勤労感謝の日、振替休日
    "12": [], 
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getDayOfWeek = (year: number, month: number, day: number) => {
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    return ["日", "月", "火", "水", "木", "金", "土"][dayOfWeek];
  };

  const getDayOfWeekNumber = (year: number, month: number, day: number): number => {
    return new Date(year, month - 1, day).getDay();
  };

  const isHoliday = (year: number, month: number, day: number): boolean => {
    if (year === 2025) {
      const monthHolidays = holidays2025[month.toString()] || [];
      return monthHolidays.includes(day);
    }
    return false;
  };

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

  const getStatusLabel = (status: ShiftStatus) => {
    switch (status) {
      case "vacation_only": return "希望休のみ";
      case "ai_generated": return "AI生成後";
      case "tentative": return "仮確定";
      case "tentative_revised": return "仮確定（改）";
      case "final": return "最終シフト";
      case "actual": return "実績";
    }
  };

  const getStatusBadgeVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "vacation_only": return "outline";
      case "ai_generated": return "secondary";
      case "tentative":
      case "tentative_revised": return "default";
      case "final":
      case "actual": return "destructive";
    }
  };

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

  // AI自動生成を実行
  const handleAIGenerate = async () => {
    setShowAIPromptDialog(false);
    toast.info("AI自動生成を開始します...");
    
    // ここでChatGPT APIを呼び出す
    // const response = await fetch('/api/ai/generate-shift', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ prompt: aiPrompt })
    // });
    
    // モック: 2秒後に成功
    setTimeout(() => {
      toast.success("AI生成が完了しました");
      setCurrentShift({ ...currentShift, status: "ai_generated" });
      
      // モックデータを追加
      setAssignments([
        ...assignments,
        {
          date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
          employeeId: "EMP001",
          employeeName: "山田 太郎",
          timeSlotId: "TS001",
          timeSlotName: "早番",
          isVacationRequest: false,
        },
      ]);
    }, 2000);
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

  // 時間枠の定義（モック）
  const timeSlots = [
    { id: "TS001", name: "早番", startTime: "07:00", endTime: "16:00", color: "from-blue-400 to-blue-500" },
    { id: "TS002", name: "遅番", startTime: "11:00", endTime: "20:00", color: "from-green-400 to-green-500" },
    { id: "TS003", name: "夜勤", startTime: "16:00", endTime: "09:00", color: "from-purple-400 to-purple-500" },
  ];

  // 時刻を分に変換
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 24時間タイムライン上の位置とサイズを計算（パーセンテージ）
  const calculateTimelinePosition = (startTime: string, endTime: string): { left: number; width: number; isOvernight: boolean } => {
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    
    // 日をまたぐ場合（夜勤）
    const isOvernight = endMinutes < startMinutes;
    if (isOvernight) {
      endMinutes = 24 * 60; // その日は24:00まで表示
    }
    
    const left = (startMinutes / (24 * 60)) * 100;
    const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;
    
    return { left, width, isOvernight };
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // 各時間帯の人員数をカウント
    const getStaffCountAtTime = (dateStr: string, hour: number): number => {
      const dayAssignments = assignments.filter(
        (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
      );
      
      let count = 0;
      dayAssignments.forEach((assignment) => {
        const timeSlot = timeSlots.find((ts) => ts.id === assignment.timeSlotId);
        if (!timeSlot) return;
        
        const startHour = parseInt(timeSlot.startTime.split(":")[0]);
        const endHour = parseInt(timeSlot.endTime.split(":")[0]);
        
        if (endHour < startHour) {
          // 日をまたぐ夜勤
          if (hour >= startHour || hour < endHour) count++;
        } else {
          if (hour >= startHour && hour < endHour) count++;
        }
      });
      
      return count;
    };

    // 各時間帯の勤務職員リストを取得
    const getStaffListAtTime = (dateStr: string, hour: number): Array<{name: string; timeSlot: string}> => {
      const dayAssignments = assignments.filter(
        (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
      );
      
      const staffList: Array<{name: string; timeSlot: string}> = [];
      dayAssignments.forEach((assignment) => {
        const timeSlot = timeSlots.find((ts) => ts.id === assignment.timeSlotId);
        if (!timeSlot) return;
        
        const startHour = parseInt(timeSlot.startTime.split(":")[0]);
        const endHour = parseInt(timeSlot.endTime.split(":")[0]);
        
        let isWorking = false;
        if (endHour < startHour) {
          // 日をまたぐ夜勤
          if (hour >= startHour || hour < endHour) isWorking = true;
        } else {
          if (hour >= startHour && hour < endHour) isWorking = true;
        }
        
        if (isWorking) {
          staffList.push({
            name: assignment.employeeName,
            timeSlot: `${timeSlot.name} (${timeSlot.startTime}-${timeSlot.endTime})`
          });
        }
      });
      
      return staffList;
    };

    // 人員数に応じたスタイルを取得（3色に簡素化）
    const getStaffCountStyle = (count: number) => {
      if (count === 0) {
        return {
          bg: "bg-red-500",
          text: "text-white",
          border: "border-red-600",
          label: "緊急",
          ring: "ring-red-200"
        };
      } else if (count === 1 || count === 2) {
        return {
          bg: "bg-yellow-500",
          text: "text-white",
          border: "border-yellow-600",
          label: "注意",
          ring: "ring-yellow-200"
        };
      } else {
        return {
          bg: "bg-green-500",
          text: "text-white",
          border: "border-green-600",
          label: "充足",
          ring: "ring-green-200"
        };
      }
    };

    // 役職グループ別の色を取得
    const getPositionGroupColor = (positionGroup?: "fulltime" | "parttime"): string => {
      if (positionGroup === "fulltime") {
        return "from-indigo-400 to-indigo-600"; // 正社員: 濃い青紫
      } else {
        return "from-teal-400 to-teal-600"; // パート: 青緑
      }
    };

    return (
      <Card className="rounded-2xl overflow-hidden shadow-lg">
        {/* ヘッダー */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-gray-900">24時間タイムライン</h3>
              <p className="text-xs text-muted-foreground">
                人員配置を時間軸で視覚的に確認 · 空白時間を即座に発見
              </p>
            </div>
          </div>
          
          {/* 時刻の目盛���（改善版） */}
          <div className="flex items-start gap-2">
            <div className="w-24 flex-shrink-0 pt-6"></div>
            <div className="flex-1">
              <div className="relative h-12 border-b-2 border-gray-300">
                {/* メジャーな時刻（3時間ごと） */}
                {Array.from({ length: 9 }, (_, i) => i * 3).map((hour) => (
                  <div
                    key={hour}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="h-3 w-0.5 bg-gray-400 mb-1"></div>
                    <div className="text-sm text-gray-900 px-2 py-0.5 bg-white rounded shadow-sm">
                      {hour}:00
                    </div>
                  </div>
                ))}
                
                {/* マイナーな時刻（1時間ごと） */}
                {Array.from({ length: 24 }, (_, i) => i).filter(h => h % 3 !== 0).map((hour) => (
                  <div
                    key={hour}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="h-2 w-0.5 bg-gray-300 mb-1"></div>
                    <div className="text-xs text-muted-foreground">
                      {hour}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* タイムライン本体 */}
        <ScrollArea className="h-[650px]">
          <div className="p-4 space-y-2">
            {days.map((day) => {
              const dayOfWeek = getDayOfWeek(viewYear, viewMonth, day);
              const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayAssignments = assignments.filter(
                (a) => a.date === dateStr && a.timeSlotId !== null && !a.isVacationRequest
              );
              const hasWarnings = dayAssignments.some((a) => a.hasWarning);
              const isHolidayDay = isHoliday(viewYear, viewMonth, day);
              const isSaturday = dayOfWeekNum === 6;
              const isSunday = dayOfWeekNum === 0;
              
              // 動的な高さ計算（勤務者数に応じて）
              const rowHeight = Math.max(3, dayAssignments.length) * 2.5; // rem単位
              const isExpanded = expandedDates.has(dateStr);

              return (
                <div
                  key={day}
                  className={`rounded-xl transition-all ${
                    hasWarnings 
                      ? "bg-amber-50/70 border-2 border-amber-200" 
                      : isHolidayDay 
                      ? "bg-red-50/70 border-2 border-red-200"
                      : isSunday
                      ? "bg-red-50/50 border-2 border-red-100"
                      : isSaturday 
                      ? "bg-blue-50/70 border-2 border-blue-200" 
                      : "border-2 border-gray-100"
                  }`}
                >
                  {/* 日付ヘッダー（クリックで展開） */}
                  <div className="flex items-stretch gap-2">
                    {/* 日付表示（展開ボタン付き） */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedDates);
                        if (newExpanded.has(dateStr)) {
                          newExpanded.delete(dateStr);
                        } else {
                          newExpanded.add(dateStr);
                        }
                        setExpandedDates(newExpanded);
                      }}
                      className={`w-20 flex-shrink-0 p-2 flex flex-col items-center justify-center border-r-2 bg-white/50 rounded-l-xl transition-all hover:bg-white/80 ${
                        isHolidayDay 
                          ? "border-red-200"
                          : isSunday
                          ? "border-red-100"
                          : isSaturday
                          ? "border-blue-200"
                          : "border-gray-200"
                      }`}
                    >
                      <div className={`text-xs mb-0.5 ${
                        isHolidayDay || isSunday
                          ? "text-red-600"
                          : isSaturday
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      }`}>
                        {dayOfWeek}
                        {isHolidayDay && " 🎌"}
                      </div>
                      <div className={`text-xl ${
                        isHolidayDay || isSunday
                          ? "text-red-700"
                          : isSaturday
                          ? "text-blue-700"
                          : "text-gray-900"
                      }`}>
                        {day}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span>{dayAssignments.length}名</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </button>

                    {/* 24時間タイムライン（コンパクト/展開切り替え） */}
                    <div 
                      className="flex-1 relative py-2 pr-2"
                      style={{ minHeight: isExpanded ? "auto" : "3.5rem" }}
                    >
                    {/* 背景グリッド（改善版 - 3時間ごと） */}
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 ${
                          i === 0 ? "border-l-2 border-gray-300" : "border-l border-gray-200"
                        }`}
                        style={{ left: `${(i / 8) * 100}%` }}
                      ></div>
                    ))}
                    
                    {/* 時間帯ごとの背景色（夜間を暗く） */}
                    <div
                      className="absolute top-0 bottom-0 bg-slate-100/40"
                      style={{ 
                        left: `${(0 / 24) * 100}%`, 
                        width: `${(6 / 24) * 100}%` 
                      }}
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 bg-slate-100/40"
                      style={{ 
                        left: `${(21 / 24) * 100}%`, 
                        width: `${(3 / 24) * 100}%` 
                      }}
                    ></div>
                    
                    {/* 勤務割り当ての帯（改善版 - 縦に積み上げ） */}
                    {dayAssignments.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 px-4 py-2 rounded-xl shadow-sm border border-red-200">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">人員未配置</span>
                        </div>
                      </div>
                    ) : (
                      dayAssignments.map((assignment, index) => {
                        const timeSlot = timeSlots.find((ts) => ts.id === assignment.timeSlotId);
                        if (!timeSlot) return null;

                        const { left, width } = calculateTimelinePosition(
                          timeSlot.startTime,
                          timeSlot.endTime
                        );

                        // 縦方向の位置を計算
                        const topOffset = isExpanded ? index * 2.2 : 0.5; // rem単位
                        const barHeight = isExpanded ? 1.8 : 0.8; // rem単位
                        const positionColor = getPositionGroupColor(assignment.positionGroup);

                        return (
                          <div
                            key={index}
                            className={`absolute rounded-lg bg-gradient-to-r ${positionColor} shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-white group`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              top: `${topOffset}rem`,
                              height: `${barHeight}rem`,
                              zIndex: 10 + index,
                            }}
                            title={`${assignment.employeeName} - ${timeSlot.name} (${timeSlot.startTime}-${timeSlot.endTime})`}
                          >
                            <div className="h-full flex items-center justify-between px-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1 h-1 rounded-full bg-white shadow-sm flex-shrink-0"></div>
                                {isExpanded && (
                                  <span className="text-white text-xs truncate font-medium">
                                    {assignment.employeeName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isExpanded && (
                                  <span className="text-white/90 text-xs">
                                    {timeSlot.name}
                                  </span>
                                )}
                                {assignment.hasWarning && (
                                  <AlertTriangle className="w-3 h-3 text-amber-300 animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* 人員数のオーバーレイ表示（3時間ごと） - 簡素化 */}
                    {!isExpanded && dayAssignments.length > 0 && Array.from({ length: 8 }, (_, i) => i * 3).map((hour) => {
                      const count = getStaffCountAtTime(dateStr, hour);
                      const style = getStaffCountStyle(count);
                      
                      return (
                        <div
                          key={hour}
                          className={`absolute -bottom-1 px-1.5 py-0.5 rounded ${style.bg} ${style.text} border ${style.border} shadow-sm text-xs font-bold z-20`}
                          style={{ left: `${(hour / 24) * 100}%`, transform: "translateX(-50%)" }}
                        >
                          {count}
                        </div>
                      );
                    })}
                  </div>
                  </div>
                  
                  {/* 展開時の詳細表示 */}
                  {isExpanded && (
                    <div className="p-4 border-t bg-white/30">
                      <div className="grid grid-cols-8 gap-2">
                        {Array.from({ length: 8 }, (_, i) => i * 3).map((hour) => {
                          const count = getStaffCountAtTime(dateStr, hour);
                          const staffList = getStaffListAtTime(dateStr, hour);
                          const style = getStaffCountStyle(count);
                          const endHour = (hour + 3) % 24;
                          
                          return (
                            <div
                              key={hour}
                              className="bg-white rounded-lg p-2 border-2 border-gray-100 hover:border-gray-200 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground">
                                  {hour}:00-{endHour}:00
                                </div>
                                <div className={`px-1.5 py-0.5 rounded text-xs font-bold ${style.bg} ${style.text}`}>
                                  {count}
                                </div>
                              </div>
                              
                              {staffList.length > 0 ? (
                                <div className="space-y-1">
                                  {staffList.map((staff, index) => (
                                    <div 
                                      key={index}
                                      className="text-xs p-1 rounded bg-muted/50"
                                    >
                                      <div className="font-medium truncate">
                                        {staff.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {staff.timeSlot.split(" ")[0]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  <span>なし</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground mb-2">この日の全勤務者</div>
                        <div className="flex flex-wrap gap-2">
                          {dayAssignments.map((assignment, index) => {
                            const positionBadge = assignment.positionGroup === "fulltime" ? "正社員" : "パート";
                            const positionColor = assignment.positionGroup === "fulltime" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700";
                            
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200"
                              >
                                <span className="text-sm font-medium">{assignment.employeeName}</span>
                                <Badge variant="outline" className={`text-xs ${positionColor} border-0`}>
                                  {positionBadge}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* 凡例（改善版） */}
        <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-slate-50">
          <div className="space-y-2">
            {/* 役職グループと人員数 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* 役職グループ */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground font-medium">役職:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-4 rounded bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm"></div>
                  <span>正社員</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-4 rounded bg-gradient-to-r from-teal-400 to-teal-600 shadow-sm"></div>
                  <span>パート</span>
                </div>
              </div>
              
              {/* 人員数 */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground font-medium">人員数:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-5 bg-red-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">0</div>
                  <span>緊急</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-5 bg-yellow-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">1-2</div>
                  <span>注意</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-5 bg-green-500 rounded text-white flex items-center justify-center text-xs font-bold shadow-sm">3+</div>
                  <span>充足</span>
                </div>
              </div>
            </div>
            
            {/* 日付タイプ */}
            <div className="flex items-center flex-wrap gap-3 text-xs pt-2 border-t">
              <span className="text-muted-foreground font-medium">日付:</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-amber-50 border-2 border-amber-200 rounded"></div>
                <span>警告あり</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-50 border-2 border-red-200 rounded"></div>
                <span>祝日🎌</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-50 border-2 border-red-100 rounded"></div>
                <span>日曜</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-50 border-2 border-blue-200 rounded"></div>
                <span>土曜</span>
              </div>
              <div className="flex items-center gap-1 ml-auto text-muted-foreground">
                <Info className="w-3 h-3" />
                <span>日付をクリックで詳細表示</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderTableView = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // 全職員を取得（モックデータ）
    const employees = [
      { id: "EMP001", name: "山田 太郎" },
      { id: "EMP002", name: "佐藤 花子" },
      { id: "EMP003", name: "鈴木 一郎" },
      { id: "EMP004", name: "田中 美咲" },
      { id: "EMP005", name: "高橋 健太" },
    ];
    
    // 各職員の各日のシフトを取得
    const getAssignment = (employeeId: string, day: number) => {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return assignments.find((a) => a.date === dateStr && a.employeeId === employeeId);
    };
    
    return (
      <div className="space-y-4">
        <Card className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm text-gray-900">テーブルビュー</h3>
                <p className="text-xs text-muted-foreground">
                  職員 {employees.length}名 × {daysInMonth}日間のシフト
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              クリックで編集（実装予定）
            </Badge>
          </div>
        </Card>
        
        <Card className="rounded-2xl overflow-hidden">
          <ScrollArea className="w-full h-[600px]">
            <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 z-20 bg-muted/50 min-w-[120px] border-r">
                    職員名
                  </TableHead>
                  {days.map((day) => {
                    const dayOfWeek = getDayOfWeek(viewYear, viewMonth, day);
                    const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
                    const isHolidayDay = isHoliday(viewYear, viewMonth, day);
                    const isSaturday = dayOfWeekNum === 6;
                    const isSunday = dayOfWeekNum === 0;
                    return (
                      <TableHead 
                        key={day} 
                        className={`text-center min-w-[80px] ${
                          isHolidayDay 
                            ? "bg-red-50/50" 
                            : isSunday
                            ? "bg-red-50/30"
                            : isSaturday 
                            ? "bg-blue-50/50" 
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className={`text-xs ${
                            isHolidayDay || isSunday
                              ? "text-red-600" 
                              : isSaturday
                              ? "text-blue-600" 
                              : "text-muted-foreground"
                          }`}>
                            {dayOfWeek}
                            {isHolidayDay && " 🎌"}
                          </div>
                          <div className={
                            isHolidayDay || isSunday
                              ? "text-red-700" 
                              : isSaturday
                              ? "text-blue-700" 
                              : ""
                          }>{day}</div>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 z-10 bg-background border-r">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="text-sm">{employee.name}</div>
                      </div>
                    </TableCell>
                    {days.map((day) => {
                      const assignment = getAssignment(employee.id, day);
                      const dayOfWeek = getDayOfWeek(viewYear, viewMonth, day);
                      const dayOfWeekNum = getDayOfWeekNumber(viewYear, viewMonth, day);
                      const isHolidayDay = isHoliday(viewYear, viewMonth, day);
                      const isSaturday = dayOfWeekNum === 6;
                      const isSunday = dayOfWeekNum === 0;
                      
                      return (
                        <TableCell 
                          key={day} 
                          className={`text-center p-2 cursor-pointer hover:bg-primary/5 transition-colors ${
                            isHolidayDay 
                              ? "bg-red-50/30" 
                              : isSunday
                              ? "bg-red-50/20"
                              : isSaturday 
                              ? "bg-blue-50/30" 
                              : ""
                          } ${
                            assignment?.hasWarning ? "bg-amber-50" : ""
                          }`}
                          onClick={() => handleCellClick(employee.id, employee.name, day)}
                        >
                          {assignment ? (
                            <div className="flex flex-col items-center gap-1">
                              {assignment.timeSlotName ? (
                                <Badge 
                                  variant="default" 
                                  className="text-xs px-2 py-0.5"
                                >
                                  {assignment.timeSlotName}
                                </Badge>
                              ) : (
                                <Badge 
                                  variant={assignment.isVacationRequest ? "destructive" : "secondary"}
                                  className="text-xs px-2 py-0.5"
                                >
                                  {assignment.isVacationRequest ? "希望休" : "休"}
                                </Badge>
                              )}
                              {assignment.hasWarning && (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">-</div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        
        {/* 凡例 */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-2 py-0.5">早番</Badge>
              <span>勤務</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs px-2 py-0.5">希望休</Badge>
              <span>希望休</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">休</Badge>
              <span>休み</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
              <span>警告あり</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>祝日</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-100 rounded"></div>
              <span>日曜</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>土曜</span>
            </div>
          </div>
        </div>
        </Card>
      </div>
    );
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
              <Users className="w-4 h-4 text-blue-600" />
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
        {viewMode === "calendar" ? renderCalendarView() : renderTableView()}
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
