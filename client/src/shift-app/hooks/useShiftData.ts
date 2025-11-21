import { useState, useMemo } from 'react';
import { ShiftCell, generateShifts, calculateWorkStats, calculateSufficiency, Staff } from '../utils/shiftLogic';

export const useShiftData = (dates: Date[], staffList: Staff[]) => {
  const [shifts, setShifts] = useState<Record<string, ShiftCell | null>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  // 勤務統計を計算
  const staffStats = useMemo(() => {
    const stats: Record<string, any> = {};
    staffList.forEach(staff => {
      stats[staff.id] = calculateWorkStats(shifts, staff.id, dates);
    });
    return stats;
  }, [shifts, staffList, dates]);

  // 配置充足性を計算
  const sufficiencyData = useMemo(() => {
    return calculateSufficiency(dates, shifts, staffList);
  }, [dates, shifts, staffList]);

  // AI自動生成を開始
  const startGeneration = () => {
    setIsGenerating(true);
    setProgress(0);
    setLoadingStage('初期化中...');

    const stages = [
      { p: 10, text: '職員データベース照合中...' },
      { p: 30, text: '雇用条件・固定シフト適用中...' },
      { p: 60, text: '夜勤・早番・休日バランス調整中...' },
      { p: 80, text: '配置基準充足チェック中...' },
      { p: 100, text: '完了' }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (currentStageIndex < stages.length && newProgress >= stages[currentStageIndex].p) {
          setLoadingStage(stages[currentStageIndex].text);
          currentStageIndex++;
        }
        if (newProgress >= 100) {
          clearInterval(interval);
          completeGeneration();
        }
        return newProgress;
      });
    }, 50);
  };

  // 生成を完了
  const completeGeneration = () => {
    const newShifts = generateShifts(dates, staffList);
    setShifts(newShifts);
    setIsGenerating(false);
  };

  return {
    shifts,
    setShifts,
    staffStats,
    sufficiencyData,
    isGenerating,
    progress,
    loadingStage,
    startGeneration
  };
};
