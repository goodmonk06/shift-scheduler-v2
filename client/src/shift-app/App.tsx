import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './components/Header';
import { Legend } from './components/Legend';
import { ContextMenu } from './components/ContextMenu';
import { Popover } from './components/Popover';
import { ShiftTable } from './components/ShiftTable';
import { useShiftData } from './hooks/useShiftData';
import { generateDateRange, getIsoDate } from './utils/dateHelpers';
import { START_DATE, END_DATE, STAFF_RAW_DATA, FACILITY_NAME } from './utils/constants';
import { Staff, ShiftCell } from './utils/shiftLogic';

export const ShiftApp: React.FC = () => {
  const [dates] = useState(generateDateRange(START_DATE, END_DATE));
  const [staffList] = useState<Staff[]>(STAFF_RAW_DATA);
  const [printPreview, setPrintPreview] = useState(false);
  const [editLockEnabled, setEditLockEnabled] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; staffId: string; date: Date } | null>(null);
  const [popoverState, setPopoverState] = useState<{
    isOpen: boolean;
    staffId: string | null;
    date: Date | null;
    staffName: string;
    targetRect: DOMRect | null;
    currentValue: ShiftCell | null;
  }>({
    isOpen: false,
    staffId: null,
    date: null,
    staffName: '',
    targetRect: null,
    currentValue: null
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    shifts,
    setShifts,
    staffStats,
    sufficiencyData,
    isGenerating,
    progress,
    loadingStage,
    startGeneration
  } = useShiftData(dates, staffList);

  // 印刷ハンドラー
  const handlePrint = () => {
    window.print();
  };

  // ズーム操作
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  // セルクリックハンドラー
  const handleCellClick = (e: React.MouseEvent, staff: Staff, date: Date) => {
    const key = `${staff.id}_${getIsoDate(date)}`;
    const currentVal = shifts[key] || { type: 'OFF', customText: '', isLocked: false };
    if (editLockEnabled && currentVal.isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverState({
      isOpen: true,
      staffId: staff.id,
      date: date,
      staffName: staff.name,
      targetRect: rect,
      currentValue: currentVal
    });
    setContextMenu(null);
  };

  // 右クリックハンドラー
  const handleContextMenu = (e: React.MouseEvent, staff: Staff, date: Date) => {
    e.preventDefault();
    const key = `${staff.id}_${getIsoDate(date)}`;
    const currentVal = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

    if (editLockEnabled && currentVal.isLocked) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      staffId: staff.id,
      date: date
    });
    setPopoverState(prev => ({ ...prev, isOpen: false }));
  };

  // クイックシフト適用
  const applyQuickShift = (type: string, customText: string) => {
    if (!contextMenu) return;
    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;
    setShifts(prev => ({
      ...prev,
      [key]: { ...prev[key], type, customText, isLocked: false } as ShiftCell
    }));
    setContextMenu(null);
  };

  // シフト変更を保存
  const saveShiftChange = (newVal: Partial<ShiftCell>) => {
    if (!popoverState.staffId || !popoverState.date) return;
    const key = `${popoverState.staffId}_${getIsoDate(popoverState.date)}`;
    setShifts(prev => ({ ...prev, [key]: { ...prev[key], ...newVal } as ShiftCell }));
    setPopoverState(prev => ({ ...prev, isOpen: false }));
  };

  // 外側クリックでメニュー・ポップオーバーを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverState.isOpen && !(event.target as HTMLElement).closest('.shift-popover') && !(event.target as HTMLElement).closest('td')) {
        setPopoverState(prev => ({ ...prev, isOpen: false }));
      }
      if (contextMenu && !(event.target as HTMLElement).closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverState.isOpen, contextMenu]);

  return (
    <div className={`min-h-screen bg-slate-100 font-sans text-sm ${printPreview ? 'print-preview-mode' : ''} flex flex-col h-screen overflow-hidden`}>

      {/* 生成中ローディング画面 */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl text-center border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">AI シフト生成中</h2>
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
              <Settings className="animate-spin text-indigo-600 relative z-10" size={56} />
            </div>
            <p className="text-slate-600 mb-6 font-medium text-lg">{loadingStage}</p>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono mt-2">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 右クリックメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onApplyShift={applyQuickShift}
        />
      )}

      {/* ポップオーバー */}
      {popoverState.isOpen && popoverState.targetRect && popoverState.date && popoverState.currentValue && (
        <Popover
          targetRect={popoverState.targetRect}
          date={popoverState.date}
          staffName={popoverState.staffName}
          currentValue={popoverState.currentValue}
          onSave={saveShiftChange}
          onClose={() => setPopoverState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* ヘッダー */}
      <Header
        zoom={zoom}
        editLockEnabled={editLockEnabled}
        printPreview={printPreview}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleEditLock={() => setEditLockEnabled(!editLockEnabled)}
        onTogglePrintPreview={() => setPrintPreview(!printPreview)}
        onGenerate={startGeneration}
        onPrint={handlePrint}
      />

      {/* メインコンテンツ */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-slate-100 relative"
      >
        <div style={!printPreview ? { zoom: zoom, width: 'fit-content' } : { width: '100%' }} className="bg-white p-10 shadow-2xl shadow-slate-300/50 print:shadow-none print:p-0 mx-auto rounded-xl border border-slate-300 print:border-none mt-8 mb-8">

          {/* 凡例 */}
          <Legend />

          {/* タイトル */}
          <div className="mb-6 border-b-2 border-slate-800 pb-4 print:mb-2">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-widest mb-2">
                  {START_DATE.getFullYear()}年{START_DATE.getMonth() + 1}月　{FACILITY_NAME}　勤務表
                </h1>
                <p className="text-xs text-slate-500 font-medium ml-1">SHIFT SCHEDULE TABLE</p>
              </div>
              <div className="text-xs text-right">
                <table className="border-collapse border border-slate-400 inline-table mr-4 shadow-sm bg-white">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 px-4 py-1.5 bg-slate-100 font-bold text-slate-600">作成日</td>
                      <td className="border border-slate-400 px-4 py-1.5 font-mono text-slate-700">{new Date().toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 text-slate-400 font-mono text-[10px]">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* シフトテーブル */}
          <ShiftTable
            dates={dates}
            staffList={staffList}
            shifts={shifts}
            staffStats={staffStats}
            sufficiencyData={sufficiencyData}
            editLockEnabled={editLockEnabled}
            onCellClick={handleCellClick}
            onContextMenu={handleContextMenu}
          />
        </div>
      </main>

      {/* スタイル */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white !important;
            font-size: 9pt;
            width: 100%;
            height: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }

          table, th, td {
            border: 1px solid #000 !important;
            border-collapse: collapse !important;
          }

          main {
            margin: 0;
            padding: 0;
            width: 100%;
            background: white !important;
            overflow: visible !important;
          }
          thead tr th, tbody tr td {
            position: static !important;
          }
        }

        .print-preview-mode header {
          display: flex;
        }
        .print-preview-mode main {
          max-width: 297mm;
          margin: 0 auto;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
};

export default ShiftApp;
