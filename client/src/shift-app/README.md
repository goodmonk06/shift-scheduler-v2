# シフト管理アプリ - モジュール構成

このディレクトリには、12月シフト生成機能の分割されたコンポーネントが含まれています。

## ディレクトリ構造

```
src/shift-app/
├── components/           # UI コンポーネント
│   ├── Header.tsx        # ヘッダー（タイトル、操作ボタン）
│   ├── Legend.tsx        # 凡例（休:赤、夜:青...の表示）
│   ├── ContextMenu.tsx   # 右クリックメニュー
│   ├── Popover.tsx       # シフト入力用の吹き出し画面
│   ├── ShiftCell.tsx     # 個別のセル（クリック・右クリックのイベント処理）
│   └── ShiftTable.tsx    # シフト表メイン（ヘッダー行、職員行、フッター）
│
├── utils/                # 計算ロジック・ヘルパー関数
│   ├── constants.ts      # 定数（施設名、職員データ、シフトタイプ定義など）
│   ├── dateHelpers.ts    # 日付計算、祝日判定、ISO日付変換など
│   └── shiftLogic.ts     # 自動生成、不足判定、時間計算などのコアロジック
│
├── hooks/                # React カスタムフック
│   └── useShiftData.ts   # シフトデータの保持、更新、AI生成実行などのロジック
│
├── App.tsx               # メインコンポーネント（全体をまとめる）
├── index.ts              # エクスポートファイル
└── README.md             # このファイル
```

## 各ファイルの役割

### utils/constants.ts
- 設定値や固定データを集約
- `START_DATE`, `END_DATE`, `FACILITY_NAME`
- `STAFF_RAW_DATA` (職員マスタ)
- `SHIFT_TYPES`, `SHIFT_PRESETS`, `TIME_PRESETS`

### utils/dateHelpers.ts
- 日付操作系の関数
- `generateDateRange` - 日付範囲の生成
- `getIsoDate` - ISO形式の日付文字列
- `isHoliday` - 休日判定
- `getEventName` - 行事名取得

### utils/shiftLogic.ts
- アプリの頭脳となる計算処理
- `calculateWorkStats` - 勤務時間・日数計算
- `calculateSufficiency` - 不足人数の判定ロジック
- `parseShiftTime` - シフト文字から時間を解析
- `generateShifts` - AI自動生成アルゴリズム

### components/
各UIコンポーネントは独立しており、再利用可能です：
- **Header.tsx**: ズーム、印刷、生成ボタンなど
- **Legend.tsx**: 凡例表示
- **ContextMenu.tsx**: 右クリックメニュー
- **Popover.tsx**: シフト入力用ポップオーバー
- **ShiftCell.tsx**: 個別セルの描画とイベント処理
- **ShiftTable.tsx**: テーブル全体の構造

### hooks/useShiftData.ts
- シフトデータの状態管理
- AI生成のロジックと進捗管理
- 統計計算のメモ化

### App.tsx
- すべてのコンポーネントを統合
- 状態管理とイベントハンドリング

## 使用方法

```tsx
import ShiftApp from './shift-app';

function MyComponent() {
  return <ShiftApp />;
}
```

## メリット

1. **ロジックの修正が楽**: 自動生成のルールを変えたい場合は `shiftLogic.ts` だけを見ればOK
2. **デザイン調整が楽**: セルの色を変えたい場合は `ShiftCell.tsx` だけを見ればOK
3. **再利用性**: 他の月のシフト画面を作る場合、コンポーネントをそのまま使い回せる
4. **テストしやすい**: 各機能が分離されているため、単体テストが書きやすい

## 注意事項

- 元の単一ファイルからの機能は完全に保持されています
- すべてのイベントハンドラーとロジックは同じように動作します
- TypeScript型定義により、型安全性が向上しています
