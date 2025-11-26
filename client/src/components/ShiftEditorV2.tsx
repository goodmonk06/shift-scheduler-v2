/**
 * シフトエディタ V2
 * 12月システムのUIを踏襲しつつ、データベース駆動で動作
 *
 * 参照: docs/IMPLEMENTATION_PLAN_2026.md - Phase 4
 */

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Save, Calendar, Lock, Play, FileCheck, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { useToast } from "../hooks/useToast";
import { useAsync } from "../hooks/useAsync";
import { trpcClient } from "../lib/trpc";
import { CalendarSkeleton } from "./ui/loading-skeleton";

interface ShiftEditorV2Props {
  shiftId: number;
  onBack?: () => void;
}

interface ShiftDetailData {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  displayText: string | null;
  startTime: string | null;
  endTime: string | null;
  leaveType: string | null;
  isFixed: boolean;
  sourceType: string | null;
}

interface EmployeeData {
  id: number;
  name: string;
}

export function ShiftEditorV2({ shiftId, onBack }: ShiftEditorV2Props) {
  const toast = useToast();
  const [editingCell, setEditingCell] = useState<{ employeeId: number; date: string } | null>(null);
  const [editMode, setEditMode] = useState<'time' | 'leave'>('time');
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('17:00');
  const [leaveType, setLeaveType] = useState<'休' | '有休'>('休');

  // シフト情報取得
  const {
    data: shiftInfo,
    isLoading: isLoadingShift,
    error: shiftError,
    refetch: refetchShift,
  } = useAsync(
    async () => {
      const result = await trpcClient.shifts.getById.query({ id: shiftId });
      return result;
    },
    {
      onError: (error) => {
        console.error("シフト情報取得エラー:", error);
        toast.error("シフト情報の取得に失敗しました");
      },
    }
  );

  // 職員一覧取得
  const {
    data: employees,
    isLoading: isLoadingEmployees,
  } = useAsync(
    async () => {
      const result = await trpcClient.employees.list.query();
      return result as EmployeeData[];
    },
    {
      onError: (error) => {
        console.error("職員一覧取得エラー:", error);
        toast.error("職員一覧の取得に失敗しました");
      },
    }
  );

  // シフト詳細取得
  const {
    data: shiftDetails,
    isLoading: isLoadingDetails,
    refetch: refetchDetails,
  } = useAsync(
    async () => {
      const result = await trpcClient.shiftDetails.getByShift.query({ shiftId });
      return result as ShiftDetailData[];
    },
    {
      onError: (error) => {
        console.error("シフト詳細取得エラー:", error);
        toast.error("シフト詳細の取得に失敗しました");
      },
    }
  );

  const isLoading = isLoadingShift || isLoadingEmployees || isLoadingDetails;

  // シフト情報の型変換
  const shift = shiftInfo as any;
  const year = shift?.year as number;
  const month = shift?.month as number;
  const status = shift?.status as string;

  // 日付配列生成
  const daysInMonth = useMemo(() => {
    if (!year || !month) return [];
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [year, month]);

  // シフトデータをマップ化（employeeId-date → detail）
  const shiftMap = useMemo(() => {
    const map = new Map<string, ShiftDetailData>();
    if (shiftDetails) {
      shiftDetails.forEach(detail => {
        const key = `${detail.employeeId}-${detail.date}`;
        map.set(key, detail);
      });
    }
    return map;
  }, [shiftDetails]);

  // 職員ごとの統計計算
  const employeeStats = useMemo(() => {
    if (!employees || !shiftDetails || !year || !month) return new Map();

    const statsMap = new Map<number, {
      days: number;
      hours: number;
      nightCount: number;
      holidays: number;
      paidHolidays: number;
    }>();

    employees.forEach(employee => {
      // この職員のシフト詳細を取得
      const employeeShifts = shiftDetails.filter(d => d.employeeId === employee.id);

      let days = 0;
      let hours = 0;
      let nightCount = 0;
      let holidays = 0;
      let paidHolidays = 0;

      employeeShifts.forEach(shift => {
        // 休日のカウント
        if (shift.status === 'requested_off' || shift.status === 'off' || shift.status === 'emergency_off') {
          if (shift.leaveType === '有休') {
            paidHolidays++;
          } else {
            holidays++;
          }
          return;
        }

        // 勤務日のカウント
        if (shift.status === 'working') {
          days++;

          // 夜勤判定（displayTextが「夜」または時間が21:00～09:00）
          const isNightShift = shift.displayText === '夜' ||
                               (shift.startTime === '21:00' && shift.endTime === '09:00');

          if (isNightShift) {
            nightCount++;
            hours += 15; // 夜勤は15時間（休憩2時間控除済み）
            return;
          }

          // 明け判定（勤務日数のみカウント、時間は夜勤に吸収）
          if (shift.displayText === '明') {
            return;
          }

          // 時間指定勤務の処理
          if (shift.startTime && shift.endTime) {
            const startHours = parseFloat(shift.startTime.split(':')[0]) + parseFloat(shift.startTime.split(':')[1]) / 60;
            const endHours = parseFloat(shift.endTime.split(':')[0]) + parseFloat(shift.endTime.split(':')[1]) / 60;
            let grossHours = endHours - startHours;

            // 日付をまたぐ場合
            if (grossHours < 0) {
              grossHours += 24;
            }

            // 簡易的な休憩時間控除（6時間超なら1時間）
            const breakHours = grossHours > 6 ? 1 : 0;
            hours += Math.max(0, grossHours - breakHours);
          }
        }
      });

      statsMap.set(employee.id, {
        days,
        hours: Math.round(hours * 10) / 10,
        nightCount,
        holidays,
        paidHolidays,
      });
    });

    return statsMap;
  }, [employees, shiftDetails, year, month]);

  // セルの表示テキストを取得
  const getCellDisplay = (employeeId: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${employeeId}-${dateStr}`;
    const detail = shiftMap.get(key);

    if (!detail) return null;

    return {
      text: detail.displayText || '',
      isFixed: detail.isFixed,
      sourceType: detail.sourceType,
    };
  };

  // セルクリックハンドラ
  const handleCellClick = (employeeId: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 既存データがあれば読み込む
    const key = `${employeeId}-${dateStr}`;
    const existingDetail = shiftMap.get(key);
    if (existingDetail) {
      if (existingDetail.leaveType) {
        setEditMode('leave');
        setLeaveType(existingDetail.leaveType as '休' | '有休');
      } else {
        setEditMode('time');
        if (existingDetail.startTime && existingDetail.endTime) {
          setCustomStartTime(existingDetail.startTime);
          setCustomEndTime(existingDetail.endTime);
        }
      }
    } else {
      setEditMode('time');
      setCustomStartTime('09:00');
      setCustomEndTime('17:00');
    }

    setEditingCell({ employeeId, date: dateStr });
  };

  // セル編集ダイアログを閉じる
  const handleCloseDialog = () => {
    setEditingCell(null);
    setEditMode('time');
    setCustomStartTime('09:00');
    setCustomEndTime('17:00');
    setLeaveType('休');
  };

  // プリセット時間ボタンハンドラ
  const handlePresetTime = (startTime: string, endTime: string) => {
    setCustomStartTime(startTime);
    setCustomEndTime(endTime);
    setEditMode('time');
  };

  // セルを保存
  const handleSaveCell = async () => {
    if (!editingCell) return;

    try {
      const { employeeId, date } = editingCell;

      if (editMode === 'leave') {
        // 休み登録
        await trpcClient.shiftDetails.create.mutate({
          shiftId,
          employeeId,
          date,
          status: 'requested_off',
          leaveType,
        });
      } else {
        // 時間指定勤務登録
        await trpcClient.shiftDetails.create.mutate({
          shiftId,
          employeeId,
          date,
          status: 'working',
          startTime: customStartTime,
          endTime: customEndTime,
        });
      }

      toast.success("シフトを保存しました");
      await refetchDetails();
      handleCloseDialog();
    } catch (error: any) {
      console.error("シフト保存エラー:", error);
      toast.error("保存に失敗しました");
    }
  };

  // 段階的配置を実行
  const handlePhasedGeneration = async () => {
    try {
      toast.info("段階的配置を開始しています...");
      const result = await trpcClient.shifts.generatePhased.mutate({ shiftId });
      toast.success(`段階的配置が完了しました（Phase 1: ${result.phase1Count}件）`);
      await refetchShift();
      await refetchDetails();
    } catch (error: any) {
      console.error("段階的配置エラー:", error);
      toast.error(`段階的配置に失敗しました: ${error.message}`);
    }
  };

  // 仮確定
  const handleSetTentative = async () => {
    try {
      await trpcClient.shifts.setTentative.mutate({ shiftId });
      toast.success("仮確定しました");
      await refetchShift();
    } catch (error: any) {
      console.error("仮確定エラー:", error);
      toast.error(`仮確定に失敗しました: ${error.message}`);
    }
  };

  // 確定
  const handleConfirm = async () => {
    try {
      await trpcClient.shifts.confirmShift.mutate({ shiftId });
      toast.success("シフトを確定しました");
      await refetchShift();
    } catch (error: any) {
      console.error("確定エラー:", error);
      toast.error(`確定に失敗しました: ${error.message}`);
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <CalendarSkeleton />
          <p className="text-center text-muted-foreground mt-4">シフトデータを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (shiftError || !shift) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-destructive">シフト情報の取得に失敗しました</p>
          <Button onClick={() => refetchShift()} className="mt-4">
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" onClick={onBack} className="rounded-lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  戻る
                </Button>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">
                  {year}年{month}月シフト編集
                </h1>
                <Badge variant={status === 'confirmed' ? 'default' : 'outline'}>
                  {status === 'draft' && '下書き'}
                  {status === 'vacation_only' && '希望休のみ'}
                  {status === 'ai_generated' && 'AI生成済み'}
                  {status === 'tentative' && '仮確定'}
                  {status === 'confirmed' && '確定'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePhasedGeneration}
                disabled={status === 'confirmed'}
                variant="outline"
                className="rounded-lg border-blue-300 hover:bg-blue-50"
              >
                <Play className="w-4 h-4 mr-2" />
                段階的配置
              </Button>
              <Button
                onClick={handleSetTentative}
                disabled={status === 'confirmed' || status === 'tentative'}
                variant="outline"
                className="rounded-lg border-yellow-300 hover:bg-yellow-50"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                仮確定
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={status === 'confirmed'}
                variant="default"
                className="rounded-lg bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                確定
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto p-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-20 bg-muted/50 border border-border px-3 py-2 text-left font-semibold min-w-[100px]">
                    職員名
                  </th>
                  {daysInMonth.map(day => (
                    <th
                      key={day}
                      className="border border-border px-2 py-2 text-center font-semibold min-w-[60px]"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="border border-border px-3 py-2 text-center font-semibold min-w-[80px] bg-blue-50">
                    日数
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-semibold min-w-[80px] bg-purple-50">
                    時間
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-semibold min-w-[80px] bg-indigo-50">
                    夜勤
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-semibold min-w-[80px] bg-green-50">
                    休日
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-semibold min-w-[80px] bg-yellow-50">
                    有給
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees?.map(employee => (
                  <tr key={employee.id} className="hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-background border border-border px-3 py-2 font-medium">
                      {employee.name}
                    </td>
                    {daysInMonth.map(day => {
                      const cellData = getCellDisplay(employee.id, day);
                      const isLocked = cellData?.isFixed || false;

                      return (
                        <td
                          key={day}
                          className={`border border-border px-1 py-1 text-center cursor-pointer hover:bg-accent/50 transition-colors ${
                            isLocked ? 'bg-yellow-50' : ''
                          }`}
                          onClick={() => !isLocked && handleCellClick(employee.id, day)}
                        >
                          <div className="flex items-center justify-center gap-1 min-h-[40px]">
                            {isLocked && <Lock className="w-3 h-3 text-yellow-600" />}
                            <span className={`text-xs ${isLocked ? 'text-yellow-800 font-semibold' : ''}`}>
                              {cellData?.text || ''}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    {/* 統計列 */}
                    {(() => {
                      const stats = employeeStats.get(employee.id);
                      return (
                        <>
                          <td className="border border-border px-2 py-2 text-center bg-blue-50/50 font-semibold text-blue-700">
                            {stats?.days || 0}
                          </td>
                          <td className="border border-border px-2 py-2 text-center bg-purple-50/50 font-semibold text-purple-700">
                            {stats?.hours.toFixed(1) || '0.0'}
                          </td>
                          <td className="border border-border px-2 py-2 text-center bg-indigo-50/50 font-semibold text-indigo-700">
                            {stats?.nightCount || 0}
                          </td>
                          <td className="border border-border px-2 py-2 text-center bg-green-50/50 font-semibold text-green-700">
                            {stats?.holidays || 0}
                          </td>
                          <td className="border border-border px-2 py-2 text-center bg-yellow-50/50 font-semibold text-yellow-700">
                            {stats?.paidHolidays || 0}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 凡例 */}
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-600" />
              <span>希望休・希望シフト由来（編集不可）</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">夜</Badge>
              <span>夜勤（21:00～翌9:00、15時間）</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">明</Badge>
              <span>明け（勤務日数のみカウント）</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">休</Badge>
              <span>休日</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">有休</Badge>
              <span>有給休暇</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">9～15</Badge>
              <span>時間指定勤務</span>
            </div>
          </div>
        </Card>
      </div>

      {/* セル編集ダイアログ */}
      <Dialog open={!!editingCell} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCell && `${editingCell.date} - ${employees?.find(e => e.id === editingCell.employeeId)?.name || ''}`}
            </DialogTitle>
            <DialogDescription>
              シフトを編集してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 時間指定プリセット */}
            <div className="space-y-2">
              <Label>時間指定プリセット</Label>
              <div className="grid grid-cols-5 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('09:00', '13:00')}
                  className="rounded-lg"
                >
                  9～13
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('09:00', '15:00')}
                  className="rounded-lg"
                >
                  9～15
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('13:00', '17:00')}
                  className="rounded-lg"
                >
                  13～17
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('21:00', '09:00')}
                  className="rounded-lg bg-purple-50"
                >
                  夜勤
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('09:00', '09:00')}
                  className="rounded-lg bg-orange-50"
                >
                  明け
                </Button>
              </div>
            </div>

            {/* カスタム時間 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">開始時刻</Label>
                <select
                  id="startTime"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">終了時刻</Label>
                <select
                  id="endTime"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 休み */}
            <div className="space-y-2">
              <Label>休み</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditMode('leave');
                    setLeaveType('休');
                  }}
                  className={`rounded-lg ${editMode === 'leave' && leaveType === '休' ? 'bg-green-100 border-green-400' : ''}`}
                >
                  休
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditMode('leave');
                    setLeaveType('有休');
                  }}
                  className={`rounded-lg ${editMode === 'leave' && leaveType === '有休' ? 'bg-yellow-100 border-yellow-400' : ''}`}
                >
                  有休
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="rounded-lg">
              キャンセル
            </Button>
            <Button onClick={handleSaveCell} className="rounded-lg">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
