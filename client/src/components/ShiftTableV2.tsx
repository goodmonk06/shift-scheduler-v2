/**
 * シフトテーブルV2 - 改良版
 *
 * 特徴：
 * - 固定列（氏名）
 * - スティッキーヘッダー
 * - 横スクロール対応
 * - 即時保存（ポップオーバー編集）
 * - 複数セル選択・編集対応
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ShiftCell,
  ShiftType,
  EmployeeRowData,
  DaySummary,
  DisplayMode,
  FilterSettings,
  CellSelection,
  PaintMode,
  PopoverState,
  SHIFT_TYPE_MASTER,
  getCellKey,
  getDateRange,
  getDayOfWeek,
  getShortTimeDisplay
} from '../types/shiftV2Types';
import { cn } from './ui/utils';
import {
  AlertCircle,
  Heart,
  Settings,
  Sparkles,
  Edit3,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Copy,
  Paintbrush,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import { useToast } from '../hooks/useToast';
import { ShiftCellEditor } from './ShiftCellEditor';

interface ShiftTableV2Props {
  shiftId: number;
  year: number;
  month: number;
  employees: EmployeeRowData[];
  cells: Map<string, ShiftCell>; // key: 'employeeId-date'
  daySummaries: Map<string, DaySummary>; // key: 'date'
  onCellUpdate: (cell: ShiftCell) => Promise<void>;
  onBatchUpdate: (cells: ShiftCell[]) => Promise<void>;
  isReadOnly?: boolean;
}

export function ShiftTableV2({
  shiftId,
  year,
  month,
  employees,
  cells,
  daySummaries,
  onCellUpdate,
  onBatchUpdate,
  isReadOnly = false
}: ShiftTableV2Props) {
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // UI状態
  const [displayMode, setDisplayMode] = useState<DisplayMode>('code');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    highlightHope: false,
    highlightAI: false,
    highlightShortage: false,
    showOnlyProblems: false,
    showSourceIcons: false,  // デフォルトでホバー時のみ表示
    showLockIcon: false,     // デフォルトでホバー時のみ表示
    showWarningIcon: true,   // 警告は常時表示（重要なため）
  });
  const [cellSelection, setCellSelection] = useState<CellSelection>({
    startCell: null,
    endCell: null,
    selectedCells: new Set()
  });
  const [paintMode, setPaintMode] = useState<PaintMode>({
    active: false,
    shiftType: null,
    overwriteHope: false
  });
  const [popoverState, setPopoverState] = useState<PopoverState>({
    isOpen: false,
    targetCell: null,
    position: { x: 0, y: 0 }
  });

  // 編集中のセル
  const [editingCell, setEditingCell] = useState<ShiftCell | null>(null);

  // 編集ロック（新規作成時と同じ仕様）
  const [editLockEnabled, setEditLockEnabled] = useState(true);

  // 日付リストを生成
  const dates = useMemo(() => getDateRange(year, month), [year, month]);

  // セルのレンダリング
  const renderCell = (employeeId: number, date: string) => {
    const key = getCellKey(employeeId, date);
    const cell = cells.get(key);
    const shiftType = cell?.shiftType;
    const master = shiftType ? SHIFT_TYPE_MASTER[shiftType] : null;

    // フィルタ適用
    if (filterSettings.showOnlyProblems && !cell?.hasWarning) {
      return null;
    }

    // セルのクラス名を生成
    const cellClassName = cn(
      'group relative h-10 border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors',
      {
        // 背景色
        [master?.color || 'bg-white']: true,
        // 希望休の場合
        'bg-red-50 border-red-300': cell?.isHope && cell?.shiftType === 'OFF',
        // 選択中
        'ring-2 ring-blue-500': cellSelection.selectedCells.has(key),
        // ハイライト
        'ring-2 ring-yellow-400': filterSettings.highlightHope && cell?.isHope,
        'ring-2 ring-purple-400': filterSettings.highlightAI && cell?.source === 'AI_AUTO',
        // 読み取り専用
        'cursor-not-allowed opacity-60': isReadOnly,
        // ロック
        'bg-gray-100': cell?.isLocked
      }
    );

    // 表示内容を決定
    let displayContent = '';
    if (shiftType) {
      if (displayMode === 'code') {
        displayContent = master?.code || '';
      } else if (displayMode === 'time') {
        const startTime = cell?.startTime || master?.defaultStartTime;
        const endTime = cell?.endTime || master?.defaultEndTime;
        if (startTime && endTime) {
          displayContent = getShortTimeDisplay(startTime, endTime);
        }
      } else if (displayMode === 'both') {
        displayContent = master?.code || '';
        const startTime = cell?.startTime || master?.defaultStartTime;
        const endTime = cell?.endTime || master?.defaultEndTime;
        if (startTime && endTime) {
          displayContent += ` ${getShortTimeDisplay(startTime, endTime)}`;
        }
      }
    }

    return (
      <td
        key={key}
        className={cellClassName}
        onClick={() => handleCellClick(employeeId, date)}
        onMouseDown={() => handleCellMouseDown(employeeId, date)}
        onMouseEnter={() => handleCellMouseEnter(employeeId, date)}
        onMouseUp={() => handleCellMouseUp()}
        style={{
          backgroundColor: master?.color,
          color: master?.textColor
        }}
      >
        <div className="relative h-full w-full flex items-center justify-center text-sm font-medium">
          {displayContent}

          {/* ソースアイコン */}
          {cell?.source && (
            <div className={cn(
              "absolute bottom-0.5 right-0.5 transition-opacity",
              filterSettings.showSourceIcons ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {cell.source === 'HOPE' && (
                <Heart
                  className={cn(
                    "text-red-500 transition-all",
                    filterSettings.highlightHope
                      ? "w-4 h-4 fill-red-500"
                      : "w-3 h-3"
                  )}
                />
              )}
              {cell.source === 'RULE_AUTO' && <Settings className="w-3 h-3 text-gray-500" />}
              {cell.source === 'AI_AUTO' && <Sparkles className="w-3 h-3 text-purple-500" />}
              {cell.source === 'MANUAL' && <Edit3 className="w-3 h-3 text-blue-500" />}
            </div>
          )}

          {/* 警告アイコン */}
          {cell?.hasWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "absolute top-0.5 right-0.5 transition-opacity",
                  filterSettings.showWarningIcon ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {cell.warningMessage}
              </TooltipContent>
            </Tooltip>
          )}

          {/* ロックアイコン（承認済み希望休/シフト） */}
          {(cell?.isLocked || (cell?.source === 'HOPE' && cell?.isHope)) && (
            <div className={cn(
              "absolute top-0.5 left-0.5 transition-opacity",
              filterSettings.showLockIcon ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <Lock className="w-3 h-3 text-yellow-600" />
            </div>
          )}
        </div>
      </td>
    );
  };

  // セルクリックハンドラー
  const handleCellClick = (employeeId: number, date: string) => {
    if (isReadOnly) return;

    const key = getCellKey(employeeId, date);
    const cell = cells.get(key);

    // 編集ロックが有効で、かつセルがロックされている場合は編集不可（新規作成時と同じ仕様）
    if (editLockEnabled && cell?.isLocked) return;

    // 塗りつぶしモードの場合
    if (paintMode.active && paintMode.shiftType) {
      // 希望休の上書き確認
      if (cell?.isHope && !paintMode.overwriteHope) {
        if (!confirm('希望休を上書きしますか？')) return;
      }

      const master = SHIFT_TYPE_MASTER[paintMode.shiftType];
      const newCell: ShiftCell = {
        employeeId,
        date,
        shiftType: paintMode.shiftType,
        startTime: master.defaultStartTime,
        endTime: master.defaultEndTime,
        isLocked: false,
        isHope: false,
        source: 'MANUAL'
      };

      onCellUpdate(newCell);
      return;
    }

    // ポップオーバー編集を開く
    setEditingCell(cell || {
      employeeId,
      date,
      shiftType: null,
      isLocked: false,
      isHope: false,
      source: 'MANUAL'
    });
    setPopoverState({
      isOpen: true,
      targetCell: { employeeId, date },
      position: { x: 0, y: 0 }
    });
  };

  // セル選択関連のハンドラー
  const handleCellMouseDown = (employeeId: number, date: string) => {
    setCellSelection({
      startCell: { employeeId, date },
      endCell: null,
      selectedCells: new Set([getCellKey(employeeId, date)])
    });
  };

  const handleCellMouseEnter = (employeeId: number, date: string) => {
    if (cellSelection.startCell) {
      // 選択範囲を更新
      const newSelection = calculateSelectionRange(
        cellSelection.startCell,
        { employeeId, date }
      );
      setCellSelection({
        ...cellSelection,
        endCell: { employeeId, date },
        selectedCells: newSelection
      });
    }
  };

  const handleCellMouseUp = () => {
    // 選択完了
    if (cellSelection.selectedCells.size > 1) {
      // 複数セル選択時の処理
    }
  };

  // 選択範囲計算
  const calculateSelectionRange = (
    start: { employeeId: number; date: string },
    end: { employeeId: number; date: string }
  ): Set<string> => {
    const selectedCells = new Set<string>();

    const startEmpIndex = employees.findIndex(e => e.id === start.employeeId);
    const endEmpIndex = employees.findIndex(e => e.id === end.employeeId);
    const startDateIndex = dates.indexOf(start.date);
    const endDateIndex = dates.indexOf(end.date);

    const minEmpIndex = Math.min(startEmpIndex, endEmpIndex);
    const maxEmpIndex = Math.max(startEmpIndex, endEmpIndex);
    const minDateIndex = Math.min(startDateIndex, endDateIndex);
    const maxDateIndex = Math.max(startDateIndex, endDateIndex);

    for (let i = minEmpIndex; i <= maxEmpIndex; i++) {
      for (let j = minDateIndex; j <= maxDateIndex; j++) {
        selectedCells.add(getCellKey(employees[i].id, dates[j]));
      }
    }

    return selectedCells;
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* ツールバー */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-4">
            {/* 表示モード切替 */}
            <div className="flex items-center gap-2">
              <Label>表示:</Label>
              <RadioGroup
                value={displayMode}
                onValueChange={(v) => setDisplayMode(v as DisplayMode)}
                className="flex gap-2"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="code" id="code" />
                  <Label htmlFor="code" className="ml-1 cursor-pointer">コード</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="time" id="time" />
                  <Label htmlFor="time" className="ml-1 cursor-pointer">時間</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="ml-1 cursor-pointer">両方</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* 編集ロック切替（新規作成時と同じ仕様） */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditLockEnabled(!editLockEnabled)}
              className={`${editLockEnabled
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300'
                }`}
            >
              {editLockEnabled ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              {editLockEnabled ? '保護中' : '編集可'}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* フィルタ */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="highlightHope"
                checked={filterSettings.highlightHope}
                onCheckedChange={(checked) =>
                  setFilterSettings({ ...filterSettings, highlightHope: !!checked })
                }
              />
              <Label htmlFor="highlightHope" className="cursor-pointer">
                希望休強調
              </Label>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* アイコン表示設定 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  アイコン表示
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showSourceIcons"
                      checked={filterSettings.showSourceIcons}
                      onCheckedChange={(checked) =>
                        setFilterSettings({ ...filterSettings, showSourceIcons: !!checked })
                      }
                    />
                    <Label htmlFor="showSourceIcons" className="cursor-pointer text-sm">
                      ソース (♡🖋✨⚙️)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showLockIcon"
                      checked={filterSettings.showLockIcon}
                      onCheckedChange={(checked) =>
                        setFilterSettings({ ...filterSettings, showLockIcon: !!checked })
                      }
                    />
                    <Label htmlFor="showLockIcon" className="cursor-pointer text-sm">
                      ロック (🔒)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showWarningIcon"
                      checked={filterSettings.showWarningIcon}
                      onCheckedChange={(checked) =>
                        setFilterSettings({ ...filterSettings, showWarningIcon: !!checked })
                      }
                    />
                    <Label htmlFor="showWarningIcon" className="cursor-pointer text-sm">
                      警告 (⚠️)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    オフの場合、ホバー時のみ表示されます
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* 塗りつぶしモード */}
            <Button
              variant={paintMode.active ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaintMode({ ...paintMode, active: !paintMode.active })}
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              塗りつぶし
            </Button>
          </div>

          {/* 生成ボタン（追加） */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              ルールベース生成
            </Button>
            <Button variant="outline" size="sm">
              AI生成
            </Button>
          </div>
        </div>

        {/* シフトパレット（塗りつぶしモード時） */}
        {paintMode.active && (
          <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
            <Label>シフト選択:</Label>
            <div className="flex gap-1">
              {Object.values(SHIFT_TYPE_MASTER)
                .filter(m => m.category === 'fixed')
                .map(master => (
                  <Button
                    key={master.type}
                    variant={paintMode.shiftType === master.type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaintMode({ ...paintMode, shiftType: master.type })}
                    style={{
                      backgroundColor: paintMode.shiftType === master.type ? master.color : undefined,
                      color: paintMode.shiftType === master.type ? master.textColor : undefined
                    }}
                  >
                    {master.code}
                  </Button>
                ))}
              <Separator orientation="vertical" className="mx-1" />
              {Object.values(SHIFT_TYPE_MASTER)
                .filter(m => m.category === 'leave')
                .map(master => (
                  <Button
                    key={master.type}
                    variant={paintMode.shiftType === master.type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaintMode({ ...paintMode, shiftType: master.type })}
                  >
                    {master.code}
                  </Button>
                ))}
            </div>
            <Checkbox
              id="overwriteHope"
              checked={paintMode.overwriteHope}
              onCheckedChange={(checked) =>
                setPaintMode({ ...paintMode, overwriteHope: !!checked })
              }
            />
            <Label htmlFor="overwriteHope" className="cursor-pointer">
              希望休を上書き
            </Label>
          </div>
        )}

        {/* テーブル本体 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto" ref={scrollContainerRef}>
            <table className="w-full border-collapse">
              {/* ヘッダー */}
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th className="sticky left-0 z-30 w-32 bg-white border border-gray-300 p-2">
                    氏名
                  </th>
                  {dates.map(date => (
                    <th key={date} className="border border-gray-300 p-1 min-w-[50px]">
                      <div className="text-xs">
                        <div>{parseInt(date.split('-')[2])}</div>
                        <div className={cn(
                          getDayOfWeek(date) === '土' && 'text-blue-600',
                          getDayOfWeek(date) === '日' && 'text-red-600'
                        )}>
                          {getDayOfWeek(date)}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
                {/* 行事予定行 */}
                <tr>
                  <th className="sticky left-0 z-30 bg-gray-50 border border-gray-300 p-1 text-xs">
                    行事予定
                  </th>
                  {dates.map(date => {
                    const summary = daySummaries.get(date);
                    return (
                      <td key={date} className="border border-gray-300 p-1 text-xs bg-gray-50">
                        {summary?.events?.join(', ')}
                      </td>
                    );
                  })}
                </tr>
              </thead>

              {/* ボディ */}
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id}>
                    <td className="sticky left-0 z-10 bg-white border border-gray-300 p-2 font-medium">
                      {employee.name}
                    </td>
                    {dates.map(date => renderCell(employee.id, date))}
                  </tr>
                ))}
              </tbody>

              {/* フッター（日中人数・不足表示） */}
              <tfoot className="sticky bottom-0 z-20 bg-white">
                <tr>
                  <td className="sticky left-0 z-30 bg-gray-100 border border-gray-300 p-1 text-sm font-medium">
                    日中の人数
                  </td>
                  {dates.map(date => {
                    const summary = daySummaries.get(date);
                    return (
                      <td key={date} className="border border-gray-300 p-1 text-center bg-gray-100">
                        <div className="text-sm font-medium">{summary?.daytimeCount || 0}</div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 z-30 bg-gray-100 border border-gray-300 p-1 text-sm font-medium">
                    不足人数
                  </td>
                  {dates.map(date => {
                    const summary = daySummaries.get(date);
                    return (
                      <td key={date} className="border border-gray-300 p-1 bg-gray-100">
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {summary?.shortageByBand?.map((shortage) => (
                            <Badge
                              key={shortage.band}
                              variant={shortage.diff < 0 ? 'destructive' : shortage.diff > 0 ? 'secondary' : 'default'}
                              className="text-xs px-1 py-0"
                            >
                              {shortage.diff !== 0 && (shortage.diff > 0 ? '+' : '')}{shortage.diff}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* セル編集ポップオーバー */}
      {editingCell && (
        <ShiftCellEditor
          cell={editingCell}
          employeeName={employees.find(e => e.id === editingCell.employeeId)?.name || ''}
          isOpen={popoverState.isOpen}
          onOpenChange={(open) => {
            setPopoverState({ ...popoverState, isOpen: open });
            if (!open) {
              setEditingCell(null);
            }
          }}
          onSave={async (updatedCell) => {
            await onCellUpdate(updatedCell);
            setPopoverState({ isOpen: false, targetCell: null, position: { x: 0, y: 0 } });
            setEditingCell(null);
          }}
        >
          {popoverState.targetCell && (
            <div
              style={{
                position: 'fixed',
                left: popoverState.position.x,
                top: popoverState.position.y,
                width: 1,
                height: 1,
                pointerEvents: 'none'
              }}
            />
          )}
        </ShiftCellEditor>
      )}
    </TooltipProvider>
  );
}