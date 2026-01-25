// シフト入力ポップオーバー共通コンポーネント
import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import type { ShiftInputPopoverProps, CustomTimeSlot, ShiftPreset } from './ShiftPopoverTypes';
import { formatTimeDisplay, saveCustomTimes, calculatePopoverPosition } from './shiftPopoverUtils';

// デフォルトのシフトプリセット
export const DEFAULT_SHIFT_PRESETS: ShiftPreset[] = [
  { text: '日A', type: 'DAY' },
  { text: '日B', type: 'DAY' },
  { text: '休', type: 'OFF' },
  { text: '夜', type: 'NIGHT' },
  { text: '早', type: 'EARLY' },
  { text: '遅', type: 'LATE' },
  { text: '有', type: 'HOPE' },
  { text: 'free', type: 'FREE' },
];

export function ShiftInputPopover({
  popoverState,
  onClose,
  onSaveShift,
  shiftPresets = DEFAULT_SHIFT_PRESETS,
  customTimesMap,
  onUpdateCustomTimes,
  loadedShiftId,
  toast,
}: ShiftInputPopoverProps) {
  // タブ状態
  const [customInputTab, setCustomInputTab] = useState<'time' | 'free'>('time');

  // タイムピッカー状態
  const [pickerStartHour, setPickerStartHour] = useState('09');
  const [pickerStartMinute, setPickerStartMinute] = useState('00');
  const [pickerEndHour, setPickerEndHour] = useState('18');
  const [pickerEndMinute, setPickerEndMinute] = useState('00');
  const [pickerBreakMinutes, setPickerBreakMinutes] = useState<0 | 30 | 60>(0);

  // 職員の休憩ルールに基づいて休憩時間を計算
  const calculateStaffBreakTime = (workHours: number): number => {
    const rule = popoverState.staffBreakTimeRule;

    if (rule === undefined || rule === null) {
      // デフォルトルール: 6時間超なら1時間
      return workHours > 6 ? 1 : 0;
    }

    if (typeof rule === 'number') {
      // 固定時間
      return rule;
    }

    if (typeof rule === 'object') {
      const threshold = rule.threshold ?? 6;
      const duration = rule.duration ?? 1;
      return workHours > threshold ? duration : 0;
    }

    return workHours > 6 ? 1 : 0;
  };

  // 現在のセルの値を表示用に解析する関数
  const parseCurrentValue = (customText: string | undefined, staffTimes: CustomTimeSlot[]): {
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    breakMinutes: 0 | 30 | 60;
    isTimeFormat: boolean;
  } => {
    // デフォルト値
    const defaults = {
      startHour: '09',
      startMinute: '00',
      endHour: '18',
      endMinute: '00',
      breakMinutes: 0 as 0 | 30 | 60,
      isTimeFormat: false
    };

    if (!customText) return defaults;

    // 1. まずカスタム時間枠のリストから完全一致を探す（休憩時間情報を取得するため）
    const matchedSlot = staffTimes.find(slot => slot.displayText === customText);
    if (matchedSlot) {
      const [startH, startM] = matchedSlot.startTime.split(':');
      const [endH, endM] = matchedSlot.endTime.split(':');
      return {
        startHour: startH,
        startMinute: startM,
        endHour: endH,
        endMinute: endM,
        breakMinutes: matchedSlot.breakMinutes,
        isTimeFormat: true
      };
    }

    // 2. HH:MM～HH:MM 形式（例: 09:00～18:00）
    const fullTimeMatch = customText.match(/(\d+):(\d+)～(\d+):(\d+)/);
    if (fullTimeMatch) {
      return {
        startHour: fullTimeMatch[1].padStart(2, '0'),
        startMinute: fullTimeMatch[2],
        endHour: fullTimeMatch[3].padStart(2, '0'),
        endMinute: fullTimeMatch[4],
        breakMinutes: 0,
        isTimeFormat: true
      };
    }

    // 3. N～M や N半～M半 形式（例: 8～14, 8半～13半, 9～15）
    const simpleMatch = customText.match(/(\d+)(半)?～(\d+)(半)?/);
    if (simpleMatch) {
      const startH = simpleMatch[1].padStart(2, '0');
      const startM = simpleMatch[2] === '半' ? '30' : '00';
      const endH = simpleMatch[3].padStart(2, '0');
      const endM = simpleMatch[4] === '半' ? '30' : '00';
      return {
        startHour: startH,
        startMinute: startM,
        endHour: endH,
        endMinute: endM,
        breakMinutes: 0,
        isTimeFormat: true
      };
    }

    // 4. 基本シフト（日、日A、早、遅など）の場合はデフォルト時間を設定
    if (customText === '日' || customText === '日A' || customText === '日B') {
      return { ...defaults, startHour: '09', endHour: '18', isTimeFormat: false };
    }
    if (customText === '早') {
      return { ...defaults, startHour: '07', endHour: '16', isTimeFormat: false };
    }
    if (customText === '遅') {
      return { ...defaults, startHour: '11', endHour: '20', isTimeFormat: false };
    }

    return defaults;
  };

  // ポップオーバーが開いたときに、現在の値をピッカーに反映
  useEffect(() => {
    if (popoverState.isOpen) {
      const currentStaffTimes = customTimesMap[popoverState.staffId || ''] || [];
      const currentText = popoverState.currentValue?.customText;
      const parsed = parseCurrentValue(currentText, currentStaffTimes);

      setPickerStartHour(parsed.startHour);
      setPickerStartMinute(parsed.startMinute);
      setPickerEndHour(parsed.endHour);
      setPickerEndMinute(parsed.endMinute);
      setPickerBreakMinutes(parsed.breakMinutes);
      setCustomInputTab('time');
    }
  }, [popoverState.isOpen, popoverState.staffId, popoverState.currentValue?.customText, customTimesMap]);

  // 表示判定
  if (!popoverState.isOpen || !popoverState.targetRect || !popoverState.date) {
    return null;
  }

  const POPOVER_HEIGHT = 500;
  const POPOVER_WIDTH = 320;

  const position = calculatePopoverPosition(
    popoverState.targetRect,
    POPOVER_HEIGHT,
    POPOVER_WIDTH
  );

  const currentStaffTimes = customTimesMap[popoverState.staffId || ''] || [];

  // シフト変更を保存してポップオーバーを閉じる
  const handleSaveShift = (value: { type: string; customText: string }) => {
    onSaveShift(value);
    onClose();
  };

  // カスタム時間枠を追加
  const handleAddCustomTime = () => {
    if (!popoverState.staffId) return;

    const startTime = `${pickerStartHour}:${pickerStartMinute}`;
    const endTime = `${pickerEndHour}:${pickerEndMinute}`;
    const displayText = formatTimeDisplay(startTime, endTime, pickerBreakMinutes);

    const newSlot: CustomTimeSlot = {
      displayText,
      startTime,
      endTime,
      breakMinutes: pickerBreakMinutes
    };

    const newTimes = [...currentStaffTimes, newSlot];
    saveCustomTimes(loadedShiftId || undefined, popoverState.staffId, newTimes);
    onUpdateCustomTimes(popoverState.staffId, newTimes);

    // 同時にセルに入力
    handleSaveShift({ type: 'DAY', customText: displayText });
    toast.success('時間枠を追加して入力しました');
  };

  // カスタム時間枠を削除
  const handleDeleteCustomTime = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!popoverState.staffId) return;

    const newTimes = currentStaffTimes.filter((_, i) => i !== idx);
    saveCustomTimes(loadedShiftId || undefined, popoverState.staffId, newTimes);
    onUpdateCustomTimes(popoverState.staffId, newTimes);
    toast.success('時間枠を削除しました');
  };

  return (
    <div
      className="shift-popover absolute z-50 bg-white border-2 border-indigo-300 shadow-2xl rounded-xl p-5 w-80 animate-in fade-in zoom-in-95 duration-150 ring-4 ring-indigo-100"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-3 border-b-2 border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Clock size={18} className="text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-base leading-tight">
              {popoverState.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <span className="text-sm text-slate-600 font-medium">{popoverState.staffName}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* 現在の値表示 */}
      {popoverState.currentValue?.customText && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">現在の設定</div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-indigo-600">{popoverState.currentValue.customText}</span>
            {(() => {
              const parsed = parseCurrentValue(popoverState.currentValue.customText, currentStaffTimes);
              if (parsed.isTimeFormat) {
                const startTime = `${parsed.startHour}:${parsed.startMinute}`;
                const endTime = `${parsed.endHour}:${parsed.endMinute}`;

                // 勤務時間を計算
                const startHours = parseInt(parsed.startHour) + parseInt(parsed.startMinute) / 60;
                const endHours = parseInt(parsed.endHour) + parseInt(parsed.endMinute) / 60;
                const grossHours = endHours - startHours;

                // 職員ルールに基づく休憩時間を計算
                const breakHours = calculateStaffBreakTime(grossHours);
                const netHours = grossHours - breakHours;

                const breakText = breakHours === 0 ? '休憩なし' : `休憩${breakHours * 60}分`;

                return (
                  <div className="text-right">
                    <div className="text-sm text-slate-600">{startTime}～{endTime}</div>
                    <div className="text-xs text-slate-400">{breakText}</div>
                    <div className="text-xs font-bold text-indigo-500">正味 {netHours}時間</div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* 基本シフトプリセット */}
        <div>
          <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">基本シフト</label>
          <div className="grid grid-cols-4 gap-2">
            {shiftPresets.map(p => (
              <button
                key={p.text}
                onClick={() => handleSaveShift({ type: p.type, customText: p.text })}
                className={`text-sm py-2.5 rounded-lg font-bold transition-all border-2 ${popoverState.currentValue?.customText === p.text
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                  : p.text === '休'
                    ? 'bg-white border-slate-300 text-red-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* 時間指定（職員専用） */}
        <div className="relative">
          <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">時間指定（この職員専用）</label>
          {currentStaffTimes.length === 0 ? (
            <div className="text-sm text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
              カスタム入力で時間を追加してください
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-3">
              {currentStaffTimes.map((slot, idx) => {
                const isSelected = popoverState.currentValue?.customText === slot.displayText;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSaveShift({ type: 'DAY', customText: slot.displayText })}
                    style={
                      isSelected
                        ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#ffffff' }
                        : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#334155' }
                    }
                    className="text-xs py-2 px-1 rounded-lg font-bold transition-all border-2 whitespace-nowrap relative group hover:border-indigo-400"
                  >
                    <span className="block">{slot.displayText}</span>
                    <span
                      onClick={(e) => handleDeleteCustomTime(idx, e)}
                      style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* カスタム入力（タブ切り替え） */}
        <div>
          <label className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-2.5 block">カスタム入力</label>

          {/* タブ */}
          <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setCustomInputTab('time')}
              style={
                customInputTab === 'time'
                  ? { backgroundColor: '#ffffff', color: '#4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { backgroundColor: 'transparent', color: '#64748b' }
              }
              className="flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all"
            >
              時間指定
            </button>
            <button
              onClick={() => setCustomInputTab('free')}
              style={
                customInputTab === 'free'
                  ? { backgroundColor: '#ffffff', color: '#4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { backgroundColor: 'transparent', color: '#64748b' }
              }
              className="flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all"
            >
              フリー入力
            </button>
          </div>

          {/* 時間指定モード */}
          {customInputTab === 'time' && (
            <div className="space-y-3">
              {/* タイムピッカー */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold mb-1 block">開始時刻</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={pickerStartHour}
                      onChange={(e) => setPickerStartHour(e.target.value)}
                      className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(h => (
                        <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="font-bold">:</span>
                    <select
                      value={pickerStartMinute}
                      onChange={(e) => setPickerStartMinute(e.target.value)}
                      className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold mb-1 block">終了時刻</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={pickerEndHour}
                      onChange={(e) => setPickerEndHour(e.target.value)}
                      className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(h => (
                        <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="font-bold">:</span>
                    <select
                      value={pickerEndMinute}
                      onChange={(e) => setPickerEndMinute(e.target.value)}
                      className="border-2 border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 休憩時間選択 */}
              <div>
                <label className="text-xs text-slate-600 font-semibold mb-1 block">休憩時間</label>
                <div className="flex gap-2">
                  {[0, 30, 60].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => setPickerBreakMinutes(minutes as 0 | 30 | 60)}
                      style={
                        pickerBreakMinutes === minutes
                          ? { backgroundColor: '#6366f1', color: '#ffffff', borderColor: '#6366f1' }
                          : { backgroundColor: '#ffffff', color: '#334155', borderColor: '#cbd5e1' }
                      }
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all border-2 hover:border-indigo-400"
                    >
                      {minutes === 0 ? '無し' : minutes === 30 ? '30分' : '1時間'}
                    </button>
                  ))}
                </div>
              </div>

              {/* プレビュー */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-2 text-center">
                <span className="text-xs text-slate-500 font-semibold">プレビュー: </span>
                <span className="text-sm font-bold text-slate-800">
                  {formatTimeDisplay(`${pickerStartHour}:${pickerStartMinute}`, `${pickerEndHour}:${pickerEndMinute}`, pickerBreakMinutes)}
                </span>
              </div>

              {/* 追加ボタン */}
              <button
                onClick={handleAddCustomTime}
                style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
                className="w-full py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md"
              >
                この時間を追加して入力
              </button>

              {/* クリアボタン */}
              <div className="flex justify-center">
                <button
                  onClick={() => handleSaveShift({ type: 'OFF', customText: '' })}
                  style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                  className="px-6 py-2 border-2 rounded-lg text-sm font-bold hover:opacity-80 transition-all"
                >
                  クリア
                </button>
              </div>
            </div>
          )}

          {/* フリー入力モード */}
          {customInputTab === 'free' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="custom-shift-input"
                    type="text"
                    className="w-full border-2 border-slate-300 rounded-lg pl-3 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    placeholder="入力..."
                    defaultValue={popoverState.currentValue?.customText || ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveShift({ type: 'DAY', customText: (e.target as HTMLInputElement).value });
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const input = document.getElementById('custom-shift-input') as HTMLInputElement;
                    if (input && input.value) {
                      handleSaveShift({ type: 'DAY', customText: input.value });
                    }
                  }}
                  className="px-4 py-2.5 border-2 border-indigo-500 bg-indigo-50 rounded-lg text-sm font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-600 transition-all"
                >
                  保存
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleSaveShift({ type: 'OFF', customText: '' })}
                  style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                  className="px-6 py-2 border-2 rounded-lg text-sm font-bold hover:opacity-80 transition-all"
                >
                  クリア
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShiftInputPopover;
