import PDFDocument from 'pdfkit';
import * as db from './db';

interface GeneratePDFParams {
  shiftId: number;
  year: number;
  month: number;
}

/**
 * シフト表をPDFとして生成
 */
export async function generateShiftPDF(params: GeneratePDFParams): Promise<Buffer> {
  const { shiftId, year, month } = params;

  // データを取得
  const employees = await db.getAllEmployees();
  const workTimeSlots = await db.getAllWorkTimeSlots();
  const shiftDetails = await db.getShiftDetails(shiftId);
  const daysInMonth = new Date(year, month, 0).getDate();

  // パフォーマンス最適化: データを事前にMap構造に変換してO(1)アクセスにする
  // workTimeSlotsのMap: id -> slot
  const workTimeSlotsMap = new Map(workTimeSlots.map(ts => [ts.id, ts]));

  // shiftDetailsのMap: "employeeId-date" -> ShiftDetail[]
  const shiftsByEmployeeDate = new Map<string, any[]>();
  for (const detail of shiftDetails) {
    if (detail.status === 'working') {
      const key = `${detail.employeeId}-${detail.date}`;
      if (!shiftsByEmployeeDate.has(key)) {
        shiftsByEmployeeDate.set(key, []);
      }
      shiftsByEmployeeDate.get(key)!.push(detail);
    }
  }

  // PDFドキュメントを作成
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 30,
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));

  // タイトル
  doc.fontSize(16).text(`${year}年${month}月のシフト表`, { align: 'center' });
  doc.moveDown();

  // テーブルの設定
  const startX = 30;
  const startY = doc.y;
  const rowHeight = 30;
  const colWidth = 25;
  const nameColWidth = 80;

  // ヘッダー行
  doc.fontSize(8);
  doc.rect(startX, startY, nameColWidth, rowHeight).stroke();
  doc.text('職員名', startX + 5, startY + 10, { width: nameColWidth - 10 });

  // 日付列
  for (let day = 1; day <= daysInMonth; day++) {
    const x = startX + nameColWidth + (day - 1) * colWidth;
    doc.rect(x, startY, colWidth, rowHeight).stroke();
    doc.text(day.toString(), x + 5, startY + 10, { width: colWidth - 10, align: 'center' });
  }

  // 合計列
  const totalHoursX = startX + nameColWidth + daysInMonth * colWidth;
  const totalDaysX = totalHoursX + colWidth * 2;
  doc.rect(totalHoursX, startY, colWidth * 2, rowHeight).stroke();
  doc.text('合計時間', totalHoursX + 5, startY + 10, { width: colWidth * 2 - 10, align: 'center' });
  doc.rect(totalDaysX, startY, colWidth * 2, rowHeight).stroke();
  doc.text('出勤日数', totalDaysX + 5, startY + 10, { width: colWidth * 2 - 10, align: 'center' });

  // データ行
  let currentY = startY + rowHeight;
  for (const employee of employees) {
    // 職員名
    doc.rect(startX, currentY, nameColWidth, rowHeight).stroke();
    doc.text(employee.name, startX + 5, currentY + 10, { width: nameColWidth - 10 });

    // 月間合計を計算
    let totalHours = 0;
    const workDays = new Set<string>();

    // 各日のシフト
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 最適化: Mapから直接取得 O(1)
      const dayShifts = shiftsByEmployeeDate.get(`${employee.id}-${dateStr}`) || [];

      const x = startX + nameColWidth + (day - 1) * colWidth;
      doc.rect(x, currentY, colWidth, rowHeight).stroke();

      if (dayShifts.length > 0) {
        const timeSlotLabels = dayShifts.map((sd: any) => {
          // 最適化: Mapから直接取得 O(1)
          const ts = workTimeSlotsMap.get(sd.timeSlotId);
          if (ts) {
            // 勤務時間を計算
            const [startHour, startMin] = ts.startTime.split(':').map(Number);
            const [endHour, endMin] = ts.endTime.split(':').map(Number);
            let hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
            if (hours < 0) hours += 24;
            totalHours += hours;
            workDays.add(dateStr);
          }
          return ts?.displayLabel || '';
        }).join(',');

        doc.fontSize(6).text(timeSlotLabels, x + 2, currentY + 10, {
          width: colWidth - 4,
          align: 'center',
          lineBreak: false,
        });
        doc.fontSize(8);
      }
    }

    // 合計時間
    doc.rect(totalHoursX, currentY, colWidth * 2, rowHeight).stroke();
    doc.text(`${totalHours.toFixed(1)}h`, totalHoursX + 5, currentY + 10, { 
      width: colWidth * 2 - 10, 
      align: 'center' 
    });

    // 出勤日数
    doc.rect(totalDaysX, currentY, colWidth * 2, rowHeight).stroke();
    doc.text(`${workDays.size}日`, totalDaysX + 5, currentY + 10, { 
      width: colWidth * 2 - 10, 
      align: 'center' 
    });

    currentY += rowHeight;
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}
