/**
 * シンプル化された新しいシフトエディター
 * AI生成風UI + 手動編集 + PDF出力
 */

import React, { useState, useEffect } from 'react';
import { Brain, FileDown, Save, Edit3, Calendar, Users, Clock, ChevronLeft } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LoadingInline } from './ui/loading-spinner';
import AIGenerationModal from './AIGenerationModal';
import { useToast } from '../hooks/useToast';
import { trpcClient } from '../lib/trpc';
import { shiftService } from '../services/shiftService';

interface ShiftCell {
  employeeId: number;
  employeeName: string;
  date: string;
  shiftType: string;
  startTime?: string;
  endTime?: string;
  isHoliday?: boolean;
  isWorkPreference?: boolean;
}

interface ShiftEditorNewProps {
  shiftId?: string;
  onBack?: () => void;
}

export function ShiftEditorNew({ shiftId, onBack }: ShiftEditorNewProps) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shiftData, setShiftData] = useState<ShiftCell[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(12);
  const [currentYear, setCurrentYear] = useState(2025);

  // シフトタイプの定義
  const shiftTypes = [
    { id: 'HAYABAN', label: '早番', color: 'bg-yellow-100 text-yellow-800', time: '7:00-16:00' },
    { id: 'NIKKIN_A', label: '日勤A', color: 'bg-blue-100 text-blue-800', time: '8:00-17:00' },
    { id: 'NIKKIN_B', label: '日勤B', color: 'bg-green-100 text-green-800', time: '9:00-18:00' },
    { id: 'OSOBAN', label: '遅番', color: 'bg-purple-100 text-purple-800', time: '11:00-20:00' },
    { id: 'YAKIN_IRI', label: '夜勤入', color: 'bg-red-100 text-red-800', time: '16:00-翌10:00' },
    { id: 'YAKIN_AKE', label: '明け', color: 'bg-gray-100 text-gray-600', time: '0:00-10:00' },
    { id: 'OFF', label: '休み', color: 'bg-gray-50 text-gray-500', time: '-' },
    { id: 'YUKYU', label: '有休', color: 'bg-orange-100 text-orange-800', time: '-' },
  ];

  // 既存のシフトデータを読み込む
  useEffect(() => {
    loadExistingShift();
  }, [shiftId]);

  const loadExistingShift = async () => {
    setIsLoading(true);
    try {
      // 従業員データを取得
      const employeesData = await trpcClient.employees.list.query();
      const formattedEmployees = employeesData.map((emp: any) => ({
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        dbId: emp.id
      }));
      setEmployees(formattedEmployees);

      // shiftIdが提供されている場合、シフトデータを取得
      if (shiftId) {
        const shift = await shiftService.getShiftById(Number(shiftId));
        if (shift) {
          // 年月を設定
          setCurrentYear(shift.year);
          setCurrentMonth(shift.month);

          // シフト詳細を取得
          const details = await trpcClient.shiftDetails.getByShift.query({ shiftId: Number(shiftId) });

          // シフトデータを変換
          const cells = details.map((d: any) => ({
            employeeId: d.employeeId,
            employeeName: d.employee?.name || '',
            date: d.date,
            shiftType: mapTimeSlotToShiftType(d.status || 'OFF'),
            startTime: d.startTime,
            endTime: d.endTime,
            isHoliday: d.leaveType ? true : false,
            isWorkPreference: false,
          }));
          setShiftData(cells);
        }
      }
    } catch (error) {
      console.error('Failed to load shift data:', error);
      toast.show('シフトデータの読み込みに失敗しました', 'error');
    }
    setIsLoading(false);
  };

  // タイムスロット名をシフトタイプにマッピング
  const mapTimeSlotToShiftType = (status: string | null): string => {
    if (!status) return 'OFF';
    const mapping: Record<string, string> = {
      // 時間枠名
      '早番': 'HAYABAN',
      '日勤A': 'NIKKIN_A',
      '日勤B': 'NIKKIN_B',
      '遅番': 'OSOBAN',
      '夜勤入り': 'YAKIN_IRI',
      '夜勤明け': 'YAKIN_AKE',
      '明': 'YAKIN_AKE',
      '休み': 'OFF',
      '有給': 'YUKYU',
      '有休': 'YUKYU',
      // ステータス値
      'requested_off': 'OFF',
      'requested_work': 'NIKKIN_A',
      'off': 'OFF',
      'yukyu': 'YUKYU',
      'early': 'HAYABAN',
      'day_a': 'NIKKIN_A',
      'day_b': 'NIKKIN_B',
      'late': 'OSOBAN',
      'night_in': 'YAKIN_IRI',
      'night_out': 'YAKIN_AKE',
    };
    return mapping[status] || 'OFF';
  };

  // AI生成を実行
  const handleAIGeneration = async () => {
    if (!shiftId) {
      toast.show('シフトIDが指定されていません', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      // AIモーダルの表示と同時に生成を開始
      await trpcClient.shifts.generatePhaseBased.mutate({
        shiftId: Number(shiftId),
      });

      // 生成完了後、モーダルは自動で閉じる
      // handleGenerationCompleteが呼ばれる
    } catch (error) {
      console.error('AI generation failed:', error);
      setIsGenerating(false);
      toast.show('シフト生成に失敗しました', 'error');
    }
  };

  const handleGenerationComplete = async () => {
    setIsGenerating(false);
    await loadExistingShift();
    toast.show('AIによるシフト生成が完了しました', 'success');
  };

  // セルの編集
  const handleCellEdit = (employeeId: number, date: string, newShiftType: string) => {
    setShiftData(prev => {
      const existing = prev.find(c => c.employeeId === employeeId && c.date === date);
      const shiftType = shiftTypes.find(s => s.id === newShiftType);

      if (existing) {
        return prev.map(c =>
          c.employeeId === employeeId && c.date === date
            ? { ...c, shiftType: newShiftType, startTime: shiftType?.time.split('-')[0], endTime: shiftType?.time.split('-')[1] }
            : c
        );
      } else {
        const employee = employees.find(e => e.id === employeeId);
        return [...prev, {
          employeeId,
          employeeName: employee?.name || '',
          date,
          shiftType: newShiftType,
          startTime: shiftType?.time.split('-')[0],
          endTime: shiftType?.time.split('-')[1],
        }];
      }
    });
    setEditingCell(null);
  };

  // PDF出力
  const exportToPDF = () => {
    window.print();
  };

  // 日付のリストを生成
  const getDates = () => {
    const dates = [];
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(currentYear, currentMonth - 1, day));
    }
    // 1月1日から5日まで追加
    if (currentMonth === 12) {
      for (let day = 1; day <= 5; day++) {
        dates.push(new Date(currentYear + 1, 0, day));
      }
    }
    return dates;
  };

  const dates = getDates();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">シフト作成・編集</h1>
            <p className="text-gray-600 mt-1">
              {currentYear}年{currentMonth}月のシフト
              {isLoading && <LoadingInline className="ml-2" />}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {/* AI生成ボタン */}
          {shiftData.length === 0 && (
            <Button
              size="lg"
              onClick={handleAIGeneration}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Brain className="w-5 h-5 mr-2" />
              AIでシフトを生成
            </Button>
          )}

          {/* PDF出力ボタン */}
          {shiftData.length > 0 && (
            <Button
              size="lg"
              variant="outline"
              onClick={exportToPDF}
              className="font-extrabold text-gray-900 border-2 border-gray-600 hover:bg-gray-100"
            >
              <FileDown className="w-6 h-6 mr-2" />
              PDF出力
            </Button>
          )}
        </div>
      </div>

      {/* 統計情報 */}
      {shiftData.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">職員数</p>
                <p className="text-xl font-bold">{employees.length}名</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">対象日数</p>
                <p className="text-xl font-bold">{dates.length}日</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">夜勤回数</p>
                <p className="text-xl font-bold">
                  {shiftData.filter(s => s.shiftType === 'YAKIN_IRI').length}回
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Edit3 className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">編集可能</p>
                <p className="text-xl font-bold">手動調整OK</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* シフト表 */}
      {shiftData.length > 0 && (
        <Card className="p-6">
          <div id="shift-table" className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-2 sticky left-0 bg-white z-10">職員名</th>
                  {dates.map(date => {
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                    const weekday = weekdays[date.getDay()];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <th
                        key={dateStr}
                        className={`p-2 text-center min-w-[60px] ${
                          isWeekend ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="text-xs">{dateStr}</div>
                        <div className={`text-xs ${isWeekend ? 'text-red-600' : 'text-gray-600'}`}>
                          {weekday}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium sticky left-0 bg-white z-10">
                      {employee.name}
                    </td>
                    {dates.map(date => {
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const cellKey = `${employee.id}-${dateStr}`;
                      const cell = shiftData.find(s => s.employeeId === employee.id && s.date === dateStr);
                      const shiftType = shiftTypes.find(s => s.id === (cell?.shiftType || 'OFF'));
                      const isEditing = editingCell === cellKey;
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <td
                          key={dateStr}
                          className={`p-1 text-center border ${isWeekend ? 'bg-red-50' : ''}`}
                          onClick={() => setEditingCell(cellKey)}
                        >
                          {isEditing ? (
                            <select
                              className="w-full text-xs p-1 border rounded"
                              value={cell?.shiftType || 'OFF'}
                              onChange={(e) => handleCellEdit(employee.id, dateStr, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                            >
                              {shiftTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge
                              className={`${shiftType?.color} text-xs cursor-pointer hover:opacity-80`}
                            >
                              {shiftType?.label}
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AI生成モーダル */}
      <AIGenerationModal
        isOpen={isGenerating}
        onComplete={handleGenerationComplete}
      />
    </div>
  );
}

export default ShiftEditorNew;