import React from 'react';
import { X, Clock } from 'lucide-react';
import { SHIFT_PRESETS, TIME_PRESETS } from '../utils/constants';
import { ShiftCell } from '../utils/shiftLogic';

interface PopoverProps {
  targetRect: DOMRect;
  date: Date;
  staffName: string;
  currentValue: ShiftCell;
  onSave: (newVal: Partial<ShiftCell>) => void;
  onClose: () => void;
}

export const Popover: React.FC<PopoverProps> = ({
  targetRect,
  date,
  staffName,
  currentValue,
  onSave,
  onClose
}) => {
  return (
    <div
      className="shift-popover absolute z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-72 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-slate-900/5"
      style={{
        top: targetRect.bottom + window.scrollY + 8,
        left: Math.min(targetRect.left + window.scrollX - 20, document.body.scrollWidth - 300),
      }}
    >
      <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded-md">
            <Clock size={16} className="text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm leading-tight">
              {date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <span className="text-xs text-slate-500">{staffName}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 block">基本シフト</label>
          <div className="grid grid-cols-4 gap-2">
            {SHIFT_PRESETS.map(p => (
              <button
                key={p.text}
                onClick={() => onSave({ type: p.type, customText: p.text })}
                className={`text-xs py-2 rounded-lg font-bold transition-all border ${currentValue.customText === p.text
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 block">時間指定</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_PRESETS.map(t => (
              <button
                key={t}
                onClick={() => onSave({ type: 'DAY', customText: t })}
                className={`text-[10px] py-1.5 rounded-md font-medium transition-all border ${currentValue.customText === t
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 block">カスタム入力</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                placeholder="入力..."
                defaultValue={currentValue.customText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave({ type: 'DAY', customText: (e.target as HTMLInputElement).value });
                }}
              />
            </div>
            <button
              onClick={() => onSave({ type: 'OFF', customText: '' })}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
