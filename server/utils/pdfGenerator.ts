/**
 * PDF生成ユーティリティ
 * シフト表をA3横、職員×日付マトリクスで出力
 *
 * Phase 5で完全実装
 */

import PDFDocument from 'pdfkit';
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
 */
export async function generateShiftPDF(data: PDFShiftData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A3',
        layout: 'landscape',
        margin: 30,
      });

      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // フォント設定（日本語対応）
      // Note: 本番環境では日本語フォントの追加が必要
      doc.fontSize(16);

      // タイトル
      doc.text(`${data.year}年${data.month}月 ${data.shiftName}`, {
        align: 'center',
      });
      doc.moveDown(0.5);

      // マトリクステーブル描画
      const daysInMonth = new Date(data.year, data.month, 0).getDate();
      const startX = 50;
      const startY = 100;
      const nameColumnWidth = 80;
      const cellWidth = 25;
      const cellHeight = 18;
      const statsColumnWidth = 35;

      // ヘッダー行（職員名 + 日付 + 統計）
      doc.fontSize(8);

      // 職員名ヘッダー
      doc.rect(startX, startY, nameColumnWidth, cellHeight).stroke();
      doc.text('職員名', startX + 2, startY + 5, {
        width: nameColumnWidth - 4,
        align: 'center',
      });

      // 日付ヘッダー
      for (let day = 1; day <= daysInMonth; day++) {
        const x = startX + nameColumnWidth + (day - 1) * cellWidth;
        doc.rect(x, startY, cellWidth, cellHeight).stroke();
        doc.text(day.toString(), x + 2, startY + 5, {
          width: cellWidth - 4,
          align: 'center',
        });
      }

      // 統計列ヘッダー
      const statsX = startX + nameColumnWidth + daysInMonth * cellWidth;
      const statsHeaders = ['日数', '時間', '夜勤', '休日', '有給'];
      statsHeaders.forEach((header, i) => {
        const x = statsX + i * statsColumnWidth;
        doc.rect(x, startY, statsColumnWidth, cellHeight).stroke();
        doc.text(header, x + 2, startY + 5, {
          width: statsColumnWidth - 4,
          align: 'center',
        });
      });

      // 職員ごとの行
      data.employees.forEach((employee, rowIndex) => {
        const y = startY + cellHeight + rowIndex * cellHeight;

        // 職員名
        doc.rect(startX, y, nameColumnWidth, cellHeight).stroke();
        doc.text(employee.name, startX + 2, y + 5, {
          width: nameColumnWidth - 4,
          align: 'left',
        });

        // 各日のシフト
        for (let day = 1; day <= daysInMonth; day++) {
          const x = startX + nameColumnWidth + (day - 1) * cellWidth;
          const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const shift = employee.shifts.find(s => s.date === dateStr);
          const displayText = shift?.displayText || '';

          doc.rect(x, y, cellWidth, cellHeight).stroke();
          if (displayText) {
            doc.fontSize(7);
            doc.text(displayText, x + 2, y + 5, {
              width: cellWidth - 4,
              align: 'center',
            });
            doc.fontSize(8);
          }
        }

        // 統計列
        const stats = [
          employee.stats.days.toString(),
          employee.stats.hours.toFixed(1),
          employee.stats.nightCount.toString(),
          employee.stats.holidays.toString(),
          employee.stats.paidHolidays.toString(),
        ];

        stats.forEach((stat, i) => {
          const x = statsX + i * statsColumnWidth;
          doc.rect(x, y, statsColumnWidth, cellHeight).stroke();
          doc.text(stat, x + 2, y + 5, {
            width: statsColumnWidth - 4,
            align: 'center',
          });
        });
      });

      // 凡例
      const legendY = startY + cellHeight + data.employees.length * cellHeight + 20;
      doc.fontSize(10);
      doc.text('凡例:', startX, legendY);
      doc.fontSize(9);
      doc.text(
        '夜=夜勤（21:00～翌9:00、15時間）　明=明け（勤務日数のみカウント）　休=休日　有休=有給休暇　9～15=時間指定勤務',
        startX,
        legendY + 15
      );

      // PDF終了
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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
