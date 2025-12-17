import { useState, useEffect } from "react";
import { X, Plus, Archive, Loader2, Calendar, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { trpcClient } from "../lib/trpc";
import type { Shift } from "../types/api";

interface DevShiftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  onSelectNew: () => void;
  onSelectCopy: (sourceShiftId: number) => void;
}

export function DevShiftSelectionModal({
  isOpen,
  onClose,
  year,
  month,
  onSelectNew,
  onSelectCopy,
}: DevShiftSelectionModalProps) {
  const [mode, setMode] = useState<"choice" | "copy">("choice");
  const [productionShifts, setProductionShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mode === "copy") {
      loadProductionShifts();
    }
  }, [isOpen, mode]);

  const loadProductionShifts = async () => {
    try {
      setIsLoading(true);
      // 本番シフトのみ取得（isDevelopment: false）
      const allShifts = await trpcClient.shifts.list.query({ isDevelopment: false });
      // 降順でソート
      const sorted = allShifts.sort((a, b) => b.id - a.id);
      setProductionShifts(sorted);
    } catch (error) {
      console.error("Failed to load production shifts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCopy = (shift: Shift) => {
    onSelectCopy(shift.id);
    onClose();
  };

  const handleSelectNew = () => {
    onSelectNew();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                開発専用シフト作成 ({year}年{month}月)
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "choice"
                  ? "作成方法を選択してください"
                  : "本番シフトを選択してコピー"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === "choice" ? (
            <div className="space-y-4">
              {/* メインの2つのボタン */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 新規作成 */}
                <button
                  onClick={handleSelectNew}
                  className="p-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Plus className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900">新規作成</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        ゼロからシフトを作成します
                      </p>
                    </div>
                  </div>
                </button>

                {/* 本番データをコピー */}
                <button
                  onClick={() => setMode("copy")}
                  className="p-6 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                      <Copy className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900">本番データをコピー</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        既存の本番シフトをコピーして作成
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 戻るボタン */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("choice")}
                className="rounded-xl"
              >
                ← 戻る
              </Button>

              {/* 本番シフト一覧 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    読み込み中...
                  </div>
                </div>
              ) : productionShifts.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    本番シフトがありません
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productionShifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => handleSelectCopy(shift)}
                      className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-green-900">
                              {shift.name}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              {shift.year}年{shift.month}月
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>作成: {new Date(shift.createdAt).toLocaleDateString("ja-JP")}</span>
                            <span>更新: {new Date(shift.updatedAt).toLocaleDateString("ja-JP")}</span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                              {shift.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-green-600 group-hover:translate-x-1 transition-transform">
                          →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <p className="text-xs text-muted-foreground text-center">
            {mode === "choice"
              ? "開発専用シフトは本番データとは完全に分離されます"
              : "本番シフトのデータをコピーして、開発専用シフトとして保存します"}
          </p>
        </div>
      </div>
    </div>
  );
}
