import React, { useState } from 'react';
import { ShiftCell } from './ShiftCell';
import { Staff, ShiftCell as ShiftCellType, WorkStats, SufficiencyResult } from '../utils/shiftLogic';
import { getIsoDate, getDayStyle, getEventName, getSurname } from '../utils/dateHelpers';
import { START_DATE } from '../utils/constants';

interface ShiftTableProps {
  dates: Date[];
  staffList: Staff[];
  shifts: Record<string, ShiftCellType | null>;
  staffStats: Record<string, WorkStats>;
  sufficiencyData: Record<string, SufficiencyResult>;
  editLockEnabled: boolean;
  onCellClick: (e: React.MouseEvent, staff: Staff, date: Date) => void;
  onContextMenu: (e: React.MouseEvent, staff: Staff, date: Date) => void;
}

export const ShiftTable: React.FC<ShiftTableProps> = ({
  dates,
  staffList,
  shifts,
  staffStats,
  sufficiencyData,
  editLockEnabled,
  onCellClick,
  onContextMenu
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ staffId: string | null; dateStr: string | null }>({
    staffId: null,
    dateStr: null
  });

  const eventRowHeight = 60;

  return (
    <div className="overflow-visible">
      <table className="w-full text-center border-collapse border border-slate-900 text-[10px] font-serif leading-tight relative">
        <thead>
          <tr className="bg-slate-50 print:bg-transparent" style={{ height: `${eventRowHeight}px` }}>
            <th className="border border-slate-600 font-bold bg-slate-200 text-slate-700 w-20 shadow-md sticky left-0 z-30" colSpan={1}>
              行事予定
            </th>
            <th className="border border-slate-600 bg-slate-100" colSpan={1}></th>

            {dates.map(date => (
              <td key={date.toString()} className="border border-slate-600 text-[9px] text-slate-700 font-medium align-bottom pb-2 px-0.5 h-full bg-white print:bg-transparent max-w-[32px]">
                <div className="w-full h-full flex items-end justify-center leading-tight break-words whitespace-normal">
                  {getEventName(date)}
                </div>
              </td>
            ))}
            <th className="border border-slate-600 bg-slate-100 print:hidden" colSpan={4}></th>
          </tr>

          <tr className="bg-slate-100 print:bg-transparent h-12 sticky top-0 z-40 shadow-md">
            <th className="border border-slate-600 p-1 w-20 min-w-[80px] bg-slate-200 print:bg-slate-200 font-bold text-slate-800 sticky left-0 z-50">氏名</th>
            <th className="border border-slate-600 p-1 w-24 min-w-[90px] bg-slate-200 print:bg-slate-200 font-bold text-slate-800">資格</th>

            {dates.map(date => {
              const day = date.getDay();
              const style = getDayStyle(day);
              return (
                <th key={date.toString()} className="border border-slate-600 w-8 min-w-[32px]" style={{ ...style, borderBottomWidth: '2px' }}>
                  <div className="flex flex-col justify-center h-full">
                    <span className="text-sm font-bold font-mono">{date.getDate()}</span>
                    <span className="text-[10px] font-bold opacity-70">
                      {['日', '月', '火', '水', '木', '金', '土'][day]}
                    </span>
                  </div>
                </th>
              );
            })}
            <th className="border border-slate-600 w-10 bg-indigo-50 text-indigo-900 font-bold border-l-2 border-l-slate-800 print:hidden">日数</th>
            <th className="border border-slate-600 w-10 bg-indigo-50 text-indigo-900 font-bold print:hidden">時間</th>
            <th className="border border-slate-600 w-10 bg-indigo-50 text-indigo-900 font-bold print:hidden">夜勤</th>
            <th className="border border-slate-600 w-10 bg-indigo-50 text-indigo-900 font-bold print:hidden">有給</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => {
            const stats = staffStats[staff.id] || { days: 0, hours: 0, nightCount: 0, paidHolidays: 0 };
            return (
              <tr key={staff.id} className="hover:bg-yellow-50 print:hover:bg-transparent h-10 transition-colors">
                <td className="border border-slate-600 px-2 text-left whitespace-nowrap font-bold text-slate-800 bg-white sticky left-0 z-30 shadow-md w-20 min-w-[80px]">
                  {getSurname(staff.name)}
                </td>
                <td className="border border-slate-600 px-1 text-center text-[9px] whitespace-nowrap text-slate-600 bg-white font-medium">
                  {staff.qualification || '介護職員'}
                </td>
                {dates.map(date => {
                  const key = `${staff.id}_${getIsoDate(date)}`;
                  const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

                  const isLocked = cellData.isLocked;
                  const isHoveredRow = hoveredCell.staffId === staff.id;
                  const isHoveredCol = hoveredCell.dateStr === getIsoDate(date);

                  return (
                    <ShiftCell
                      key={key}
                      cellData={cellData}
                      isLocked={isLocked}
                      editLockEnabled={editLockEnabled}
                      isHoveredRow={isHoveredRow}
                      isHoveredCol={isHoveredCol}
                      onClick={(e) => onCellClick(e, staff, date)}
                      onContextMenu={(e) => onContextMenu(e, staff, date)}
                      onMouseEnter={() => setHoveredCell({ staffId: staff.id, dateStr: getIsoDate(date) })}
                      onMouseLeave={() => setHoveredCell({ staffId: null, dateStr: null })}
                    />
                  );
                })}
                <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 border-l-2 border-l-slate-800 print:hidden">{stats.days}</td>
                <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden">{stats.hours}</td>
                <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden">{stats.nightCount}</td>
                <td className="border border-slate-600 font-mono text-slate-700 bg-slate-50 print:hidden">{stats.paidHolidays}</td>
              </tr>
            );
          })}

          {[...Array(3)].map((_, i) => (
            <tr key={`empty-${i}`} className="h-10">
              <td className="border border-slate-600 bg-slate-50 sticky left-0 z-10 shadow-md"></td>
              <td className="border border-slate-600 bg-slate-50"></td>
              {dates.map((d, idx) => <td key={idx} className="border border-slate-600 bg-slate-50"></td>)}
              <td className="border border-slate-600 bg-slate-100 border-l-2 border-l-slate-800 print:hidden"></td>
              <td className="border border-slate-600 bg-slate-100 print:hidden"></td>
              <td className="border border-slate-600 bg-slate-100 print:hidden"></td>
              <td className="border border-slate-600 bg-slate-100 print:hidden"></td>
            </tr>
          ))}

        </tbody>
        <tfoot className="print:hidden">
          <tr className="h-12 border-t-4 border-slate-800">
            <td className="border border-slate-600 bg-slate-800 text-white font-bold px-2 sticky left-0 z-30 shadow-md" colSpan={2}>
              配置判定
            </td>
            {dates.map(date => {
              const dateIso = getIsoDate(date);
              const result = sufficiencyData[dateIso];
              let bgClass = "bg-emerald-50";

              if (result && result.maxShortage >= 2) {
                bgClass = "bg-yellow-200";
              } else if (result && result.maxShortage >= 1) {
                bgClass = "bg-yellow-50";
              }

              return (
                <td key={date.toString()} className={`border border-slate-600 text-[9px] align-top p-1 ${bgClass}`}>
                  {result && result.details.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {result.details.map((d, i) => (
                        <span key={i} className="text-red-600 font-bold leading-tight block">{d}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-emerald-600 flex justify-center pt-1">OK</span>
                  )}
                </td>
              );
            })}
            <td colSpan={4} className="border border-slate-600 bg-slate-100"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
