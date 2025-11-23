// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - dom-to-image-more 使用版
// ブラウザの描画エンジンを直接利用するため、oklch等の最新CSS仕様に完全対応
// 面倒な色サニタイズ処理は一切不要
// =============================================================================

import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

/**
 * HTMLテーブル要素をPDF化する関数
 * dom-to-image-moreを使用し、ブラウザの描画をそのまま画像化
 *
 * @param elementId - PDF化するHTML要素のID
 * @param filename - 保存するPDFファイル名
 * @param options - オプション設定
 */
export const generatePDFFromHTML = async (
  elementId: string,
  filename: string = 'shift-schedule.pdf',
  options: {
    scale?: number;
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
      backgroundColor = '#ffffff'
    } = options;

    console.log('[PDF Generation] Starting dom-to-image conversion...');

    // 一時的にPDF用スタイルを適用
    element.classList.add('pdf-export-mode');

    // スタイルが適用されるまで少し待つ（レイアウト再計算のため）
    await new Promise(resolve => setTimeout(resolve, 100));

    // 展開後の実際のサイズを取得
    const captureWidth = element.scrollWidth;
    const captureHeight = element.scrollHeight;

    console.log(`[PDF Generation] Capture size: ${captureWidth}x${captureHeight}px`);

    // dom-to-image-more で画像化
    // ブラウザの描画エンジンを直接利用するため、oklchも完璧に処理される
    const dataUrl = await domtoimage.toPng(element, {
      width: captureWidth,
      height: captureHeight,
      scale: scale,
      style: {
        transform: 'scale(1)', // バグ回避のおまじない
        transformOrigin: 'top left',
        backgroundColor: backgroundColor
      }
    });

    console.log('[PDF Generation] Image conversion complete. Generating PDF...');

    // jsPDF で PDF 化
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // 画像のプロパティを取得
    const imgProps = doc.getImageProperties(dataUrl);

    // A4横向きのサイズ
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 画像をページに収めるための縮尺計算
    const imgWidth = imgProps.width;
    const imgHeight = imgProps.height;

    const ratio = Math.min(
      (pageWidth - 10) / imgWidth,  // 左右5mmマージン
      (pageHeight - 10) / imgHeight  // 上下5mmマージン
    );

    const pdfWidth = imgWidth * ratio;
    const pdfHeight = imgHeight * ratio;

    // 画像を中央配置
    const xOffset = (pageWidth - pdfWidth) / 2;
    const yOffset = (pageHeight - pdfHeight) / 2;

    // 画像をPDFに追加
    doc.addImage(dataUrl, 'PNG', xOffset, yOffset, pdfWidth, pdfHeight);

    // PDFをダウンロード
    doc.save(filename);

    console.log('[PDF Generation] PDF saved successfully!');

    // スタイルを戻す
    element.classList.remove('pdf-export-mode');

    return { success: true };
  } catch (error) {
    console.error('[PDF Generation] Failed:', error);

    // エラー時もスタイルを戻す
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('pdf-export-mode');
    }

    return { success: false, error };
  }
};

/**
 * 既存のgenerateShiftPDF関数との互換性のための関数
 */
export const generateShiftPDF = async (
  scheduleData: any,
  metaData: any
) => {
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
