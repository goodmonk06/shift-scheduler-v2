// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - HTML to PDF 方式
// HTML要素をそのままPDF化することで、日本語やスタイルを完璧に保持
// =============================================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * HTMLテーブル要素をPDF化する関数
 * @param elementId - PDF化するHTML要素のID
 * @param filename - 保存するPDFファイル名
 * @param options - オプション設定
 */
export const generatePDFFromHTML = async (
  elementId: string,
  filename: string = 'shift-schedule.pdf',
  options: {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
  } = {}
) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // デフォルトオプション
    const {
      scale = 2,
      useCORS = true,
      allowTaint = true,
      backgroundColor = '#ffffff'
    } = options;

    // HTML要素をCanvasに変換
    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      allowTaint,
      backgroundColor,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // Canvas画像データを取得
    const imgData = canvas.toDataURL('image/png');

    // Canvas寸法を取得
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4横向き (297mm x 210mm)
    const pageWidth = 297;
    const pageHeight = 210;

    // 画像をページに収めるための縮尺計算
    const ratio = Math.min(
      (pageWidth - 10) / imgWidth,  // 左右5mmマージン
      (pageHeight - 10) / imgHeight  // 上下5mmマージン
    );

    const pdfWidth = imgWidth * ratio;
    const pdfHeight = imgHeight * ratio;

    // PDFドキュメント作成 (A4横向き)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // 画像を中央配置
    const xOffset = (pageWidth - pdfWidth) / 2;
    const yOffset = (pageHeight - pdfHeight) / 2;

    // 画像をPDFに追加
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight);

    // PDFをダウンロード
    pdf.save(filename);

    return { success: true };
  } catch (error) {
    console.error('PDF generation failed:', error);
    return { success: false, error };
  }
};

/**
 * 既存のgenerateShiftPDF関数との互換性のための関数
 * （既存のコードを変更せずに使えるようにするラッパー）
 */
export const generateShiftPDF = async (
  scheduleData: any,
  metaData: any
) => {
  // grid-wrapperまたはshift-tableなどのIDを持つ要素をPDF化
  const result = await generatePDFFromHTML(
    'grid-wrapper',
    `Shift_Schedule_${metaData.startDate.toISOString().split('T')[0]}.pdf`,
    {
      scale: 2,
      backgroundColor: '#ffffff'
    }
  );

  if (!result.success) {
    throw new Error('PDF generation failed');
  }
};
