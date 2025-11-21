import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Printer, User, Settings, Crown, RefreshCw, X, Save, Clock, Lock, Unlock, ZoomIn, ZoomOut, MousePointer2, AlertTriangle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from "../hooks/useToast";

import { trpcClient } from "../lib/trpc";

// --- 設定定数 ---
const START_DATE = new Date(2025, 11, 1); // 2025年12月1日
const END_DATE = new Date(2026, 0, 5);    // 2026年1月5日
const FACILITY_NAME = "からふる庭園 蘇原";

// ルール定数
const REQUIRED_HOLIDAYS_FULLTIME = 9; // 正社員の公休数
const MAX_CONSECUTIVE_WORK_DAYS = 4;  // 最大連勤数

// 正社員IDリスト
const FULL_TIME_STAFF_IDS = ['2', '3', '4', '5', '6', '7'];
// 事務員ID
const CLERK_STAFF_ID = '27';

// 配置基準マトリクス
const REQUIRED_STAFF_MATRIX = {
  0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1,
  6: 2, 7: 2, 8: 3,
  9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 4,
  17: 3, 18: 2, 19: 2, 20: 1, 21: 1, 22: 1, 23: 1
};

// --- 職員データ ---
// constraints:
// fixedTimeOnly: true -> 早番・遅番・夜勤の自動割り当て対象外（時間はdefaultShift固定）
// forbiddenTypes: ['NIGHT', 'EARLY'] -> 特定のシフト種別を禁止
// monthlyShiftCounts: { 'シフト名': 回数 } -> 特定のシフトを月に何回入れるか（残りはdefaultShift）
const STAFF_RAW_DATA = [
  {
    id: '1', name: '高野 幹成', role: 'admin', qualification: '管理者',
    note: 'スポット勤務',
    schedule: { '2025-12-11': '夜', '2025-12-12': '明', '2025-12-13': '休', '2025-12-24': '夜', '2025-12-25': '明', '2025-12-26': '休' },
    constraints: { fixedTimeOnly: true }
  },
  { id: '2', name: '山口 夕香里', role: 'admin', qualification: 'サ責', schedule: { '2025-12-01': '研修', '2025-12-04': '研修', '2025-12-07': '休', '2025-12-10': '研修' }, constraints: { defaultShift: '9～18' } },
  {
    id: '3', name: '馬渕 尊至', role: 'admin', qualification: '相談員',
    schedule: {},
    // 夜勤禁止
    constraints: { randomShifts: ['早', '8～17', '9～18'], forbiddenTypes: ['NIGHT'] }
  },
  { id: '4', name: '松嵜 愛梨', role: 'admin', qualification: 'サ責', schedule: { '2025-12-12': '休', '2025-12-27': '冬', '2025-12-31': '夜', '2026-01-01': '明', '2026-01-02': '休' }, constraints: { defaultShift: '9～18' } },
  {
    id: '5', name: '杉山 美佳子', role: 'staff', qualification: '介護主任',
    // 12/1明, 12/2休 固定
    schedule: { '2025-12-01': '明', '2025-12-02': '休', '2025-12-05': '休', '2025-12-12': '休', '2025-12-13': '冬', '2025-12-19': '休', '2025-12-26': '休', '2026-01-01': '夜', '2026-01-02': '明', '2026-01-03': '休' },
    constraints: { defaultShift: '9～18', specialRule: 'SUGIYAMA_FRIDAY' }
  },
  { id: '6', name: '梅田 英津子', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-03': '休', '2025-12-25': '休', '2025-12-28': '有給', '2025-12-29': '冬', '2025-12-30': '夜', '2025-12-31': '明', '2026-01-01': '休', '2026-01-03': '夜', '2026-01-04': '明', '2026-01-05': '休' }, constraints: { defaultShift: '9～18', forbiddenTypes: ['LATE', '11～20'] } },
  { id: '7', name: '大橋 健一', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-06': '休', '2025-12-07': '休', '2025-12-28': '夜', '2025-12-30': '明', '2025-12-31': '休', '2026-01-02': '夜', '2026-01-03': '明', '2026-01-04': '休' }, constraints: { defaultShift: '9～18', offDayOfWeek: [5], nightShiftTarget: 9, specialRule: 'OHASHI_NIGHT_COMBO' } },
  {
    id: '8', name: '上条 やえ子', role: 'staff', qualification: '介護福祉士',
    schedule: { '2025-12-01': '休', '2025-12-07': '休', '2025-12-14': '休', '2025-12-16': '休', '2025-12-21': '休', '2025-12-27': '休', '2025-12-28': '休', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休' },
    // 時間固定 (自動早番NG)、9-15を月2回
    constraints: { workDaysPerMonth: 18, defaultShift: '8～16', monthlyShiftCounts: { '9～15': 2 }, fixedTimeOnly: true }
  },
  {
    id: '9', name: '若森 直子', role: 'staff', qualification: '介護福祉士',
    schedule: { '2025-12-02': '休', '2025-12-03': '休', '2025-12-06': '休', '2025-12-07': '8～14', '2025-12-11': '休', '2025-12-12': '休', '2025-12-13': '休', '2025-12-14': '8～14', '2025-12-21': '休', '2025-12-22': '休', '2025-12-23': '休', '2025-12-27': '8～14', '2025-12-28': '8～14', '2025-12-29': '休', '2025-12-30': '休', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休' },
    // 時間固定、8-10を月1回
    constraints: { workDaysPerMonth: 13, defaultShift: '8～14', monthlyShiftCounts: { '8～10': 1 }, fixedTimeOnly: true }
  },
  { id: '10', name: '足立 洋子', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '9～16', '2025-12-02': '休', '2025-12-03': '休', '2025-12-04': '8～16', '2025-12-05': '休', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～16', '2025-12-09': '休', '2025-12-10': '休', '2025-12-11': '8～16', '2025-12-12': '休', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '9～16', '2025-12-16': '休', '2025-12-17': '休', '2025-12-18': '8～16', '2025-12-19': '休', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '9～16', '2025-12-23': '休', '2025-12-24': '休', '2025-12-25': '8～16', '2025-12-26': '休', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '9～16', '2025-12-30': '休', '2025-12-31': '休', '2026-01-01': '8～13', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '9～16' }, constraints: { fixedDayOfWeek: { 1: '9～16', 4: '8～16' }, offDayOfWeek: [0, 2, 3, 5, 6], fixedTimeOnly: true } },
  { id: '11', name: '野仲 彩香', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '8半～12半', '2025-12-02': '8半～12半', '2025-12-03': '休', '2025-12-04': '8半～13', '2025-12-05': '8半～12半', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '8半～13', '2025-12-09': '休', '2025-12-10': '8半～12半', '2025-12-11': '8半～12半', '2025-12-12': '8半～13', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '8半～13', '2025-12-16': '休', '2025-12-17': '8半～12半', '2025-12-18': '8半～12半', '2025-12-19': '8～12半', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '8半～13', '2025-12-23': '8半～13', '2025-12-24': '8半～13', '2025-12-25': '休', '2025-12-26': '8半～12半', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2025-12-31': '休', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { defaultShift: '8半～13半', fixedTimeOnly: true } },
  { id: '12', name: '桂川 美幸', role: 'staff', qualification: '実務者研修', schedule: { '2025-12-01': '18～20', '2025-12-02': '休', '2025-12-03': '18～20', '2025-12-04': '休', '2025-12-05': '18～20', '2025-12-06': '休', '2025-12-07': '18～20', '2025-12-08': '18～20', '2025-12-09': '休', '2025-12-10': '18～20', '2025-12-11': '休', '2025-12-12': '18～20', '2025-12-13': '休', '2025-12-14': '18～20', '2025-12-15': '18～20', '2025-12-16': '休', '2025-12-17': '18～20', '2025-12-18': '休', '2025-12-19': '18～20', '2025-12-20': '休', '2025-12-21': '18～20', '2025-12-22': '18～20', '2025-12-23': '休', '2025-12-24': '18～20', '2025-12-25': '休', '2025-12-26': '18～20', '2025-12-27': '休', '2025-12-28': '18～20', '2025-12-29': '18～20', '2025-12-30': '18～20', '2025-12-31': '18～20', '2026-01-01': '18～20', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '18～20', '2026-01-05': '18～20' }, constraints: { fixedDayOfWeek: { 1: '18～20', 3: '18～20', 5: '18～20', 0: '18～20' }, offDayOfWeek: [2, 4, 6], fixedTimeOnly: true } },
  { id: '13', name: '加藤 広大', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '休', '2025-12-02': '休', '2025-12-03': '休', '2025-12-04': '11～20', '2025-12-05': '休', '2025-12-06': '11～20', '2025-12-07': '休', '2025-12-08': '休', '2025-12-09': '休', '2025-12-10': '休', '2025-12-11': '休', '2025-12-12': '休', '2025-12-13': '11～20', '2025-12-14': '休', '2025-12-15': '休', '2025-12-16': '休', '2025-12-17': '休', '2025-12-18': '11～20', '2025-12-19': '休', '2025-12-20': '11～20', '2025-12-21': '休', '2025-12-22': '休', '2025-12-23': '休', '2025-12-24': '休', '2025-12-25': '11～20', '2025-12-26': '休', '2025-12-27': '11～20', '2025-12-28': '休', '2026-01-03': '11～20', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { fixedDayOfWeek: { 3: '11～20', 6: '11～20' }, offDayOfWeek: [2], defaultShift: '9～18', fixedTimeOnly: true } },
  { id: '14', name: '湯本 智子', role: 'staff', qualification: '初任者研修', schedule: { '2025-12-03': '休', '2025-12-05': '休', '2025-12-10': '休', '2025-12-11': '休', '2025-12-17': '休', '2025-12-19': '休' }, constraints: { defaultShift: '9～18', workDaysPerWeek: 4, fixedTimeOnly: true } },
  { id: '15', name: '楠 美佐', role: 'staff', qualification: '初任者研修', schedule: { '2025-12-01': '9～16', '2025-12-02': '休', '2025-12-03': '休', '2025-12-04': '9～12', '2025-12-05': '13～16', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～16', '2025-12-09': '休', '2025-12-10': '休', '2025-12-11': '休', '2025-12-12': '13～16', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '9～16', '2025-12-16': '休', '2025-12-17': '休', '2025-12-18': '9～16', '2025-12-19': '9～12', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '9～12', '2025-12-23': '休', '2025-12-24': '休', '2025-12-25': '13～16', '2025-12-26': '13～16', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2025-12-31': '9～12', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '9～12', '2026-01-04': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6, 2], defaultShift: '9～16', fixedTimeOnly: true } },
  { id: '16', name: '平井 英子', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '休', '2025-12-02': '休', '2025-12-03': '10～16', '2025-12-04': '休', '2025-12-05': '10～16', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '休', '2025-12-09': '休', '2025-12-10': '10～16', '2025-12-11': '休', '2025-12-12': '10～16', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '休', '2025-12-16': '休', '2025-12-17': '10～16', '2025-12-18': '休', '2025-12-19': '10～16', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '休', '2025-12-23': '休', '2025-12-24': '10～16', '2025-12-25': '休', '2025-12-26': '10～16', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2025-12-31': '10～16', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { fixedDayOfWeek: { 3: '10～16', 5: '10～16' }, offDayOfWeek: [0, 1, 2, 4, 6], fixedTimeOnly: true } },
  { id: '17', name: '海野 はるか', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '休', '2025-12-02': '9～14', '2025-12-03': '9～14', '2025-12-04': '休', '2025-12-05': '9～14', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～13', '2025-12-09': '9～13', '2025-12-10': '休', '2025-12-11': '9～13', '2025-12-12': '9～13', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '9～14', '2025-12-16': '休', '2025-12-17': '9～12', '2025-12-18': '9～14', '2025-12-19': '9～14', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '9～14', '2025-12-23': '9～14', '2025-12-24': '9～14', '2025-12-25': '休', '2025-12-26': '9～14', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '9～14', '2026-01-03': '休', '2026-01-04': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], defaultShift: '9～14', fixedTimeOnly: true } },
  {
    id: '18', name: '山田 明美', role: 'staff', qualification: '介護福祉士',
    schedule: { '2025-12-02': '休', '2025-12-04': '休', '2025-12-06': '9～15', '2025-12-07': '休', '2025-12-09': '休', '2025-12-16': '休', '2025-12-18': '休', '2025-12-25': '休', '2025-12-30': '休', '2026-01-02': '休' },
    // ★完全固定: 9～15のみ, 早番自動割り当てNG
    constraints: { defaultShift: '9～15', workDaysPerMonth: 15, fixedTimeOnly: true }
  },
  { id: '19', name: '足立 豊子', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-03': '休', '2025-12-06': '有給', '2025-12-07': '休', '2025-12-09': '休', '2025-12-10': '休', '2025-12-18': '9～17', '2025-12-24': '休', '2025-12-25': '9～17', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2026-01-01': '休', '2026-01-02': '有給', '2026-01-03': '休', '2026-01-04': '休' }, constraints: { defaultShift: '9～17', workDaysPerMonth: 18, fixedTimeOnly: true } },
  { id: '20', name: '関田 あゆみ', role: 'staff', qualification: '介護福祉士', schedule: { '2025-12-01': '9～15', '2025-12-02': '休', '2025-12-03': '有給', '2025-12-04': '9～15', '2025-12-05': '9～16', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～15', '2025-12-09': '9～15', '2025-12-10': '9～13', '2025-12-11': '9～13', '2025-12-12': '9～13', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '9～13', '2025-12-16': '9～15', '2025-12-17': '有給', '2025-12-18': '9～15', '2025-12-19': '9～16', '2025-12-21': '休', '2025-12-22': '休', '2025-12-25': '休', '2025-12-27': '休', '2025-12-28': '休', '2026-01-02': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], fixedDayOfWeek: { 1: '9～15', 2: '9～15', 4: '9～15', 3: '9～16', 5: '9～16' }, fixedTimeOnly: true } },
  { id: '21', name: '長山 真梨奈', role: 'staff', qualification: '初任者研修', schedule: { '2025-12-01': '休', '2025-12-02': '9～14', '2025-12-03': '9～14', '2025-12-04': '9～14', '2025-12-05': '休', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～14', '2025-12-09': '9～14', '2025-12-10': '休', '2025-12-11': '9～12半', '2025-12-12': '9～12半', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '9～13', '2025-12-16': '休', '2025-12-17': '9～13', '2025-12-18': '9～13', '2025-12-19': '休', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '9～14', '2025-12-23': '9～14', '2025-12-24': '休', '2025-12-25': '9～14', '2025-12-26': '9～14', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2025-12-31': '9～12半', '2026-01-01': '休', '2026-01-02': '9～12半', '2026-01-03': '9～12半', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], defaultShift: '9～13半', fixedTimeOnly: true } },
  { id: '22', name: '近藤 由美子', role: 'staff', qualification: '看護師', schedule: { '2025-12-01': '休', '2025-12-02': '休', '2025-12-03': '休', '2025-12-04': '休', '2025-12-05': '9～13', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '休', '2025-12-09': '休', '2025-12-10': '休', '2025-12-11': '休', '2025-12-12': '9～13', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '休', '2025-12-16': '休', '2025-12-17': '休', '2025-12-18': '休', '2025-12-19': '9～13', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '休', '2025-12-23': '休', '2025-12-24': '休', '2025-12-25': '休', '2025-12-26': '9～13', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '休', '2025-12-30': '休', '2025-12-31': '休', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '休' }, constraints: { workDaysPerWeek: 1, defaultShift: '9～13', fixedTimeOnly: true } },
  {
    id: '23', name: '大堀 シェリー', role: 'staff', qualification: '初任者研修',
    schedule: {
      '2025-12-01': '休', '2025-12-02': '9～18', '2025-12-03': '9～18', '2025-12-04': '9～18', '2025-12-05': '9～18',
      '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '9～18', '2025-12-09': '9～18', '2025-12-10': '9～18', '2025-12-11': '9～18', '2025-12-12': '9～18',
      '2025-12-13': '休', '2025-12-14': '休',
      '2025-12-15': '9～18', '2025-12-16': '9～18', '2025-12-17': '9～18', '2025-12-18': '9～18',
      '2025-12-19': '休', '2025-12-20': '休', '2025-12-21': '休',
      '2025-12-22': '9～18', '2025-12-23': '9～18', '2025-12-24': '休', '2025-12-25': '9～17', '2025-12-26': '9～18',
      '2025-12-27': '休', '2025-12-28': '休',
      '2025-12-29': '9～18', '2025-12-30': '9～14',
      '2025-12-31': '休', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '休', '2026-01-04': '休',
      '2026-01-05': '9～18'
    }, constraints: { offHolidays: true, offDayOfWeek: [0, 6], workDaysPerWeek: 4, defaultShift: '9～18', fixedTimeOnly: true }
  },
  { id: '24', name: '宝本 龍騎', role: 'staff', qualification: '初任者研修', schedule: { '2025-12-01': '10～15', '2025-12-02': '休', '2025-12-03': '10～14', '2025-12-04': '休', '2025-12-05': '休', '2025-12-06': '休', '2025-12-07': '10～14', '2025-12-08': '休', '2025-12-09': '10～14', '2025-12-10': '休', '2025-12-11': '休', '2025-12-12': '10～14', '2025-12-13': '10～14', '2025-12-14': '休', '2025-12-15': '休', '2025-12-16': '休', '2025-12-17': '10～15', '2025-12-18': '10～14', '2025-12-19': '休', '2025-12-20': '10～15', '2025-12-21': '10～14', '2025-12-22': '休', '2025-12-23': '休', '2025-12-24': '休', '2025-12-25': '10～14', '2025-12-26': '休', '2025-12-27': '10～14', '2025-12-28': '休', '2025-12-29': '10～14', '2025-12-30': '10～14', '2025-12-31': '休', '2026-01-01': '10～15', '2026-01-02': '10～15', '2026-01-03': '休', '2026-01-04': '休', '2026-01-05': '10～15' }, constraints: { defaultShift: '10～14', workDaysPerWeek: 3, fixedTimeOnly: true } },
  { id: '25', name: '岩崎 亜友美', role: 'staff', qualification: '有料職員', schedule: { '2025-12-01': '8～17', '2025-12-02': '8～17', '2025-12-03': '休', '2025-12-04': '休', '2025-12-05': '8～17', '2025-12-06': '8～17', '2025-12-07': '休', '2025-12-08': '休', '2025-12-09': '8～17', '2025-12-10': '8～17', '2025-12-11': '休', '2025-12-12': '休', '2025-12-13': '8～17', '2025-12-14': '休', '2025-12-15': '休', '2025-12-16': '8～17', '2025-12-17': '休', '2025-12-18': '8～17', '2025-12-19': '休', '2025-12-20': '8～17', '2025-12-21': '休', '2025-12-22': '休', '2025-12-23': '8～17', '2025-12-24': '8～17', '2025-12-25': '休', '2025-12-26': '休', '2025-12-27': '8～17', '2025-12-28': '休', '2025-12-29': '8～17', '2025-12-30': '8～17', '2025-12-31': '休', '2026-01-01': '8～17', '2026-01-02': '休', '2026-01-03': '8～17', '2026-01-04': '休', '2026-01-05': '8～17' }, constraints: { offDayOfWeek: [0, 3, 6], defaultShift: '8～17', workDaysPerWeek: 4, fixedTimeOnly: true } },
  {
    id: '26', name: '伊藤 美穂', role: 'staff', qualification: '初任者研修',
    // 火木土 11半～17、それ以外休
    schedule: {},
    constraints: { offDayOfWeek: [0, 1, 3, 5], fixedDayOfWeek: { 2: '11半～17', 4: '11半～17', 6: '11半～17' }, fixedTimeOnly: true }
  },
  { id: '27', name: '浅野 穂菜美', role: 'staff', qualification: '初任者研修', schedule: { '2025-12-01': '8～16半', '2025-12-02': '8～16半', '2025-12-03': '8～16半', '2025-12-04': '休', '2025-12-05': '8～16半', '2025-12-06': '休', '2025-12-07': '休', '2025-12-08': '8～16半', '2025-12-09': '8～16半', '2025-12-10': '8～16半', '2025-12-11': '休', '2025-12-12': '8～16半', '2025-12-13': '休', '2025-12-14': '休', '2025-12-15': '8～16半', '2025-12-16': '8～16半', '2025-12-17': '休', '2025-12-18': '休', '2025-12-19': '8～16半', '2025-12-20': '休', '2025-12-21': '休', '2025-12-22': '8～16半', '2025-12-23': '8～16半', '2025-12-24': '休', '2025-12-25': '休', '2025-12-26': '8～16半', '2025-12-27': '休', '2025-12-28': '休', '2025-12-29': '8～16半', '2025-12-30': '8～16半', '2025-12-31': '8～16半', '2026-01-01': '休', '2026-01-02': '休', '2026-01-03': '8～16半', '2026-01-04': '8～16半', '2026-01-05': '8～16半' }, constraints: { offHolidays: true, offDayOfWeek: [0, 4, 6], defaultShift: '8～16半', fixedTimeOnly: true } },
];

// シフトの種類定義
const SHIFT_TYPES = {
  DAY: { id: 'D', label: '日', text: '日', color: 'text-gray-900', bgColor: 'bg-white' },
  NIGHT: { id: 'N', label: '夜', text: '夜', color: 'text-white', bgColor: 'bg-blue-900' },
  EARLY: { id: 'E', label: '早', text: '早', color: 'text-gray-900', bgColor: 'bg-sky-200' },
  LATE: { id: 'L', label: '遅', text: '遅', color: 'text-gray-900', bgColor: 'bg-green-200' },
  OFF: { id: 'X', label: '休', text: '休', color: 'text-red-600', bgColor: 'bg-red-100' },
  HOPE: { id: 'H', label: '希', text: '有', color: 'text-orange-800', bgColor: 'bg-orange-200' },
  WINTER: { id: 'W', label: '冬', text: '冬', color: 'text-blue-800', bgColor: 'bg-blue-200' },
};

const SHIFT_PRESETS = [
  { text: '日', type: 'DAY' },
  { text: '日A', type: 'DAY' },
  { text: '日B', type: 'DAY' },
  { text: '休', type: 'OFF' },
  { text: '夜', type: 'NIGHT' },
  { text: '早', type: 'EARLY' },
  { text: '遅', type: 'LATE' },
  { text: '有', type: 'HOPE' },
  { text: '冬', type: 'WINTER' },
  { text: '明', type: 'EARLY' },
];

const TIME_PRESETS = [
  '6～15', '8～17', '9～18', '11～20', '9～16', '10～14', '10～15', '18～20'
];

const WORK_PATTERNS = ['6～15', '8～17', '9～18', '11～20'];

// --- ヘルパー関数 ---
const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const getIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getNightShiftCandidates = (staffList: any[]): string[] => {
  return staffList.filter(staff => {
    // fixedTimeOnlyの人には夜勤を割り当てない
    if (staff.constraints?.fixedTimeOnly) return false;
    if (!staff.schedule) return false;
    // constraints.forbiddenTypes もチェック
    if (staff.constraints?.forbiddenTypes?.includes('NIGHT')) return false;

    // 既存シフトやルールから夜勤可能か判断
    return Object.values(staff.schedule || {}).some((val: any) => val === '夜' || val === '夜勤') || FULL_TIME_STAFF_IDS.includes(staff.id);
  }).map(s => s.id);
};

const getEventName = (date: Date): string => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && d === 8) return '給食委員会';
  if (m === 12 && d === 18) return '誕生日会';
  if (m === 12 && d === 25) return 'クリスマス会';
  if (m === 12 && d === 31) return '大晦日';
  if (m === 1 && d === 1) return '元旦';
  return '';
};

const calculateWorkStats = (shifts: any, staffId: string, dates: Date[]): { days: number; hours: number; nightCount: number; paidHolidays: number } => {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let paidHolidays = 0;

  dates.forEach(date => {
    const key = `${staffId}_${getIsoDate(date)}`;
    const cell = shifts[key];
    if (!cell) return;

    const text = cell.customText;
    const type = cell.type;

    if (text === '有' || text === '有給') {
      paidHolidays++;
      return;
    }
    if (text === '休' || text === '休職' || text === '' || type === 'OFF') {
      return;
    }

    if (text !== '明') {
      days++;
    }

    if (text === '夜' || type === 'NIGHT') {
      nightCount++;
      hours += 16;
      return;
    }

    if (text === '日' || text === '日A' || text === '日B' || text === '早' || text === '遅' || type === 'DAY' || type === 'EARLY' || type === 'LATE') {
      hours += 8;
    } else {
      const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
      if (match) {
        let start = parseInt(match[1]);
        if (text.includes(match[1] + '半')) start += 0.5;
        let end = parseInt(match[2]);
        if (text.includes(match[2] + '半')) end += 0.5;

        let diff = end - start;
        if (diff > 6) diff -= 1;
        hours += diff > 0 ? diff : 0;
      } else {
        hours += 8;
      }
    }
  });

  return { days, hours, nightCount, paidHolidays };
};

const getSurname = (fullname: string): string => {
  const parts = fullname.split(/[\s　]+/);
  return parts[0];
};


const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
  if (text === '夜' || type === 'NIGHT') return { start: 16, end: 33 };
  if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '明') return null;

  if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
  if (text === '日A') return { start: 8, end: 17 };
  if (text === '日B') return { start: 9, end: 18 };
  if (text === '早' || type === 'EARLY') return { start: 6, end: 15 };
  if (text === '遅' || type === 'LATE') return { start: 10, end: 19 };

  const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
  if (match) {
    let start = parseInt(match[1]);
    if (text.includes(match[1] + '半')) start += 0.5;
    let end = parseInt(match[2]);
    if (text.includes(match[2] + '半')) end += 0.5;
    return { start, end };
  }
  return { start: 9, end: 18 };
};

const calculateSufficiency = (dates: Date[], shifts: any, staffList: any[]): any => {
  const results: any = {};

  dates.forEach((date, dateIdx) => {
    const dateIso = getIsoDate(date);

    const hourlyCounts = new Array(24).fill(0);
    const hourlyFullTimeCounts = new Array(24).fill(0);

    if (dateIdx > 0) {
      const prevDate = dates[dateIdx - 1];
      const prevKeySuffix = getIsoDate(prevDate);
      staffList.forEach(staff => {
        const cell = shifts[`${staff.id}_${prevKeySuffix}`];
        if (cell && (cell.type === 'NIGHT' || cell.customText === '夜')) {
          for (let h = 0; h < 9; h++) {
            hourlyCounts[h]++;
            if (FULL_TIME_STAFF_IDS.includes(staff.id)) hourlyFullTimeCounts[h]++;
          }
        }
      });
    }

    staffList.forEach(staff => {
      const cell = shifts[`${staff.id}_${dateIso}`];
      if (!cell) return;
      const time = parseShiftTime(cell.customText, cell.type);
      if (!time) return;

      let start = time.start;
      let end = time.end;

      if (end > 24) end = 24;

      for (let h = Math.floor(start); h < Math.ceil(end); h++) {
        if (h >= 0 && h < 24) {
          hourlyCounts[h]++;
          if (FULL_TIME_STAFF_IDS.includes(staff.id)) hourlyFullTimeCounts[h]++;
          if (staff.id === CLERK_STAFF_ID && h >= 9 && h < 18) hourlyFullTimeCounts[h]++;
        }
      }
    });

    const shortageDetails: string[] = [];
    let maxShortage = 0;

    for (let h = 0; h < 24; h++) {
      let required = REQUIRED_STAFF_MATRIX[h as keyof typeof REQUIRED_STAFF_MATRIX] || 1;
      let current = hourlyCounts[h];
      let diff = current - required;

      if (h >= 9 && h < 16) {
        if (hourlyFullTimeCounts[h] < 1) {
          shortageDetails.push(`${h}時:正社員不足`);
          maxShortage = Math.max(maxShortage, 2);
        }
      }

      if (diff < 0) {
        shortageDetails.push(`${h}時(${diff})`);
        if (diff <= -2) maxShortage = Math.max(maxShortage, 2);
        else maxShortage = Math.max(maxShortage, 1);
      }
    }

    results[dateIso] = {
      maxShortage,
      details: shortageDetails
    };
  });

  return results;
};

// --- コンポーネント本体 ---
export function DecemberShiftGeneration() {
  const toast = useToast();
  const [dates] = useState(generateDateRange(START_DATE, END_DATE));
  const [staffList] = useState(STAFF_RAW_DATA);
  const [shifts, setShifts] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [printPreview, setPrintPreview] = useState(false);
  const [editLockEnabled, setEditLockEnabled] = useState(true);
  const [zoom, setZoom] = useState(1.0);

  // AI Check state
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  const [contextMenu, setContextMenu] = useState<any>(null);
  const [hoveredCell, setHoveredCell] = useState({ staffId: null as string | null, dateStr: null as string | null });

  const [popoverState, setPopoverState] = useState<any>({
    isOpen: false,
    staffId: null,
    date: null,
    staffName: '',
    targetRect: null,
    currentValue: null
  });



  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToDB = async () => {
    if (!saveName) {
      toast.error("保存名を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const entries = [];
      for (const staff of staffList) {
        for (const date of dates) {
          const key = `${staff.id}_${getIsoDate(date)}`;
          const cell = shifts[key];
          if (cell) {
            entries.push({
              employeeName: staff.name,
              date: date.getDate(),
              type: cell.type === 'OFF' ? 'holiday' : 'work',
              text: cell.customText
            });
          }
        }
      }

      await trpcClient.shifts.saveStandalone.mutate({
        year: 2025,
        month: 12,
        name: saveName,
        entries: entries
      });

      toast.success("シフトを保存しました");
      setIsSaveModalOpen(false);
    } catch (error: any) {
      toast.error("保存に失敗しました", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openSaveModal = () => {
    // Generate default name: "12月シフト_v{count}" (we don't know count, so just timestamp or random)
    const defaultName = `12月シフト_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}_${Math.floor(Math.random() * 1000)}`;
    setSaveName(defaultName);
    setIsSaveModalOpen(true);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolledLeft(container.scrollLeft > 20);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const eventRowHeight = useMemo(() => {
    return 60;
  }, []);

  const staffStats = useMemo(() => {
    const stats: any = {};
    staffList.forEach(staff => {
      stats[staff.id] = calculateWorkStats(shifts, staff.id, dates);
    });
    return stats;
  }, [shifts, staffList, dates]);

  const sufficiencyData = useMemo(() => {
    return calculateSufficiency(dates, shifts, staffList);
  }, [dates, shifts, staffList]);

  const handlePrint = () => {
    window.print();
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  // AIチェック実行関数
  const runAICheck = async (shiftData: any) => {
    try {
      setIsChecking(true);
      setCheckResult(null);

      const response = await fetch('/api/external-shifts/december/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AIチェックに失敗しました');
      }

      const result = await response.json();
      setCheckResult(result.result);

      if (result.result.violations.length === 0) {
        toast.success('問題は見つかりませんでした');
      } else {
        toast.warning(`${result.result.violations.length}件の問題が見つかりました`);
      }
    } catch (error: any) {
      console.error('AI check failed:', error);
      toast.error('AIチェックに失敗しました', {
        description: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleAICheck = async () => {
    // シフトデータを変換してAIチェック
    const shiftsArray = dates.flatMap(date => {
      return staffList.map(staff => {
        const key = `${staff.id}_${getIsoDate(date)}`;
        const cell = shifts[key];
        if (!cell || !cell.customText) return null;

        return {
          employeeId: staff.id,
          employeeName: staff.name,
          date: getIsoDate(date),
          shiftType: cell.type,
          customText: cell.customText,
          isLocked: cell.isLocked || false
        };
      }).filter(Boolean);
    });

    const shiftData = {
      year: 2025,
      month: 12,
      shifts: shiftsArray
    };

    await runAICheck(shiftData);
  };

  const startFakeAIGeneration = () => {
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

  const normalizeShiftText = (text: string): string => {
    if (text === '8～17' || text === '8:00～17:00') return '日A';
    if (text === '9～18' || text === '9:00～18:00') return '日B';
    if (text === '早') return '早';
    return text;
  };

  const completeGeneration = () => {
    const newShifts: any = {};
    const nightCandidates = getNightShiftCandidates(staffList);

    try {
      // 1. 固定スケジュール
      staffList.forEach(staff => {
        dates.forEach(date => {
          const key = `${staff.id}_${getIsoDate(date)}`;
          const dateStr = getIsoDate(date);
          const dayOfWeek = date.getDay();
          const isHolidayFlag = isHoliday(date);
          const cons = staff.constraints || {};

          let val = null;

          if (staff.schedule && staff.schedule[dateStr]) {
            const req = staff.schedule[dateStr];
            val = { type: 'DAY', customText: normalizeShiftText(req), isLocked: true };
            if (req === '休') val = { type: 'OFF', customText: '休', isLocked: true };
            else if (req === '有給' || req === '有') val = { type: 'HOPE', customText: '有', isLocked: true };
            else if (req === '冬' || req === '冬休み') val = { type: 'WINTER', customText: '冬', isLocked: true };
            else if (req === '夜' || req === '夜勤') val = { type: 'NIGHT', customText: '夜', isLocked: true };
            else if (req === '明' || req === '明け') val = { type: 'EARLY', customText: '明', isLocked: true };
            else if (req === '早' || req === '早番') val = { type: 'EARLY', customText: '早', isLocked: true };
            else if (req === '遅' || req === '遅番') val = { type: 'LATE', customText: '遅', isLocked: true };
          }
          else if (staff.note && (staff.note.includes('休職') || staff.note.includes('スポット勤務'))) {
            val = { type: 'OFF', customText: staff.note.includes('休職') ? '休職' : '', isLocked: true };
          }
          else {
            // 条件付き自動入力
            if ((cons.offDayOfWeek && cons.offDayOfWeek.includes(dayOfWeek)) || (cons.offHolidays && isHolidayFlag)) {
              val = { type: 'OFF', customText: '休', isLocked: true };
            } else if (cons.fixedDayOfWeek && cons.fixedDayOfWeek[dayOfWeek]) {
              val = { type: 'DAY', customText: normalizeShiftText(cons.fixedDayOfWeek[dayOfWeek]), isLocked: true };
            }
          }

          newShifts[key] = val;
        });
      });

      // 2. 夜勤自動割り当て
      for (let i = 0; i < dates.length - 1; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        const hasNight = staffList.some(s => {
          const cell = newShifts[`${s.id}_${keySuffix}`];
          return cell && (cell.type === 'NIGHT' || cell.customText === '夜');
        });

        if (!hasNight) {
          const candidates = [...nightCandidates].sort(() => 0.5 - Math.random());

          let assigned = false;
          for (const staffId of candidates) {
            const staff = staffList.find(s => s.id === staffId);
            if (!staff) continue;
            if (staff.note === 'スポット勤務') continue;
            if (staff.constraints?.fixedTimeOnly) continue;
            if (staff.constraints?.forbiddenTypes?.includes('NIGHT')) continue;

            if (date.getDay() === 5 && staff.constraints?.specialRule === 'OHASHI_NIGHT_COMBO') continue;

            const d0 = date;
            const d1 = new Date(date); d1.setDate(d1.getDate() + 1);
            const d2 = new Date(date); d2.setDate(d2.getDate() + 2);

            const k0 = `${staffId}_${getIsoDate(d0)}`;
            const k1 = `${staffId}_${getIsoDate(d1)}`;
            const k2 = `${staffId}_${getIsoDate(d2)}`;

            const s0 = newShifts[k0];
            const s1 = d1 <= END_DATE ? newShifts[k1] : null;
            const s2 = d2 <= END_DATE ? newShifts[k2] : null;

            const isS0Available = !s0 || (!s0.isLocked && s0.type !== 'OFF');
            const isS1Available = !s1 || (!s1.isLocked && s1.type !== 'OFF' && s1.type !== 'HOPE' && s1.type !== 'WINTER');

            if (isS0Available && isS1Available) {
              newShifts[k0] = { type: 'NIGHT', customText: '夜', isLocked: false };
              if (s1 !== undefined) newShifts[k1] = { type: 'EARLY', customText: '明', isLocked: false };
              if (s2 !== undefined && (!s2 || !s2.isLocked)) {
                newShifts[k2] = { type: 'OFF', customText: '休', isLocked: false };
              }
              assigned = true;
              break;
            }
          }
        }
      }

      // 2.5 早番自動割り当て
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        const hasEarly = staffList.some(s => {
          const cell = newShifts[`${s.id}_${keySuffix}`];
          return cell && (cell.customText === '早' || cell.customText === '6～15');
        });

        if (!hasEarly) {
          const availableStaff = staffList.filter((s: any) => {
            if (s.note === 'スポット勤務' || s.note === '休職') return false;
            if (s.constraints?.fixedTimeOnly) return false;
            if (s.constraints?.forbiddenTypes?.includes('EARLY')) return false;

            const cell = newShifts[`${s.id}_${keySuffix}`];
            if (cell === null) return true;
            if (!cell.isLocked && cell.type !== 'OFF' && cell.type !== 'NIGHT' && cell.type !== 'HOPE' && cell.type !== 'WINTER' && cell.customText !== '明') return true;
            return false;
          });

          if (availableStaff.length > 0) {
            const selectedStaff = availableStaff[Math.floor(Math.random() * availableStaff.length)];
            const key = `${selectedStaff.id}_${keySuffix}`;
            newShifts[key] = { type: 'EARLY', customText: '早', isLocked: false };
          }
        }
      }

      // 4.5. 遅番バックアップロジック
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const keySuffix = getIsoDate(date);

        // 桂川or加藤が「～20」に入っているか？
        const isLateCovered = ['12', '13'].some(id => {
          const cell = newShifts[`${id}_${keySuffix}`];
          return cell && (cell.customText.includes('20') || cell.type === 'LATE');
        });

        if (!isLateCovered) {
          const backupId = (i % 2 === 0) ? '2' : '4';
          const targetId = backupId;

          const key = `${targetId}_${keySuffix}`;
          const cell = newShifts[key];
          if (!cell || (!cell.isLocked && cell.type !== 'OFF')) {
            newShifts[key] = { type: 'LATE', customText: '11～20', isLocked: false };
          } else {
            const altId = (backupId === '2') ? '4' : '2';
            const altKey = `${altId}_${keySuffix}`;
            const altCell = newShifts[altKey];
            if (!altCell || (!altCell.isLocked && altCell.type !== 'OFF')) {
              newShifts[altKey] = { type: 'LATE', customText: '11～20', isLocked: false };
            }
          }
        }
      }


      // 5. 正社員の休日確保
      staffList.forEach(staff => {
        if (!FULL_TIME_STAFF_IDS.includes(staff.id)) return;

        let currentHolidays = 0;
        dates.forEach(date => {
          const s = newShifts[`${staff.id}_${getIsoDate(date)}`];
          if (s && (s.type === 'OFF' || s.customText === '休')) currentHolidays++;
        });

        let needed = REQUIRED_HOLIDAYS_FULLTIME - currentHolidays;

        if (needed > 0) {
          const candidates = dates.filter(date => newShifts[`${staff.id}_${getIsoDate(date)}`] === null);
          const shuffled = candidates.sort(() => 0.5 - Math.random());
          for (let i = 0; i < needed && i < shuffled.length; i++) {
            const key = `${staff.id}_${getIsoDate(shuffled[i])}`;
            newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
          }
        }
      });

      // 6. 残りの空欄を埋める
      staffList.forEach(staff => {
        let specialShiftCount = 0;

        dates.forEach((date, idx) => {
          const key = `${staff.id}_${getIsoDate(date)}`;

          if (newShifts[key] === null) {
            let consecutiveWorkDays = 0;
            for (let i = 1; i <= MAX_CONSECUTIVE_WORK_DAYS; i++) {
              const prevDate = new Date(date);
              prevDate.setDate(date.getDate() - i);
              const prevKey = `${staff.id}_${getIsoDate(prevDate)}`;
              const prevShift = newShifts[prevKey];
              if (prevShift && prevShift.type !== 'OFF' && prevShift.customText !== '休') {
                consecutiveWorkDays++;
              } else {
                break;
              }
            }

            if (consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS) {
              newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
            } else {
              const cons = staff.constraints || {};
              let text = normalizeShiftText(cons.defaultShift || '9～18');

              if (cons.randomShifts && cons.randomShifts.length > 0) {
                text = cons.randomShifts[Math.floor(Math.random() * cons.randomShifts.length)];
              }
              else if (FULL_TIME_STAFF_IDS.includes(staff.id) && !cons.fixedTimeOnly) {
                if (text === '日B' || text === '9～18') {
                  if (Math.random() > 0.5) text = '日A';
                }
              }
              else if (cons.monthlyShiftCounts) {
                for (const [shiftName, count] of Object.entries(cons.monthlyShiftCounts)) {
                  if (specialShiftCount < count && Math.random() > 0.8) {
                    text = shiftName;
                    specialShiftCount++;
                    break;
                  }
                }
              }

              if (cons.workDaysPerWeek && Math.random() > 0.6) {
                newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
              } else if (cons.workDaysPerMonth && Math.random() > 0.8) {
                newShifts[key] = { type: 'OFF', customText: '休', isLocked: false };
              } else {
                newShifts[key] = { type: 'DAY', customText: text, isLocked: false };
              }
            }
          }
        });
      });

      setShifts(newShifts);
    } catch (e) {
      console.error("Generation Error:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCellClick = (e: React.MouseEvent, staff: any, date: Date) => {
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

  const handleContextMenu = (e: React.MouseEvent, staff: any, date: Date) => {
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
    setPopoverState((prev: any) => ({ ...prev, isOpen: false }));
  };

  const applyQuickShift = (type: string, customText: string) => {
    if (!contextMenu) return;
    const key = `${contextMenu.staffId}_${getIsoDate(contextMenu.date)}`;
    setShifts((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], type, customText, isLocked: false }
    }));
    setContextMenu(null);
  };

  const saveShiftChange = (newVal: any) => {
    if (!popoverState.staffId) return;
    const key = `${popoverState.staffId}_${getIsoDate(popoverState.date)}`;
    setShifts((prev: any) => ({ ...prev, [key]: { ...prev[key], ...newVal } }));
    setPopoverState((prev: any) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverState.isOpen && !(event.target as Element).closest('.shift-popover') && !(event.target as Element).closest('td')) {
        setPopoverState((prev: any) => ({ ...prev, isOpen: false }));
      }
      if (contextMenu && !(event.target as Element).closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverState.isOpen, contextMenu]);

  const getDayStyle = (day: number) => {
    if (day === 0) return { color: '#b91c1c', backgroundColor: '#fef2f2' };
    if (day === 6) return { color: '#1d4ed8', backgroundColor: '#eff6ff' };
    return { color: '#334155' };
  };

  return (
    <div className={`min-h-screen bg-slate-100 font-sans text-sm ${printPreview ? 'print-preview-mode' : ''} flex flex-col h-screen overflow-hidden`}>

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

      {/* AIチェック中ローディング */}
      {isChecking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl text-center border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">AIシフトチェック中</h2>
            <div className="mb-8 flex justify-center relative">
              <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
              <Sparkles className="animate-pulse text-purple-600 relative z-10" size={56} />
            </div>
            <p className="text-slate-600 mb-6 font-medium text-lg">シフトを分析しています...</p>
          </div>
        </div>
      )}

      {/* 右クリックメニュー */}
      {contextMenu && (
        <div
          className="context-menu fixed z-50 bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-32 animate-in fade-in zoom-in-95 duration-75"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="text-xs font-bold text-slate-400 px-3 py-1 border-b border-slate-100 mb-1">
            クイック選択
          </div>
          {[
            { label: '日 (通常)', type: 'DAY', text: '日' },
            { label: '休 (公休)', type: 'OFF', text: '休' },
            { label: '夜 (夜勤)', type: 'NIGHT', text: '夜' },
            { label: '明 (明け)', type: 'EARLY', text: '明' },
            { label: '日A (8-17)', type: 'DAY', text: '日A' },
            { label: '日B (9-18)', type: 'DAY', text: '日B' },
            { label: '有 (有給)', type: 'HOPE', text: '有' },
            { label: '早 (早番)', type: 'EARLY', text: '早' },
          ].map((item) => (
            <button
              key={item.text}
              onClick={() => applyQuickShift(item.type, item.text)}
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
            onClick={() => applyQuickShift('OFF', '')}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-bold"
          >
            クリア
          </button>
        </div>
      )}

      {popoverState.isOpen && popoverState.targetRect && popoverState.date && (
        <div
          className="shift-popover absolute z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-72 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-slate-900/5"
          style={{
            top: popoverState.targetRect.bottom + window.scrollY + 8,
            left: Math.min(popoverState.targetRect.left + window.scrollX - 20, document.body.scrollWidth - 300),
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
                  {popoverState.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-xs text-slate-500">{popoverState.staffName}</span>
              </div>
            </div>
            <button onClick={() => setPopoverState((prev: any) => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors">
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
                    onClick={() => saveShiftChange({ type: p.type, customText: p.text })}
                    className={`text-xs py-2 rounded-lg font-bold transition-all border ${popoverState.currentValue.customText === p.text
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
                    onClick={() => saveShiftChange({ type: 'DAY', customText: t })}
                    className={`text-[10px] py-1.5 rounded-md font-medium transition-all border ${popoverState.currentValue.customText === t
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
                    defaultValue={popoverState.currentValue.customText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveShiftChange({ type: 'DAY', customText: (e.target as HTMLInputElement).value });
                    }}
                  />
                </div>
                <button
                  onClick={() => saveShiftChange({ type: 'OFF', customText: '' })}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  クリア
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={zoomOut} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"><ZoomOut size={14} /></button>
            <span className="px-2 text-xs font-mono w-12 text-center font-bold text-slate-300">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"><ZoomIn size={14} /></button>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-1"></div>

          <button
            onClick={() => setEditLockEnabled(!editLockEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${editLockEnabled
              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              : 'bg-rose-900/30 text-rose-400 border-rose-900/50 hover:bg-rose-900/50 animate-pulse'
              }`}
          >
            {editLockEnabled ? <Lock size={14} /> : <Unlock size={14} />}
            {editLockEnabled ? '保護中' : '編集可'}
          </button>

          <button
            onClick={() => setPrintPreview(!printPreview)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${printPreview
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
          >
            <RefreshCw size={14} className={printPreview ? "" : ""} />
            {printPreview ? '編集に戻る' : 'プレビュー'}
          </button>

          <button
            onClick={startFakeAIGeneration}
            className="flex items-center gap-2 px-5 py-2 bg-white text-indigo-900 rounded-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl text-xs font-extrabold border border-transparent hover:border-indigo-200"
          >
            <Settings size={14} className="animate-spin-slow text-indigo-600" />
            AI自動生成
          </button>

          <button
            onClick={openSaveModal}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/30 text-xs font-bold border border-emerald-500"
          >
            <Save size={14} />
            Save to DB
          </button>

          <button
            onClick={handleAICheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all shadow-lg hover:shadow-purple-500/30 text-xs font-bold border border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            AIチェック
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/30 text-xs font-bold border border-indigo-500"
          >
            <Printer size={14} />
            PDF出力
          </button>

        </div>
      </header>

      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-slate-100 relative"
      >
        <div style={!printPreview ? { zoom: zoom, width: 'fit-content' } : { width: '100%' }} className="bg-white p-10 shadow-2xl shadow-slate-300/50 print:shadow-none print:p-0 mx-auto rounded-xl border border-slate-300 print:border-none mt-8 mb-8">

          {/* AIチェック結果表示 */}
          {checkResult && (
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AIチェック結果
                </h2>
                <button
                  onClick={() => setCheckResult(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* サマリー */}
              <div className={`p-4 rounded-xl border-2 mb-4 ${checkResult.violations.length === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
                }`}>
                <div className="flex items-start gap-3">
                  {checkResult.violations.length === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-2">
                      {checkResult.violations.length === 0 ? '✅ 問題なし' : `⚠️ ${checkResult.violations.length}件の問題が見つかりました`}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{checkResult.summary_ja}</p>
                  </div>
                </div>
              </div>

              {/* 違反リスト */}
              {checkResult.violations.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">検出された問題:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {checkResult.violations.map((violation: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${violation.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          {violation.severity === 'error' ? (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 text-sm">
                            <p className="font-semibold">{violation.employee_name}</p>
                            <p className="text-gray-600">{violation.date}</p>
                            <p className="mt-1">{violation.description_ja}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 改善提案 */}
              {checkResult.suggested_changes && checkResult.suggested_changes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">AIからの改善提案:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {checkResult.suggested_changes.map((change: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-sm space-y-1">
                          <p className="font-semibold">{change.employee_name} - {change.date}</p>
                          <p className="text-gray-600">
                            <span className="line-through">{change.old_shift}</span>
                            {' → '}
                            <span className="text-blue-600 font-semibold">{change.new_shift}</span>
                          </p>
                          <p className="text-gray-700">{change.reason_ja}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend moved to top as requested */}
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
                  {/* 左上の「氏名」セル */}
                  <th className="border border-slate-600 p-1 w-20 min-w-[80px] bg-slate-200 print:bg-slate-200 font-bold text-slate-800 sticky left-0 z-50">氏名</th>

                  {/* 「資格」セル */}
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
                {staffList.map((staff, index) => {
                  const stats = staffStats[staff.id] || { days: 0, hours: 0, nightCount: 0, paidHolidays: 0 };
                  return (
                    <tr key={staff.id} className="hover:bg-yellow-50 print:hover:bg-transparent h-10 transition-colors">
                      {/* 氏名列 */}
                      <td className="border border-slate-600 px-2 text-left whitespace-nowrap font-bold text-slate-800 bg-white sticky left-0 z-30 shadow-md w-20 min-w-[80px]">
                        {isScrolledLeft ? getSurname(staff.name) : staff.name}
                      </td>
                      <td className="border border-slate-600 px-1 text-center text-[9px] whitespace-nowrap text-slate-600 bg-white font-medium">
                        {staff.qualification || '介護職員'}
                      </td>
                      {dates.map(date => {
                        const key = `${staff.id}_${getIsoDate(date)}`;
                        const cellData = shifts[key] || { type: 'OFF', customText: '', isLocked: false };

                        const isLocked = cellData.isLocked;
                        const isLockedAndActive = isLocked && editLockEnabled;
                        const isHoveredRow = hoveredCell.staffId === staff.id;
                        const isHoveredCol = hoveredCell.dateStr === getIsoDate(date);

                        let textColor = 'text-slate-900';

                        const lockPatternClass = isLockedAndActive
                          ? 'bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_5px,#f1f5f9_5px,#f1f5f9_10px)]'
                          : '';

                        // クロスハイライトクラス
                        const highlightClass = (isHoveredRow || isHoveredCol) ? 'bg-slate-50' : '';

                        const styles: any = {};

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
                          styles.backgroundColor = isLockedAndActive ? '#fce7f3' : '#fce7f3'; // Pink 100
                        }
                        else if (cellData.customText === '日B') {
                          styles.color = '#1f2937';
                          styles.backgroundColor = isLockedAndActive ? '#e0f2fe' : '#e0f2fe'; // Sky 100
                        }

                        // ハイライトを適用 (色が設定されていない場合のみ)
                        if (!styles.backgroundColor && (isHoveredRow || isHoveredCol)) {
                          styles.backgroundColor = '#f8fafc'; // Very light slate
                        }

                        const isNightPrint = cellData.customText === '夜';

                        return (
                          <td
                            key={key}
                            onClick={(e) => handleCellClick(e, staff, date)}
                            onContextMenu={(e) => handleContextMenu(e, staff, date)}
                            onMouseEnter={() => setHoveredCell({ staffId: staff.id, dateStr: getIsoDate(date) })}
                            onMouseLeave={() => setHoveredCell({ staffId: null, dateStr: null })}
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
                              <span className={`transform inline-block whitespace-nowrap ${cellData.customText.length > 4 ? 'scale-75' : cellData.customText.length > 2 ? 'scale-90' : 'scale-100'}`}>
                                {cellData.customText}
                              </span>
                            </div>
                          </td>
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
              {/* 不足判定フッター */}
              <tfoot className="print:hidden">
                <tr className="h-12 border-t-4 border-slate-800">
                  <td className="border border-slate-600 bg-slate-800 text-white font-bold px-2 sticky left-0 z-30 shadow-md" colSpan={2}>
                    配置判定
                  </td>
                  {dates.map(date => {
                    const dateIso = getIsoDate(date);
                    const result = sufficiencyData[dateIso];
                    let bgClass = "bg-emerald-50";
                    let textClass = "text-emerald-700";

                    if (result && result.maxShortage >= 2) {
                      bgClass = "bg-yellow-200"; // 濃い黄色
                      textClass = "text-yellow-900 font-bold";
                    } else if (result && result.maxShortage >= 1) {
                      bgClass = "bg-yellow-50"; // 薄い黄色
                      textClass = "text-yellow-800";
                    }

                    return (
                      <td key={date.toString()} className={`border border-slate-600 text-[9px] align-top p-1 ${bgClass}`}>
                        {result && result.details.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {result.details.map((d: string, i: number) => (
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
        </div>
      </main>

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
            overflow: visible !important; /* Print fix */
          }
          /* Print specific fix for sticky headers which might be annoying in print */
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

      {/* 保存モーダル */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">シフトを保存</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">バージョン名</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例: 12月シフト_20251122_001"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveToDB}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
