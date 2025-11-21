import React from 'react';
import { Lock } from 'lucide-react';
import { ShiftCell as ShiftCellType } from '../utils/shiftLogic';

interface ShiftCellProps {
  cellData: ShiftCellType | null;
  isLocked: boolean;
  editLockEnabled: boolean;
  isHoveredRow: boolean;
  isHoveredCol: boolean;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  cellData,
  isLocked,
  editLockEnabled,
  isHoveredRow,
  isHoveredCol,
  onClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave
}) => {
  const isLockedAndActive = isLocked && editLockEnabled;
  const lockPatternClass = isLockedAndActive
    ? 'bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_5px,#f1f5f9_5px,#f1f5f9_10px)]'
    : '';
  const highlightClass = (isHoveredRow || isHoveredCol) ? 'bg-slate-50' : '';

  const styles: React.CSSProperties = {};

  if (cellData) {
    if (cellData.customText === '休' || cellData.customText === '休職') {
      styles.color = '#b91c1c';
      styles.backgroundColor = isLockedAndActive ? '#fef2f2' : '#fff1f2';
    }
    else if (cellData.customText === '有' || cellData.customText === '有給') {
      styles.color = '#c2410c';
      styles.backgroundColor = isLockedAndActive ? '#ffedd5' : '#fff7ed';
    }
    else if (cellData.customText === '夜') {
      styles.color = '#ffffff';
      styles.backgroundColor = isLockedAndActive ? '#1e3a8a' : '#1e3a8a';
      styles.fontWeight = 'bold';
    }
    else if (cellData.customText === '明') {
      styles.color = '#1f2937';
      styles.backgroundColor = isLockedAndActive ? '#bae6fd' : '#e0f2fe';
    }
    else if (cellData.customText === '早') {
      styles.color = '#1f2937';
      styles.backgroundColor = isLockedAndActive ? '#bae6fd' : '#e0f2fe';
    }
    else if (cellData.customText === '遅' || cellData.customText.startsWith('11')) {
      styles.color = '#1f2937';
      styles.backgroundColor = isLockedAndActive ? '#86efac' : '#dcfce7';
    }
    else if (cellData.customText === '冬') {
      styles.color = '#1e40af';
      styles.backgroundColor = isLockedAndActive ? '#bfdbfe' : '#dbeafe';
    }
    else if (cellData.customText === '日A') {
      styles.color = '#1f2937';
      styles.backgroundColor = isLockedAndActive ? '#fce7f3' : '#fce7f3';
    }
    else if (cellData.customText === '日B') {
      styles.color = '#1f2937';
      styles.backgroundColor = isLockedAndActive ? '#e0f2fe' : '#e0f2fe';
    }
  }

  if (!styles.backgroundColor && (isHoveredRow || isHoveredCol)) {
    styles.backgroundColor = '#f8fafc';
  }

  const isNightPrint = cellData?.customText === '夜';

  return (
    <td
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        border border-slate-600 p-0 overflow-hidden relative
        ${isLockedAndActive ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:z-10 hover:shadow-lg'}
        ${isLockedAndActive && !styles.backgroundColor ? lockPatternClass : ''}
        print:cursor-default print:ring-0
      `}
      style={styles}
      title={isLockedAndActive ? "固定シフト (編集不可)" : "右クリックでクイック選択"}
    >
      {isLockedAndActive && (
        <div className="absolute top-0.5 right-0.5 text-slate-500 print:hidden opacity-70">
          <Lock size={8} strokeWidth={3} />
        </div>
      )}

      <div className={`w-full h-full flex items-center justify-center ${isNightPrint ? 'print:font-extrabold text-base' : ''}`}>
        <span className={`transform inline-block whitespace-nowrap ${cellData && cellData.customText.length > 4 ? 'scale-75' : cellData && cellData.customText.length > 2 ? 'scale-90' : 'scale-100'
          }`}>
          {cellData?.customText || ''}
        </span>
      </div>
    </td>
  );
};
