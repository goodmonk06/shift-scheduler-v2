/**
 * PDF生成ユーティリティ
 * シフト表をA3横、職員×日付マトリクスで出力
 *
 * TODO: フェーズ5で完全実装
 * 現在は基本骨格のみ（実際のPDF生成はフェーズ5で実装）
 */

import type { ShiftStats } from './shiftStatsCalculator';

export interface PDFShiftData {
  year: number;
  month: number;
  shiftName: string;
  employees: Array<{
    id: number;
    name: string;
    shifts: Array<{
      date: string;
      displayText: string;
    }>;
    stats: ShiftStats;
  }>;
}

/**
 * シフトPDFを生成（A3横、職員×日付マトリクス）
 * @param data シフトデータ
 * @returns PDFバッファ
 *
 * TODO: フェーズ5で以下を実装
 * - PDFKitを使用したPDF生成
 * - A3横レイアウト
 * - 職員×日付マトリクステーブル
 * - 右側統計列（日数・時間・夜勤・休日・有給）
 * - ヘッダー（タイトル、年月）
 * - 凡例（夜: 夜勤、明: 明け、休: 休日、有休: 有給休暇）
 */
export async function generateShiftPDF(data: PDFShiftData): Promise<Buffer> {
  // TODO: フェーズ5で実装
  throw new Error('PDF生成機能はフェーズ5で実装予定です');
}

/**
 * PDF生成のプレビューデータを作成（開発用）
 * @param data シフトデータ
 * @returns プレビュー用のHTML文字列
 */
export function generatePreviewHTML(data: PDFShiftData): string {
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.year}年${data.month}月 ${data.shiftName}</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    h1 { text-align: center; }
    table { border-collapse: collapse; width: 100%; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
    th { background-color: #f0f0f0; }
    .employee-name { text-align: left; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${data.year}年${data.month}月 ${data.shiftName}</h1>
  <table>
    <thead>
      <tr>
        <th>職員名</th>
        ${days.map(day => `<th>${day}</th>`).join('')}
        <th>日数</th>
        <th>時間</th>
        <th>夜勤</th>
        <th>休日</th>
        <th>有給</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const employee of data.employees) {
    html += `      <tr>
        <td class="employee-name">${employee.name}</td>
`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const shift = employee.shifts.find(s => s.date === dateStr);
      const text = shift ? shift.displayText : '';
      html += `        <td>${text}</td>\n`;
    }
    html += `        <td>${employee.stats.days}</td>
        <td>${employee.stats.hours.toFixed(1)}</td>
        <td>${employee.stats.nightCount}</td>
        <td>${employee.stats.holidays}</td>
        <td>${employee.stats.paidHolidays}</td>
      </tr>
`;
  }

  html += `    </tbody>
  </table>
  <p style="margin-top: 20px; font-size: 12px;">
    凡例: 夜=夜勤、明=明け、休=休日、有休=有給休暇
  </p>
</body>
</html>
`;

  return html;
}
