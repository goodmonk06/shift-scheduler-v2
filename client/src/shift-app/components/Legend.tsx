import React from 'react';

export const Legend: React.FC = () => {
  return (
    <div className="mb-4 flex justify-between text-[10px] font-serif items-start">
      <div className="border border-slate-600 p-3 inline-flex gap-4 bg-white shadow-sm rounded-sm flex-wrap print:hidden">
        <span className="font-bold border-r border-slate-300 pr-3 mr-1 text-slate-600">凡例</span>
        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">休: 公休</span>
        <span className="text-white bg-blue-900 px-2 py-0.5 rounded border border-blue-800 font-bold">夜: 夜勤</span>
        <span className="text-slate-900 bg-sky-200 px-2 py-0.5 rounded border border-sky-200">早: 早番</span>
        <span className="text-slate-900 bg-green-200 px-2 py-0.5 rounded border border-green-200">遅: 遅番</span>
        <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">有: 有給</span>
        <span className="text-slate-900 bg-pink-100 px-2 py-0.5 rounded border border-pink-200">日A: 8-17</span>
        <span className="text-slate-900 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">日B: 9-18</span>
      </div>
      <div className="flex gap-8 mr-8">
        <div className="flex flex-col items-center group">
          <div className="border border-slate-400 w-24 h-20 mb-1 bg-white group-hover:border-slate-600 transition-colors"></div>
          <span className="text-slate-600 font-medium">施設長</span>
        </div>
        <div className="flex flex-col items-center group">
          <div className="border border-slate-400 w-24 h-20 mb-1 bg-white group-hover:border-slate-600 transition-colors"></div>
          <span className="text-slate-600 font-medium">管理者</span>
        </div>
      </div>
    </div>
  );
};
