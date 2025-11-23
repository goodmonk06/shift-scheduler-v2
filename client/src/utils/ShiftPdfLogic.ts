// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - 完全なDOMサニタイズ方式
// 手動クローン→色変換→PDF生成の流れでoklch色問題を根本解決
// =============================================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * oklch色をHEX/RGBに変換する関数
 * Canvas APIを使ってブラウザに変換させる
 */
const convertToHex = (color: string): string => {
  if (!color || !color.includes('oklch')) return color;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return color;

    ctx.fillStyle = color;
    return ctx.fillStyle; // ブラウザが計算したHEX/RGBが返る
  } catch (error) {
    console.warn('[Color Conversion] Failed to convert:', color, error);
    return color;
  }
};

/**
 * 要素を完全にサニタイズ（浄化）する関数
 * オリジナルをクローンし、画面外に配置して、すべてのoklch色をHEX/RGBに変換
 *
 * @param element - サニタイズ対象の要素
 * @returns サニタイズされたクローン要素
 */
const sanitizeElement = (element: HTMLElement): HTMLElement => {
  console.log('[DOM Sanitization] Starting...');

  // 1. 手動でDOMをクローン
  const clone = element.cloneNode(true) as HTMLElement;

  // 2. 画面外に一時配置（レンダリングさせるため）
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = element.offsetWidth + 'px'; // 幅を維持
  clone.style.visibility = 'hidden'; // 念のため非表示
  document.body.appendChild(clone);

  // 色関連プロパティ一覧
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

  let conversionCount = 0;

  // 3. ルート要素自体のスタイル修正
  const rootStyle = window.getComputedStyle(element);
  colorProperties.forEach(prop => {
    const value = (rootStyle as any)[prop];
    if (value && value.includes('oklch')) {
      const converted = convertToHex(value);
      (clone.style as any)[prop] = converted;
      conversionCount++;
      console.log(`[Root] ${prop}: ${value} → ${converted}`);
    }
  });

  // 4. 子要素すべてのスタイル修正
  const allOriginals = element.querySelectorAll('*');
  const allClones = clone.querySelectorAll('*');

  allOriginals.forEach((orig, i) => {
    const cln = allClones[i] as HTMLElement;
    if (!cln) return;

    const style = window.getComputedStyle(orig);

    colorProperties.forEach(prop => {
      const val = (style as any)[prop];
      if (val && val.includes('oklch')) {
        const converted = convertToHex(val);
        (cln.style as any)[prop] = converted;
        conversionCount++;

        // デバッグ用（最初の10件のみログ出力）
        if (conversionCount <= 10) {
          console.log(`[Element ${i}] ${prop}: ${val} → ${converted}`);
        }
      }
    });
  });

  console.log(`[DOM Sanitization] Complete. Converted ${conversionCount} color properties across ${allOriginals.length + 1} elements.`);

  return clone;
};

/**
 * HTMLテーブル要素をPDF化する関数（完全サニタイズ版）
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
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
  } = {}
) => {
  let sanitizedClone: HTMLElement | null = null;

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

    console.log('[PDF Generation] Starting complete DOM sanitization...');

    // 完全なDOMサニタイズを実行
    sanitizedClone = sanitizeElement(element);

    console.log('[PDF Generation] Sanitization complete. Starting html2canvas...');

    // サニタイズされたクローンをPDF化
    const canvas = await html2canvas(sanitizedClone, {
      scale,
      useCORS,
      allowTaint,
      backgroundColor,
      logging: false,
      windowWidth: sanitizedClone.offsetWidth,
      windowHeight: sanitizedClone.offsetHeight,
    });

    console.log('[PDF Generation] html2canvas complete. Generating PDF...');

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

    console.log('[PDF Generation] PDF saved successfully!');

    return { success: true };
  } catch (error) {
    console.error('[PDF Generation] Failed:', error);
    return { success: false, error };
  } finally {
    // 後始末: クローンを必ず削除
    if (sanitizedClone && sanitizedClone.parentNode) {
      document.body.removeChild(sanitizedClone);
      console.log('[PDF Generation] Cleanup: Sanitized clone removed.');
    }
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
