import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onApplyShift: (type: string, text: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onApplyShift }) => {
  const menuItems = [
    { label: '日 (通常)', type: 'DAY', text: '日' },
    { label: '休 (公休)', type: 'OFF', text: '休' },
    { label: '夜 (夜勤)', type: 'NIGHT', text: '夜' },
    { label: '明 (明け)', type: 'EARLY', text: '明' },
    { label: '日A (8-17)', type: 'DAY', text: '日A' },
    { label: '日B (9-18)', type: 'DAY', text: '日B' },
    { label: '有 (有給)', type: 'HOPE', text: '有' },
    { label: '早 (早番)', type: 'EARLY', text: '早' },
  ];

  return (
    <div
      className="context-menu fixed z-50 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-32 animate-in fade-in zoom-in-95 duration-75"
      style={{ top: y, left: x }}
    >
      <div className="text-xs font-bold text-slate-400 px-3 py-1 border-b border-slate-100 mb-1">
        クイック選択
      </div>
      {menuItems.map((item) => (
        <button
          key={item.text}
          onClick={() => onApplyShift(item.type, item.text)}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-2"
        >
          <span className={`w-2 h-2 rounded-full ${item.text === '休' ? 'bg-red-400' :
              item.text === '夜' ? 'bg-yellow-400' :
              item.text === '日A' ? 'bg-pink-300' :
              item.text === '日B' ? 'bg-sky-300' :
              'bg-slate-300'
            }`}></span>
          {item.label}
        </button>
      ))}
      <div className="border-t border-slate-100 my-1"></div>
      <button
        onClick={() => onApplyShift('OFF', '')}
        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-bold"
      >
        クリア
      </button>
    </div>
  );
};
