// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - HTML to PDF 方式
// HTML要素をそのままPDF化することで、日本語やスタイルを完璧に保持
// oklch色形式を自動的にrgb/hexに変換する色洗浄機能付き
// =============================================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 色洗浄（Color Sanitization）関数
 * oklch等の新しい色形式をrgb/hexに変換してDOM要素に直接上書き
 *
 * @param element - 洗浄対象のルート要素
 */
const sanitizeColors = (element: HTMLElement) => {
  // Canvas コンテキストを作成（色変換用）
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // チェックすべきCSSプロパティ一覧
  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
    'outlineColor',
    'textDecorationColor',
    'columnRuleColor',
  ];

  // 全要素を走査
  const allElements = element.querySelectorAll('*');

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);

    colorProperties.forEach((prop) => {
      const value = computedStyle[prop as any];

      // oklch または oklab が含まれている場合に変換
      if (value && (value.includes('oklch') || value.includes('oklab'))) {
        try {
          // Canvas API を使ってブラウザに色変換させる
          ctx.fillStyle = value;
          const convertedColor = ctx.fillStyle; // rgb(...) または #... 形式に変換される

          // 変換された色を style 属性に直接上書き
          (htmlEl.style as any)[prop] = convertedColor;

          console.log(`[Color Sanitization] ${prop}: ${value} → ${convertedColor}`);
        } catch (error) {
          console.warn(`[Color Sanitization] Failed to convert ${prop}: ${value}`, error);
        }
      }
    });
  });

  console.log(`[Color Sanitization] Processed ${allElements.length} elements`);
};

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

    // HTML要素をCanvasに変換（色洗浄機能付き）
    const canvas = await html2canvas(element, {
      scale,
      useCORS,
      allowTaint,
      backgroundColor,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // クローンされたドキュメント内で色を洗浄
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          console.log('[PDF Generation] Starting color sanitization...');
          sanitizeColors(clonedElement as HTMLElement);
          console.log('[PDF Generation] Color sanitization complete');
        }
      },
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
