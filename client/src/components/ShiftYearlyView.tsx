import { useState, useEffect } from "react";
import { Sparkles, Calendar as CalendarIcon, Plus, Pencil, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/useToast";
import { shiftService } from "../services/shiftService";
import type { Shift as ApiShift, ShiftStatus } from "../types/api";

interface ShiftYearlyViewProps {
  onEditShift?: (shiftId: string) => void;
  onDecemberClick?: () => void;
  onJanuaryClick?: () => void;
  onMonthClick?: (year: number, month: number, existingShiftId: number | null) => void;
}

interface MonthCardData {
  month: number;
  shift: ApiShift | null;
  status: ShiftStatus | "uncreated";
}

export function ShiftYearlyView({ onEditShift, onDecemberClick, onJanuaryClick, onMonthClick }: ShiftYearlyViewProps = {}) {
  const toast = useToast();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [shifts, setShifts] = useState<ApiShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'production' | 'development'>('production'); // タブ状態

  // 全シフトを読み込む（activeTabが変わったら再読み込み）
  useEffect(() => {
    loadShifts();
  }, [activeTab]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      // activeTabに応じてフィルタリング
      const isDevelopment = activeTab === 'development';
      const data = await shiftService.getAllShifts(isDevelopment);
      setShifts(data);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      toast.error('シフトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 選択年の12ヶ月分のカードデータを生成
  const monthCards: MonthCardData[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // 同じ年月に複数のシフトがある場合は、最新のもの（IDが最大）を表示
    const monthShifts = shifts.filter(s => s.year === selectedYear && s.month === month);
    const shift = monthShifts.length > 0
      ? monthShifts.reduce((latest, current) => current.id > latest.id ? current : latest)
      : null;
    return {
      month,
      shift: shift || null,
      status: shift ? shift.status : "uncreated",
    };
  });

  // カードクリック処理
  const handleCardClick = async (card: MonthCardData) => {
    // 12月の場合：既存の12月専用システムを使用
    if (card.month === 12) {
      if (onDecemberClick) {
        onDecemberClick();
      } else {
        toast.info("12月シフト生成画面へ遷移します");
      }
      return;
    }

    // 2026年1月の場合：1月専用システムを使用
    if (selectedYear === 2026 && card.month === 1) {
      if (onJanuaryClick) {
        onJanuaryClick();
      } else {
        toast.info("1月シフト生成画面へ遷移します");
      }
      return;
    }

    // 12月・1月以外：新しいシステムを使用（選択モーダル表示）
    if (onMonthClick) {
      onMonthClick(selectedYear, card.month, card.shift?.id || null);
      return;
    }

    // フォールバック：従来の動作（onMonthClickが設定されていない場合）
    if (card.shift) {
      // 既存のシフトがある場合は編集画面へ
      if (onEditShift) {
        onEditShift(card.shift.id.toString());
      } else {
        toast.info("シフト編集画面へ遷移します");
      }
    } else {
      // シフトが存在しない場合は新規作成（下書きとして）
      try {
        setIsCreating(card.month);
        const newShift = await shiftService.createShift({
          year: selectedYear,
          month: card.month,
          name: `${selectedYear}年${card.month}月シフト`,
        });
        toast.success(`${card.month}月のシフトを作成しました`);
        // リロード
        await loadShifts();
        // 作成したシフトの編集画面へ
        if (onEditShift && newShift.id) {
          onEditShift(newShift.id.toString());
        }
      } catch (error) {
        console.error('Failed to create shift:', error);
        toast.error("シフトの作成に失敗しました");
      } finally {
        setIsCreating(null);
      }
    }
  };

  // ステータスのラベル
  const getStatusLabel = (status: ShiftStatus | "uncreated") => {
    switch (status) {
      case "draft":
        return "下書き";
      case "ai_generated":
        return "AI生成済";
      case "tentative":
        return "仮確定";
      case "confirmed":
        return "確定";
      case "archived":
        return "アーカイブ";
      case "uncreated":
        return "未作成";
    }
  };

  // ステータスの色
  const getStatusColor = (status: ShiftStatus | "uncreated") => {
    switch (status) {
      case "draft":
        return "from-gray-100 to-gray-50 border-gray-300";
      case "ai_generated":
        return "from-purple-100 to-pink-50 border-purple-300";
      case "tentative":
        return "from-yellow-100 to-yellow-50 border-yellow-300";
      case "confirmed":
        return "from-green-100 to-green-50 border-green-300";
      case "archived":
        return "from-red-100 to-red-50 border-red-300";
      case "uncreated":
        return "from-blue-50 to-indigo-50 border-blue-200";
    }
  };

  // ステータスのバッジ色
  const getStatusBadgeClass = (status: ShiftStatus | "uncreated") => {
    switch (status) {
      case "draft":
        return "bg-gray-200 text-gray-700";
      case "ai_generated":
        return "bg-purple-200 text-purple-800";
      case "tentative":
        return "bg-yellow-200 text-yellow-800";
      case "confirmed":
        return "bg-green-200 text-green-800";
      case "archived":
        return "bg-red-200 text-red-800";
      case "uncreated":
        return "bg-blue-200 text-blue-800";
    }
  };

  // 月名を取得
  const getMonthName = (month: number) => {
    return `${month}月`;
  };

  // 年を変更
  const changeYear = (delta: number) => {
    setSelectedYear(prev => prev + delta);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900">年間シフト管理</h1>
            <p className="text-sm text-muted-foreground">
              年間のシフト状況を一覧表示
            </p>
          </div>
        </div>

        {/* 年選択 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeYear(-1)}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border-2 border-primary/20">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span className="text-lg text-primary">{selectedYear}年</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeYear(1)}
            className="rounded-xl"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('production')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'production'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          本番シフト
        </button>
        <button
          onClick={() => setActiveTab('development')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'development'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          開発専用シフト
        </button>
      </div>

      {/* 12ヶ月のグリッド */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            読み込み中...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthCards.map((card) => {
            const isCreatingThis = isCreating === card.month;
            const isPast = selectedYear < currentYear ||
                          (selectedYear === currentYear && card.month < currentMonth);

            return (
              <Card
                key={card.month}
                className={`p-5 bg-gradient-to-br ${getStatusColor(card.status)} border-2 rounded-2xl transition-all cursor-pointer hover:shadow-lg hover:scale-105 ${
                  isPast ? 'opacity-60' : ''
                }`}
                onClick={() => !isCreatingThis && handleCardClick(card)}
              >
                <div className="space-y-3">
                  {/* 月とステータスバッジ */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg">{getMonthName(card.month)}</h3>
                    </div>
                    <Badge className={`${getStatusBadgeClass(card.status)} text-xs`}>
                      {getStatusLabel(card.status)}
                    </Badge>
                  </div>

                  {/* シフト名・作成日・更新日 */}
                  {card.shift && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="font-medium text-gray-700 truncate">{card.shift.name}</div>
                      <div>作成: {new Date(card.shift.createdAt).toLocaleDateString("ja-JP")}</div>
                      <div>更新: {new Date(card.shift.updatedAt).toLocaleDateString("ja-JP")}</div>
                    </div>
                  )}

                  {/* アクションアイコン */}
                  <div className="flex items-center justify-center pt-2">
                    {isCreatingThis ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        作成中...
                      </div>
                    ) : card.shift ? (
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <Pencil className="w-4 h-4" />
                        編集する
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Plus className="w-4 h-4" />
                        新規作成
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
