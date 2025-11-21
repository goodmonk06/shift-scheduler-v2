# 外部シフト生成システム統合ディレクトリ

このディレクトリは外部で作成したシフト生成システムを統合するための場所です。

## 📁 ディレクトリ構成

```
external-system/
├── index.html          # メインシステムのHTMLファイル
├── script.js           # JavaScriptロジック
├── style.css           # スタイルシート
├── assets/             # 画像やその他のアセット
└── README.md           # このファイル
```

## 🔌 統合方法

### 1. システムファイルの配置
外部で作成したシステムのファイルをこのディレクトリに配置します。

### 2. データ保存API
生成したシフトデータを保存するには、以下のAPIを使用します:

```javascript
// シフトデータを保存
async function saveShiftData(shiftData) {
  const response = await fetch('/api/external-shifts/december', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      year: 2025,
      month: 12,
      shifts: shiftData
    })
  });

  const result = await response.json();
  console.log('保存完了:', result);
}
```

### 3. データ取得API
保存済みのデータを取得するには:

```javascript
// 保存されたシフトデータを取得
async function loadShiftData() {
  const response = await fetch('/api/external-shifts/december');
  const data = await response.json();
  return data.shifts;
}
```

## 💾 データ永続化

- データは `/data/december-shifts/december-2025.json` に保存されます
- 自動バックアップが `/data/december-shifts/backups/` に作成されます
- データは永続的に保存され、サーバー再起動後も保持されます

## 🔗 アクセス方法

システムは以下のURLでアクセスできます:
- 開発環境: `http://localhost:3000/external-system/`
- 本番環境: `https://your-domain.com/external-system/`

管理画面のメニューから「12月シフト生成」を選択してもアクセスできます。
