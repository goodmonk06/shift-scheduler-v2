import React from 'react';
import { Calendar, Printer, Settings, RefreshCw, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react';
import { FACILITY_NAME } from '../utils/constants';

interface HeaderProps {
  zoom: number;
  editLockEnabled: boolean;
  printPreview: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleEditLock: () => void;
  onTogglePrintPreview: () => void;
  onGenerate: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  zoom,
  editLockEnabled,
  printPreview,
  onZoomIn,
  onZoomOut,
  onToggleEditLock,
  onTogglePrintPreview,
  onGenerate,
  onPrint
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-30 print:hidden shadow-lg flex-none">
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/10">
          <Calendar size={22} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            シフト管理 <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono border border-slate-700">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
            <span>2025年12月度</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>{FACILITY_NAME}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 mr-2">
          <button onClick={onZoomOut} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"><ZoomOut size={14} /></button>
          <span className="px-2 text-xs font-mono w-12 text-center font-bold text-slate-300">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"><ZoomIn size={14} /></button>
        </div>

        <div className="h-8 w-px bg-slate-800 mx-1"></div>

        <button
          onClick={onToggleEditLock}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${editLockEnabled
              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              : 'bg-rose-900/30 text-rose-400 border-rose-900/50 hover:bg-rose-900/50 animate-pulse'
            }`}
        >
          {editLockEnabled ? <Lock size={14} /> : <Unlock size={14} />}
          {editLockEnabled ? '保護中' : '編集可'}
        </button>

        <button
          onClick={onTogglePrintPreview}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${printPreview
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
        >
          <RefreshCw size={14} className={printPreview ? "" : ""} />
          {printPreview ? '編集に戻る' : 'プレビュー'}
        </button>

        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-5 py-2 bg-white text-indigo-900 rounded-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl text-xs font-extrabold border border-transparent hover:border-indigo-200"
        >
          <Settings size={14} className="animate-spin-slow text-indigo-600" />
          AI自動生成
        </button>

        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/30 text-xs font-bold border border-indigo-500"
        >
          <Printer size={14} />
          PDF出力
        </button>
      </div>
    </header>
  );
};
