// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - 正規表現ベースの完全DOMサニタイズ方式
// oklch(...)を正規表現で検出して全て置換することで漏れをゼロに
// =============================================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 色文字列に含まれる oklch(...) を全て HEX/RGB に置換するヘルパー関数
 * 正規表現で oklch(...) パターンを検出し、Canvas APIで変換
 *
 * @param value - 色を含む可能性のある文字列
 * @returns oklchが全てHEX/RGBに置換された文字列
 */
const replaceOklchWithHex = (value: string): string => {
  if (!value || typeof value !== 'string' || !value.includes('oklch')) return value;

  // oklch(...) のパターンを正規表現で全て抽出して置換
  return value.replace(/oklch\([^)]+\)/g, (match) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return match;

      // Canvas APIに oklch色をセットして、ブラウザに解釈させる
      ctx.fillStyle = match;
      const converted = ctx.fillStyle;

      // ブラウザが解釈した色(hex or rgb)を返す
      // ※ デフォルトの #000000 と区別するため、元の色が oklch(0 0 0) かチェック
      if (converted !== '#000000' || match.includes('oklch(0 0 0')) {
        console.log(`[Color Replace] ${match} → ${converted}`);
        return converted;
      }

      // 変換失敗時は元のまま返す（警告を出す）
      console.warn(`[Color Replace] Failed to convert: ${match}`);
      return match;
    } catch (error) {
      console.warn(`[Color Replace] Error converting ${match}:`, error);
      return match;
    }
  });
};

/**
 * 要素を完全にサニタイズ（浄化）する関数
 * オリジナルをクローンし、画面外に配置して、全てのoklch色をHEX/RGBに変換
 *
 * @param element - サニタイズ対象の要素
 * @returns サニタイズされたクローン要素
 */
const sanitizeElement = (element: HTMLElement): HTMLElement => {
  console.log('[DOM Sanitization] Starting regex-based sanitization...');

  // 1. 手動でDOMをクローン
  const clone = element.cloneNode(true) as HTMLElement;

  // 2. 画面外に一時配置（レンダリングさせるため）
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = element.offsetWidth + 'px'; // 幅を維持（レイアウト崩れ防止）
  clone.style.visibility = 'hidden'; // 念のため非表示
  document.body.appendChild(clone);

  // 色を含みうる全てのCSSプロパティリスト（拡張版）
  const colorProperties = [
    // 基本色プロパティ
    'color',
    'backgroundColor',

    // ボーダー系
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',

    // アウトライン・デコレーション
    'outlineColor',
    'textDecorationColor',
    'columnRuleColor',

    // 影系（複雑な値を持つ）
    'boxShadow',
    'textShadow',

    // SVG系
    'fill',
    'stroke',
    'stopColor',
    'floodColor',
    'lightingColor',
  ];

  let totalConversions = 0;
  let propertyCount = 0;

  // 3. ルート要素自体のスタイル修正
  const rootStyle = window.getComputedStyle(element);
  colorProperties.forEach(prop => {
    const value = (rootStyle as any)[prop];
    if (value && value.includes('oklch')) {
      const replaced = replaceOklchWithHex(value);
      if (replaced !== value) {
        (clone.style as any)[prop] = replaced;
        totalConversions++;
        propertyCount++;
        console.log(`[Root] ${prop}: ${value.substring(0, 50)}... → ${replaced.substring(0, 50)}...`);
      }
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

      // 値に oklch が含まれていたら正規表現置換処理を通す
      if (val && val.includes('oklch')) {
        const replaced = replaceOklchWithHex(val);

        if (replaced !== val) {
          (cln.style as any)[prop] = replaced;
          totalConversions++;

          // デバッグ用（最初の5件のみ詳細ログ出力）
          if (totalConversions <= 5) {
            console.log(`[Element ${i}] ${prop}:`);
            console.log(`  Before: ${val.substring(0, 80)}...`);
            console.log(`  After:  ${replaced.substring(0, 80)}...`);
          }
        }
      }
    });
  });

  console.log(`[DOM Sanitization] Complete!`);
  console.log(`  - Processed ${allOriginals.length + 1} elements`);
  console.log(`  - Converted ${totalConversions} oklch color values`);
  console.log(`  - Modified ${propertyCount} root properties`);

  return clone;
};

/**
 * HTMLテーブル要素をPDF化する関数（正規表現ベース完全サニタイズ版）
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

    console.log('[PDF Generation] Starting regex-based complete DOM sanitization...');

    // 完全なDOMサニタイズを実行（正規表現ベース）
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
      sanitizedClone.parentNode.removeChild(sanitizedClone);
      console.log('[PDF Generation] Cleanup: Sanitized clone removed from DOM.');
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
