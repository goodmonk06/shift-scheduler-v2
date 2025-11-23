// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジックとスタイル定義をまとめたユーティリティ
// =============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// -----------------------------------------------------------------------------
// 1. スタイル定義 (Configuration)
// -----------------------------------------------------------------------------

// 色定義 (Hex)
export const SHIFT_COLORS = {
  default:  { bg: '#f8fafc', text: '#334155' }, // Default Slate
  white:    { bg: '#ffffff', text: '#111827' }, // White
  indigo:   { bg: '#4338ca', text: '#ffffff' }, // Night (Indigo)
  sky:      { bg: '#e0f2fe', text: '#0c4a6e' }, // Early (Sky)
  emerald:  { bg: '#d1fae5', text: '#065f46' }, // Late (Emerald)
  red:      { bg: '#fee2e2', text: '#dc2626' }, // Off (Red)
  orange:   { bg: '#ffedd5', text: '#9a3412' }, // Paid (Orange)
  blue:     { bg: '#dbeafe', text: '#1e40af' }, // Winter (Blue)

  // 曜日ヘッダー用
  sunday:   { bg: '#fef2f2', text: '#b91c1c' },
  saturday: { bg: '#eff6ff', text: '#1d4ed8' },
  weekday:  { bg: '#f8fafc', text: '#475569' },
};

// シフトラベルごとのスタイルマッピング
const SHIFT_STYLE_MAP: Record<string, { bg: string; text: string }> = {
  '日': SHIFT_COLORS.white,
  '日A': SHIFT_COLORS.white,
  '日B': SHIFT_COLORS.white,
  '夜': SHIFT_COLORS.indigo,
  '早': SHIFT_COLORS.sky,
  '遅': SHIFT_COLORS.emerald,
  '休': SHIFT_COLORS.red,
  '有': SHIFT_COLORS.orange,
  '冬': SHIFT_COLORS.blue,
};

/**
 * シフトのラベル（文字列）からスタイルオブジェクトを取得する関数
 */
export const getShiftStyle = (label: string) => {
  if (!label) return SHIFT_COLORS.default;

  // 完全一致
  if (SHIFT_STYLE_MAP[label]) return SHIFT_STYLE_MAP[label];

  // 時間表記判定 (例: "09:00-18:00")
  if (label.includes(':') || label.includes('-') || label.includes('~')) {
    return SHIFT_COLORS.white;
  }

  // 部分一致検索 (例: "夜勤" -> "夜"の色)
  const key = Object.keys(SHIFT_STYLE_MAP).find(k => label.includes(k));
  return key ? SHIFT_STYLE_MAP[key] : SHIFT_COLORS.default;
};

/**
 * 曜日ヘッダーのスタイルを取得
 */
export const getHeaderStyle = (dayOfWeek: number) => {
  if (dayOfWeek === 0) return SHIFT_COLORS.sunday;
  if (dayOfWeek === 6) return SHIFT_COLORS.saturday;
  return SHIFT_COLORS.weekday;
};


// -----------------------------------------------------------------------------
// 2. ヘルパー関数
// -----------------------------------------------------------------------------

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [255, 255, 255];
};

const formatShiftText = (text: string) => {
  if (!text) return '';
  if (text.includes('\n')) return text;
  // 長い時間表記などを改行で整形
  if (text.length > 6 && (text.includes('-') || text.includes('~'))) {
    return text.replace(/[-~]/, '\n~\n');
  }
  return text;
};

const toVertical = (text: string) => {
  if (!text) return '';
  return text.split('').join('\n');
};


// -----------------------------------------------------------------------------
// 3. PDF生成ロジック (Core)
// -----------------------------------------------------------------------------

interface ShiftData {
  date: string;
  label: string;
}

interface ScheduleData {
  name: string;
  qualification: string;
  shifts: ShiftData[] | Record<string, string>;
}

interface MetaData {
  startDate: Date;
  endDate: Date;
  title: string;
  periodString: string;
  events?: Record<string, string>;
}

/**
 * PDFを生成してダウンロードする関数
 * @param {Array} scheduleData - { name, qualification, shifts: [{date, label}, ...] } の配列
 * @param {Object} metaData - { startDate, endDate, title, periodString }
 */
export const generateShiftPDF = (scheduleData: ScheduleData[], metaData: MetaData) => {
  const doc = new jsPDF('l', 'mm', 'a4');

  // 日付範囲の展開
  const dates = [];
  let currentDate = new Date(metaData.startDate);
  const endDate = new Date(metaData.endDate);

  // 行事情報のマッピングがあれば取得
  const eventMap = metaData.events || {};

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];

    dates.push({
      date: currentDate.getDate(),
      month: currentDate.getMonth() + 1,
      fullDate: dateStr,
      dayOfWeek: dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayLabelEn: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
      event: eventMap[dateStr] || ''
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // --- レイアウト計算 ---
  const PAGE_MARGIN = { top: 15, right: 4, bottom: 5, left: 4 };
  const pageWidth = doc.internal.pageSize.width;
  const availableWidth = pageWidth - (PAGE_MARGIN.left + PAGE_MARGIN.right);
  const nameColWidth = 22;
  const qualColWidth = 8;
  const dateColWidth = (availableWidth - (nameColWidth + qualColWidth)) / dates.length;

  // --- ヘッダー描画 ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(metaData.title || 'Shift Schedule', PAGE_MARGIN.left, 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Period: ${metaData.periodString}`, PAGE_MARGIN.left + 60, 8);

  // --- 凡例描画 ---
  drawLegend(doc);

  // --- テーブル列定義 ---
  const columns = [
    { header: 'Name', dataKey: 'name' },
    { header: 'Lic.', dataKey: 'qualification' },
    ...dates.map(day => ({
      header: `${toVertical(day.event) || ''}\n \n${day.date}\n${day.dayLabelEn.charAt(0)}`,
      dataKey: `day_${day.fullDate}`,
      custom: { isWeekend: day.isWeekend, dayOfWeek: day.dayOfWeek }
    }))
  ];

  // --- テーブル行データ変換 ---
  const rows = scheduleData.map(staff => {
    // 名前6文字カット
    const truncatedName = staff.name.length > 6 ? staff.name.substring(0, 6) : staff.name;
    const row: any = {
      name: truncatedName,
      qualification: staff.qualification
    };
    dates.forEach(day => {
      // データの形式ゆらぎを吸収
      let label = '';
      if (Array.isArray(staff.shifts)) {
        const shift = staff.shifts.find(s => s.date === day.fullDate);
        label = shift ? shift.label : '';
      } else if (staff.shifts && staff.shifts[day.fullDate]) {
         label = staff.shifts[day.fullDate];
      }
      row[`day_${day.fullDate}`] = formatShiftText(label);
    });
    return row;
  });

  // --- 列スタイル定義 ---
  const dateColumnStyles: any = {};
  for (let i = 2; i < columns.length; i++) {
    dateColumnStyles[i] = { cellWidth: dateColWidth };
  }

  // --- AutoTable 実行 ---
  autoTable(doc, {
    startY: 12,
    head: [columns.map(col => col.header)],
    body: rows.map(r => columns.map(col => r[col.dataKey])),
    theme: 'grid',
    margin: PAGE_MARGIN,
    styles: {
      fontSize: 5.5,
      cellPadding: 0.5,
      valign: 'middle',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [220, 220, 220] as any,
      textColor: [30, 30, 30] as any,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fontStyle: 'bold',
      lineWidth: 0.1,
      minCellHeight: 15,
      fontSize: 5.5,
      valign: 'bottom'
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: nameColWidth, fillColor: [255, 255, 255] as any, textColor: [0, 0, 0] as any },
      1: { halign: 'center', fontStyle: 'normal', cellWidth: qualColWidth, textColor: [100, 116, 139] as any },
      ...dateColumnStyles
    },
    didParseCell: function (data) {
      applyCellStyles(data, columns);
    }
  });

  doc.save(`Shift_Schedule_${metaData.startDate.toISOString().split('T')[0]}.pdf`);
};

// 内部ヘルパー: 凡例描画
const drawLegend = (doc: jsPDF) => {
  const legendItems = [
    { label: "休: 公休", style: SHIFT_COLORS.red },
    { label: "夜: 夜勤", style: SHIFT_COLORS.indigo },
    { label: "早: 早番", style: SHIFT_COLORS.sky },
    { label: "遅: 遅番", style: SHIFT_COLORS.emerald },
    { label: "有: 有給", style: SHIFT_COLORS.orange },
    { label: "日A: 8-17", style: SHIFT_COLORS.white, border: true },
    { label: "日B: 9-18", style: SHIFT_COLORS.white, border: true }
  ];

  let legendX = 160;
  const legendY = 8;
  const boxSize = 3;

  doc.setFontSize(7);
  legendItems.forEach(item => {
    const rgbBg = hexToRgb(item.style.bg);
    doc.setFillColor(rgbBg[0], rgbBg[1], rgbBg[2]);
    if (item.border || item.style.bg === '#ffffff') {
      doc.setDrawColor(200, 200, 200);
      doc.rect(legendX, legendY - boxSize + 0.5, boxSize, boxSize, 'FD');
    } else {
      doc.rect(legendX, legendY - boxSize + 0.5, boxSize, boxSize, 'F');
    }
    doc.setTextColor(50);
    doc.text(item.label, legendX + boxSize + 1, legendY);
    legendX += 18;
  });
};

// 内部ヘルパー: セルスタイル適用
const applyCellStyles = (data: any, columns: any[]) => {
  const colIndex = data.column.index;
  if (colIndex < 2) return;

  const colDef = columns[colIndex];
  const { dayOfWeek } = colDef.custom || {};

  // HEADER
  if (data.section === 'head') {
    const style = getHeaderStyle(dayOfWeek);
    const bg = hexToRgb(style.bg);
    const text = hexToRgb(style.text);
    data.cell.styles.fillColor = bg;
    data.cell.styles.textColor = text;
    data.cell.styles.lineColor = [200, 200, 200];
    return;
  }

  // BODY
  if (data.section === 'body') {
    const text = data.cell.raw;
    if (text) {
      const style = getShiftStyle(text);
      const bg = hexToRgb(style.bg);
      const txt = hexToRgb(style.text);

      data.cell.styles.fillColor = bg;
      data.cell.styles.textColor = txt;
      data.cell.styles.fontStyle = 'bold';

      if (String(text).length > 8 || String(text).includes('\n')) {
          data.cell.styles.fontSize = 4.5;
      }
    } else {
      // 空欄時の土日背景
      const style = getHeaderStyle(dayOfWeek);
      if (dayOfWeek === 0 || dayOfWeek === 6) {
         data.cell.styles.fillColor = hexToRgb(style.bg);
      }
    }
  }
};
