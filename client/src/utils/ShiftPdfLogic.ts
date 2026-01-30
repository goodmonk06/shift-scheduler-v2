// =============================================================================
// ShiftPdfLogic.ts
// PDF生成ロジック - dom-to-image-more 使用版
// ブラウザの描画エンジンを直接利用するため、oklch等の最新CSS仕様に完全対応
// 面倒な色サニタイズ処理は一切不要
// =============================================================================

import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

/**
 * 長いテキストの改行ロジック
 * 「数字+半」などが「～」や「-」で繋がっている場合、改行を入れて2段にする
 * 例: "8半-16半" → "8半\n~16半"
 * 例: "9:00-18:00" → "9:00\n~18:00"
 */
const formatShiftTextForPdf = (text: string): string => {
  if (!text) return '';
  // 既に改行がある場合は何もしない
  if (text.includes('\n')) return text;

  // 「数字+半」や「数字:数字」が「～」や「-」で繋がっているパターンを改行に変換
  return text.replace(/([0-9半:]{2,})[-~～]([0-9半:]{2,})/g, '$1\n~$2');
};

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
  // PDF用スタイルタグとDOM変更を追跡する変数
  let pdfStyle: HTMLStyleElement | null = null;
  const modifiedCells: Array<{ element: HTMLElement; originalText: string }> = [];

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

    // 1. PDF用スタイルを動的に注入
    pdfStyle = document.createElement('style');
    pdfStyle.innerHTML = `
      /* 氏名・資格ヘッダーの罫線を太く */
      .pdf-export-mode thead tr th:nth-child(1),
      .pdf-export-mode thead tr th:nth-child(2) {
        border: 2px solid #374151 !important;
      }

      /* 氏名・資格列の左側と右側の罫線を太く */
      .pdf-export-mode tbody td:nth-child(1) {
        border-left: 2px solid #374151 !important;
        border-right: 2px solid #374151 !important;
      }

      .pdf-export-mode tbody td:nth-child(2) {
        border-right: 2px solid #374151 !important;
      }

      /* セル内のdivを完全にフラット化 */
      .pdf-export-mode td > div,
      .pdf-export-mode td > div > *,
      .pdf-export-mode td > div > * > * {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        outline: none !important;
        ring: 0 !important;
      }

      /* セル内のdivをセル全体に広げる */
      .pdf-export-mode .shift-cell-content {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: pre-wrap !important;
        line-height: 1.1 !important;
        padding: 0 !important;
        margin: 0 !important;
        background-color: transparent !important;
      }

      /* 資格列を表示（幅を少し狭く） */
      .pdf-export-mode th:nth-child(2),
      .pdf-export-mode td:nth-child(2) {
        display: table-cell !important;
        width: auto !important;
        max-width: 80px !important;
      }

      /* テーブル全体のprint:text-[8px]を上書き */
      .pdf-export-mode table {
        font-size: 10px !important;
      }

      /* シフト内容セル（3列目以降）のフォントサイズを大きく太く、枠いっぱいに */
      .pdf-export-mode tbody td:nth-child(n+3) {
        font-size: 16px !important;
        font-weight: 700 !important;
        padding: 1px !important;
        line-height: 1 !important;
      }

      /* シフトセル内のdivとspanのscale縮小を無効化、枠いっぱいに表示 */
      .pdf-export-mode tbody td:nth-child(n+3) div,
      .pdf-export-mode tbody td:nth-child(n+3) span {
        transform: none !important;
        font-size: 16px !important;
        line-height: 1 !important;
      }

      /* 名前列の幅確保・左寄せ・中央揃え・フォントサイズ */
      .pdf-export-mode thead th:nth-child(1),
      .pdf-export-mode tbody td:nth-child(1) {
        min-width: 150px !important;
        white-space: nowrap !important;
        text-align: left !important;
        vertical-align: middle !important;
        font-size: 18px !important;
        font-weight: bold !important;
      }

      /* 名前列内のdivも左寄せ */
      .pdf-export-mode tbody td:nth-child(1) > div {
        justify-content: flex-start !important;
        text-align: left !important;
      }

      /* 名前列内のボタンなどを非表示 */
      .pdf-export-mode tbody td:nth-child(1) button,
      .pdf-export-mode tbody td:nth-child(1) div.print\\:hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(pdfStyle);

    // 2. セル内のテキストを改行処理（tbodyのみ対象、tfootは除外）
    const cells = element.querySelectorAll('tbody td > div');
    cells.forEach((div) => {
      const htmlDiv = div as HTMLElement;
      const originalText = htmlDiv.innerText;

      // 元のテキストを保存
      modifiedCells.push({ element: htmlDiv, originalText });

      // PDF用に書き換え
      htmlDiv.innerText = formatShiftTextForPdf(originalText);

      // クラス付与（スタイル適用のため）
      htmlDiv.classList.add('shift-cell-content');
    });

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

    // 4. 後始末: 必ず元に戻す
    // テキストを元に戻す
    modifiedCells.forEach(({ element: htmlDiv, originalText }) => {
      htmlDiv.innerText = originalText;
      htmlDiv.classList.remove('shift-cell-content');
    });

    // スタイルタグを削除
    if (pdfStyle && pdfStyle.parentNode) {
      document.head.removeChild(pdfStyle);
    }

    // クラスを戻す
    element.classList.remove('pdf-export-mode');

    return { success: true };
  } catch (error) {
    console.error('[PDF Generation] Failed:', error);

    // エラー時も必ず元に戻す
    // テキストを元に戻す
    modifiedCells.forEach(({ element: htmlDiv, originalText }) => {
      htmlDiv.innerText = originalText;
      htmlDiv.classList.remove('shift-cell-content');
    });

    // スタイルタグを削除
    if (pdfStyle && pdfStyle.parentNode) {
      document.head.removeChild(pdfStyle);
    }

    // クラスを戻す
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
