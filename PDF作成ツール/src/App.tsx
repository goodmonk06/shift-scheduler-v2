import { useState } from 'react';
import { ShiftTable } from './components/ShiftTable';
import { ColorSettings } from './components/ColorSettings';
import { Button } from './components/ui/button';
import { Printer, Settings, Download } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet';

/**
 * ========================================
 * バックエンド統合ガイド
 * ========================================
 * 
 * 1. データ形式：
 *    このアプリは以下のJSON形式でデータを受け取ります：
 * 
 *    interface ShiftData {
 *      facilityName: string;        // 施設名（例：「グループホーム○○」）
 *      month: number;                // 月（1-12）
 *      year: number;                 // 年（例：2025）
 *      events?: Record<number, string>; // { 1: "避難訓練", 2: "", 3: "誕生会", ... }
 *      errorDays?: number[];         // 人数不足エラーがある日付（例：[3, 15, 22]）
 *      staff: Array<{
 *        name: string;               // スタッフ名
 *        position: string;           // 勤務区分（例：「介護福祉士」）
 *        shifts: Record<number, string>; // { 1: "9～17", 2: "休", 3: "夜", ... }
 *      }>;
 *    }
 * 
 * 2. 人数不足エラー表示：
 *    - errorDaysに含まれる日付は、行事予定行の背景が黄色（#fff59d）で表示されます
 *    - errorDaysが未設定またはnullの場合は、すべて白背景になります
 *    - 例：errorDays: [3, 15, 22] → 3日、15日、22日の行事予定セルが黄色
 * 
 * 3. 色の自動判定ルール：
 *    - 「夜」「明」を含む → 青色 (#0ea3db)
 *    - 「早」を含む → 緑色 (#739058)
 *    - 「休」「有」を含む → 赤ピンク (#e38c82)
 *    - その他 → デフォルト背景
 * 
 * 4. 統合方法：
 *    <App shiftData={yourData} /> のようにpropsで渡すか、
 *    内部のsampleDataを置き換えてください。
 * 
 * 5. PDF出力：
 *    ブラウザの印刷機能を使用します。
 *    印刷ダイアログで「PDFとして保存」を選択してください。
 */

// サンプルデータ（実際のデータで置き換えてください）
const sampleData = {
  facilityName: "グループホーム○○",
  month: 11,
  year: 2025,
  events: {
    1: "", 2: "", 3: "避難訓練", 4: "", 5: "",
    6: "", 7: "", 8: "", 9: "", 10: "",
    11: "", 12: "", 13: "", 14: "", 15: "誕生会",
    16: "", 17: "", 18: "", 19: "", 20: "",
    21: "", 22: "", 23: "", 24: "", 25: "",
    26: "", 27: "", 28: "", 29: "", 30: ""
  },
  errorDays: [3, 15, 22],
  staff: [
    {
      name: "佐藤 太郎",
      position: "介護福祉士",
      shifts: {
        1: "9～17", 2: "休", 3: "夜", 4: "明", 5: "休",
        6: "早", 7: "9～17", 8: "夜", 9: "明", 10: "休",
        11: "9～17", 12: "9～17", 13: "夜", 14: "明", 15: "休",
        16: "早", 17: "9～17", 18: "夜", 19: "明", 20: "休",
        21: "9～17", 22: "早", 23: "夜", 24: "明", 25: "休",
        26: "9～17", 27: "9～17", 28: "夜", 29: "明", 30: "休"
      }
    },
    {
      name: "田中 花子",
      position: "看護研修",
      shifts: {
        1: "夜", 2: "明", 3: "休", 4: "9～17", 5: "9～17",
        6: "夜", 7: "明", 8: "休", 9: "早", 10: "9～17",
        11: "夜", 12: "明", 13: "休", 14: "9～17", 15: "早",
        16: "夜", 17: "明", 18: "休", 19: "9～17", 20: "9～17",
        21: "夜", 22: "明", 23: "休", 24: "早", 25: "9～17",
        26: "夜", 27: "明", 28: "休", 29: "9～17", 30: "有"
      }
    },
    {
      name: "鈴木 一郎",
      position: "車庫員",
      shifts: {
        1: "早", 2: "9～17", 3: "9～17", 4: "休", 5: "早",
        6: "9～17", 7: "9～17", 8: "休", 9: "早", 10: "9～17",
        11: "早", 12: "9～17", 13: "9～17", 14: "休", 15: "早",
        16: "9～17", 17: "9～17", 18: "休", 19: "早", 20: "9～17",
        21: "早", 22: "9～17", 23: "9～17", 24: "休", 25: "早",
        26: "9～17", 27: "9～17", 28: "休", 29: "早", 30: "9～17"
      }
    },
    {
      name: "高橋 美咲",
      position: "介護福祉士",
      shifts: {
        1: "8半～12半", 2: "9～17", 3: "休", 4: "夜", 5: "明",
        6: "休", 7: "早", 8: "9～17", 9: "夜", 10: "明",
        11: "休", 12: "9～17", 13: "9～17", 14: "夜", 15: "明",
        16: "休", 17: "早", 18: "9～17", 19: "夜", 20: "明",
        21: "休", 22: "9～17", 23: "早", 24: "夜", 25: "明",
        26: "休", 27: "9～17", 28: "9～17", 29: "夜", 30: "明"
      }
    },
    {
      name: "伊藤 健太",
      position: "介護福祉士",
      shifts: {
        1: "9～17", 2: "夜", 3: "明", 4: "休", 5: "9～17",
        6: "9～17", 7: "夜", 8: "明", 9: "休", 10: "早",
        11: "9～17", 12: "夜", 13: "明", 14: "休", 15: "9～17",
        16: "夜", 17: "明", 18: "休", 19: "早", 20: "9～17",
        21: "夜", 22: "明", 23: "休", 24: "9～17", 25: "9～17",
        26: "夜", 27: "明", 28: "休", 29: "早", 30: "9～17"
      }
    }
  ]
};

// デフォルト色設定
export const defaultColorSettings = {
  night: "#0ea3db",      // 夜勤系（青）
  early: "#739058",      // 早番系（緑）
  off: "#e38c82",        // 休暇系（赤ピンク）
  saturday: "#e3f2fd",   // 土曜背景（薄青）
  sunday: "#ffebee",     // 日曜背景（薄赤）
  border: "#c8c8ca",     // 罫線
  default: "#fcfcfc",    // デフォルト背景
  event: "#e7c00d",      // 行事予定列
  headerBg: "#e7e4e6",   // ヘッダー背景
  textGray: "#9ea4a5"    // 補助テキスト
};

export default function App() {
  const [colorSettings, setColorSettings] = useState(defaultColorSettings);
  const [shiftData] = useState(sampleData);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 印刷時非表示のコントロールバー */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">勤務表PDFプレビュー</h1>
          <p className="text-gray-500 text-sm mt-1">
            印刷プレビューを確認してPDF出力してください
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings className="size-4 mr-2" />
                色設定
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>色設定</SheetTitle>
                <SheetDescription>
                  各項目の色をカスタマイズできます
                </SheetDescription>
              </SheetHeader>
              <ColorSettings 
                settings={colorSettings}
                onSettingsChange={setColorSettings}
              />
            </SheetContent>
          </Sheet>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            印刷 / PDF出力
          </Button>
        </div>
      </div>

      {/* プレビューエリア */}
      <div className="no-print p-8">
        <div className="bg-white shadow-lg mx-auto" style={{ width: '297mm' }}>
          <ShiftTable data={shiftData} colorSettings={colorSettings} />
        </div>
      </div>

      {/* 印刷時のみ表示 */}
      <div className="print-only">
        <ShiftTable data={shiftData} colorSettings={colorSettings} />
      </div>
    </div>
  );
}