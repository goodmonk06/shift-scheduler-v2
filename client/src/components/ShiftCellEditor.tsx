/**
 * シフトセル編集ポップオーバー
 *
 * 特徴：
 * - 即時保存（保存ボタン押下で即座にAPI呼び出し）
 * - シフト種別のグループ表示
 * - パート・事務員の時間入力
 * - 夜勤ペア自動設定
 * - 希望休チェックボックス
 */

import { useState, useEffect } from 'react';
import {
  ShiftCell,
  ShiftType,
  SHIFT_TYPE_MASTER,
  formatTime
} from '../types/shiftV2Types';
import { cn } from './ui/utils';
import {
  Heart,
  Lock,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  X,
  Trash2,
  ChevronRight
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '../hooks/useToast';

interface ShiftCellEditorProps {
  cell: ShiftCell;
  employeeName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cell: ShiftCell) => Promise<void>;
  onDelete?: () => Promise<void>;
  isNightShiftPairRequired?: boolean; // 夜勤ペアが必要か
  children: React.ReactNode; // トリガー要素
}

// よく使う時間パターン
const TIME_PRESETS = [
  { label: '9-14', start: '09:00', end: '14:00' },
  { label: '9-16', start: '09:00', end: '16:00' },
  { label: '10-16', start: '10:00', end: '16:00' },
  { label: '8-12', start: '08:00', end: '12:00' },
  { label: '13-17', start: '13:00', end: '17:00' }
];

export function ShiftCellEditor({
  cell,
  employeeName,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  isNightShiftPairRequired = false,
  children
}: ShiftCellEditorProps) {
  const toast = useToast();
  const [editingCell, setEditingCell] = useState<ShiftCell>(cell);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // セルが変更されたら編集状態をリセット
  useEffect(() => {
    setEditingCell(cell);
    if (cell.startTime) setCustomStartTime(cell.startTime);
    if (cell.endTime) setCustomEndTime(cell.endTime);
  }, [cell]);

  // シフトタイプ変更ハンドラー
  const handleShiftTypeChange = (shiftType: ShiftType) => {
    const master = SHIFT_TYPE_MASTER[shiftType];

    setEditingCell({
      ...editingCell,
      shiftType,
      startTime: master.defaultStartTime || customStartTime,
      endTime: master.defaultEndTime || customEndTime
    });

    // デフォルト時間がある場合はカスタム時間もセット
    if (master.defaultStartTime) setCustomStartTime(master.defaultStartTime);
    if (master.defaultEndTime) setCustomEndTime(master.defaultEndTime);
  };

  // 時間プリセット適用
  const applyTimePreset = (preset: typeof TIME_PRESETS[0]) => {
    setCustomStartTime(preset.start);
    setCustomEndTime(preset.end);
    setEditingCell({
      ...editingCell,
      startTime: preset.start,
      endTime: preset.end
    });
  };

  // 保存処理
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 夜勤入りの場合の確認
      if (editingCell.shiftType === 'YAKIN_IRI' && isNightShiftPairRequired) {
        const confirmed = confirm('翌日に「夜勤明け」を自動的に設定します。よろしいですか？');
        if (!confirmed) {
          setIsSaving(false);
          return;
        }
      }

      // 時間入力が必要な場合のバリデーション
      const master = editingCell.shiftType ? SHIFT_TYPE_MASTER[editingCell.shiftType] : null;
      if (master?.requiresTimeInput) {
        if (!customStartTime || !customEndTime) {
          toast.error('時間を入力してください');
          setIsSaving(false);
          return;
        }
        editingCell.startTime = formatTime(customStartTime);
        editingCell.endTime = formatTime(customEndTime);
      }

      await onSave(editingCell);
      toast.success('保存しました');
      onOpenChange(false);
    } catch (error) {
      toast.error('保存に失敗しました');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      toast.success('削除しました');
      onOpenChange(false);
    } catch (error) {
      toast.error('削除に失敗しました');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 空白に戻す
  const handleClear = () => {
    setEditingCell({
      ...editingCell,
      shiftType: null,
      startTime: undefined,
      endTime: undefined,
      isHope: false,
      isLocked: false,
      note: undefined
    });
    setCustomStartTime('');
    setCustomEndTime('');
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">{employeeName}</h3>
              <p className="text-xs text-gray-600">{formatDate(cell.date)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ボディ */}
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {/* シフト種別選択 */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">シフト種別</Label>
              <RadioGroup
                value={editingCell.shiftType || ''}
                onValueChange={(value) => handleShiftTypeChange(value as ShiftType)}
              >
                {/* 固定シフト */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium mt-2">固定シフト</p>
                  {Object.values(SHIFT_TYPE_MASTER)
                    .filter(m => m.category === 'fixed')
                    .map(master => (
                      <div
                        key={master.type}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer',
                          editingCell.shiftType === master.type && 'bg-blue-50 border border-blue-200'
                        )}
                        onClick={() => handleShiftTypeChange(master.type)}
                      >
                        <RadioGroupItem value={master.type} id={master.type} />
                        <Label htmlFor={master.type} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                style={{
                                  backgroundColor: master.color,
                                  color: master.textColor
                                }}
                              >
                                {master.code}
                              </Badge>
                              <span className="text-sm">{master.label}</span>
                            </div>
                            {master.defaultStartTime && master.defaultEndTime && (
                              <span className="text-xs text-gray-500">
                                {master.defaultStartTime}〜{master.defaultEndTime}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                </div>

                {/* 休暇系 */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium mt-3">休暇</p>
                  {Object.values(SHIFT_TYPE_MASTER)
                    .filter(m => m.category === 'leave')
                    .map(master => (
                      <div
                        key={master.type}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer',
                          editingCell.shiftType === master.type && 'bg-blue-50 border border-blue-200'
                        )}
                        onClick={() => handleShiftTypeChange(master.type)}
                      >
                        <RadioGroupItem value={master.type} id={master.type} />
                        <Label htmlFor={master.type} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: master.color,
                                color: master.textColor
                              }}
                            >
                              {master.code}
                            </Badge>
                            <span className="text-sm">{master.label}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                </div>

                {/* 時間指定系 */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium mt-3">時間指定</p>
                  {Object.values(SHIFT_TYPE_MASTER)
                    .filter(m => m.category === 'flexible')
                    .map(master => (
                      <div
                        key={master.type}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer',
                          editingCell.shiftType === master.type && 'bg-blue-50 border border-blue-200'
                        )}
                        onClick={() => handleShiftTypeChange(master.type)}
                      >
                        <RadioGroupItem value={master.type} id={master.type} />
                        <Label htmlFor={master.type} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: master.color,
                                color: master.textColor
                              }}
                            >
                              {master.code}
                            </Badge>
                            <span className="text-sm">{master.label}</span>
                            <span className="text-xs text-gray-500">（自由時間）</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                </div>
              </RadioGroup>
            </div>

            {/* 時間入力（パート・事務員の場合） */}
            {editingCell.shiftType &&
              SHIFT_TYPE_MASTER[editingCell.shiftType].requiresTimeInput && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">時間設定</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <Input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="h-8"
                    />
                    <span>〜</span>
                    <Input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {/* プリセット */}
                  <div className="flex flex-wrap gap-1">
                    {TIME_PRESETS.map(preset => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => applyTimePreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            <Separator />

            {/* オプション */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isHope"
                  checked={editingCell.isHope}
                  onCheckedChange={(checked) =>
                    setEditingCell({ ...editingCell, isHope: !!checked })
                  }
                />
                <Label htmlFor="isHope" className="text-sm cursor-pointer flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  希望休として登録
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isLocked"
                  checked={editingCell.isLocked}
                  onCheckedChange={(checked) =>
                    setEditingCell({ ...editingCell, isLocked: !!checked })
                  }
                />
                <Label htmlFor="isLocked" className="text-sm cursor-pointer flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gray-500" />
                  このセルをロック（AI再生成で変更しない）
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* フッター */}
        <div className="px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isSaving || isDeleting}
              >
                空白に戻す
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSaving || isDeleting}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
              >
                {isSaving ? (
                  <>保存中...</>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}